import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the user from the request
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action } = await req.json();

    if (action === 'generate_token') {
      // Get user's customer IDs to ensure they have permission
      const { data: customerIds } = await supabaseClient.rpc('get_user_customer_ids', {}, {
        headers: { Authorization: authHeader }
      });

      if (!customerIds || customerIds.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No customer access' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Use the first customer ID (in a real app, you might want to let users choose)
      const customerId = customerIds[0];

      // Generate a secure random token
      const tokenBytes = new Uint8Array(32);
      crypto.getRandomValues(tokenBytes);
      const token = Array.from(tokenBytes, byte => byte.toString(16).padStart(2, '0')).join('');

      // Store the token in the database
      const { data: deploymentToken, error: tokenError } = await supabaseClient
        .from('agent_deployment_tokens')
        .insert({
          customer_id: customerId,
          token: token,
          created_by: user.id,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
        })
        .select('token, expires_at')
        .single();

      if (tokenError) {
        console.error('Error creating deployment token:', tokenError);
        return new Response(
          JSON.stringify({ error: 'Failed to generate token' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log the action
      await supabaseClient
        .from('audit_logs')
        .insert({
          customer_id: customerId,
          actor: user.email || user.id,
          action: 'generate_deployment_token',
          target: 'agent_deployment',
          meta: {
            token_expires_at: deploymentToken.expires_at,
            user_id: user.id
          }
        });

      return new Response(
        JSON.stringify({
          token: deploymentToken.token,
          expires_at: deploymentToken.expires_at
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in agent-deploy function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});