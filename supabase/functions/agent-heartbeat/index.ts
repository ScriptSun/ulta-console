import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { EdgeFunctionApiWrapper } from '../_shared/api-wrapper.ts'

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
    const api = new EdgeFunctionApiWrapper();

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
      const agentResult = await api.selectOne('agents', 'heartbeat, last_heartbeat', { id: agentId });

      if (!agentResult.success || !agentResult.data) {
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
          heartbeat: agentResult.data.heartbeat,
          last_heartbeat: agentResult.data.last_heartbeat
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
      const updateResult = await api.update('agents', { id: agentId }, {
        heartbeat: body,
        last_heartbeat: new Date().toISOString()
      });

      if (!updateResult.success) {
        console.error('Error updating heartbeat:', updateResult.error);
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
          heartbeat: updateResult.data[0]?.heartbeat,
          last_heartbeat: updateResult.data[0]?.last_heartbeat
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