import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HeartbeatData {
  agent_id: string;
  os: string;
  ip: string;
  open_ports: number[];
  running_services: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const agentId = pathParts[pathParts.length - 2]; // agent-heartbeat/:id/heartbeat
    const action = pathParts[pathParts.length - 1]; // heartbeat

    if (!agentId || action !== 'heartbeat') {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format. Use /agents/:id/heartbeat' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'GET') {
      // Get agent heartbeat
      const { data: agent, error } = await supabase
        .from('agents')
        .select('heartbeat, last_heartbeat')
        .eq('id', agentId)
        .single();

      if (error || !agent) {
        return new Response(
          JSON.stringify({ error: 'Agent not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({
          heartbeat: agent.heartbeat,
          last_heartbeat: agent.last_heartbeat
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'POST') {
      // Update agent heartbeat
      const body = await req.json();
      
      // Validate required fields
      const requiredFields = ['agent_id', 'os', 'ip', 'open_ports', 'running_services'];
      const missingFields = requiredFields.filter(field => !(field in body));
      
      if (missingFields.length > 0) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required fields', 
            missing: missingFields,
            validation_failed: true 
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Update the agent heartbeat
      const { data, error } = await supabase
        .from('agents')
        .update({
          heartbeat: body,
          last_heartbeat: new Date().toISOString()
        })
        .eq('id', agentId)
        .select('heartbeat, last_heartbeat')
        .single();

      if (error) {
        console.error('Error updating heartbeat:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to update heartbeat' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          heartbeat: data.heartbeat,
          last_heartbeat: data.last_heartbeat
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
})