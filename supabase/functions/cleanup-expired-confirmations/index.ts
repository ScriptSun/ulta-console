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

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date().toISOString();

    console.log('Starting cleanup of expired confirmations at:', now);

    // Update pending confirmations that have expired
    const { data, error } = await supabase
      .from('command_confirmations')
      .update({ 
        status: 'expired',
        updated_at: now
      })
      .eq('status', 'pending')
      .lt('expires_at', now)
      .select('id, command_text, agent_id, customer_id, expires_at');

    if (error) {
      console.error('Failed to update expired confirmations:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to cleanup expired confirmations' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const expiredCount = data?.length || 0;
    console.log(`Marked ${expiredCount} confirmations as expired`);

    if (expiredCount > 0) {
      console.log('Expired confirmations:', data?.map(c => ({
        id: c.id,
        command: c.command_text?.substring(0, 50) + (c.command_text?.length > 50 ? '...' : ''),
        agent_id: c.agent_id,
        customer_id: c.customer_id,
        expired_at: c.expires_at
      })));
    }

    return new Response(JSON.stringify({ 
      success: true,
      expired_count: expiredCount,
      cleanup_time: now,
      message: `Cleaned up ${expiredCount} expired confirmations`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});