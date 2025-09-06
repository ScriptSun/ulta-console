import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { EdgeFunctionApiWrapper } from '../_shared/api-wrapper.ts';

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
    const api = new EdgeFunctionApiWrapper();

    // Get the user from the request
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await api.getClient().auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action } = await req.json();

    if (action === 'generate_token') {
      // Check user roles directly to get customer access
      const userRolesResult = await api.select('user_roles', 'customer_id', { user_id: user.id });

      if (!userRolesResult.success || !userRolesResult.data || userRolesResult.data.length === 0) {
        console.error('No customer access for user:', user.id, userRolesResult.error);
        return new Response(
          JSON.stringify({ error: 'No customer access' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Use the first customer ID (users can have multiple, but we'll use the first one)
      const customerId = userRolesResult.data[0].customer_id;

      // Generate a secure random token
      const tokenBytes = new Uint8Array(32);
      crypto.getRandomValues(tokenBytes);
      const token = Array.from(tokenBytes, byte => byte.toString(16).padStart(2, '0')).join('');

      // Store the token in the database
      const tokenResult = await api.insert('agent_deployment_tokens', {
        customer_id: customerId,
        token: token,
        created_by: user.id,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
      });

      if (!tokenResult.success) {
        console.error('Error creating deployment token:', tokenResult.error);
        return new Response(
          JSON.stringify({ error: 'Failed to generate token' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log the action
      await api.insert('audit_logs', {
        customer_id: customerId,
        actor: user.email || user.id,
        action: 'generate_deployment_token',
        target: 'agent_deployment',
        meta: {
          token_expires_at: tokenResult.data.expires_at,
          user_id: user.id
        }
      });

      return new Response(
        JSON.stringify({
          token: tokenResult.data.token,
          expires_at: tokenResult.data.expires_at
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