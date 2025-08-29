import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  agent_id: string;
  user_request: string;
}

interface RouterPayloadResponse {
  user_request: string;
  heartbeat: any;
  candidates: any[];
  command_policies: any[];
  policy_notes: {
    wp_min_ram_mb: number;
    wp_min_disk_gb: number;
    n8n_min_ram_mb: number;
    n8n_min_disk_gb: number;
    ssl_requires_443: boolean;
    web_requires_80: boolean;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Router-payload environment check:', {
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasSupabaseKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    });

    const { agent_id, user_request }: RequestBody = await req.json();

    if (!agent_id || !user_request) {
      console.error('Router-payload missing parameters:', { agent_id: !!agent_id, user_request: !!user_request });
      return new Response(JSON.stringify({ error: 'Missing agent_id or user_request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing router payload for agent_id: ${agent_id}, user_request: ${user_request}`);

    // 1. Load agent by id, select heartbeat and last_heartbeat
    console.log('Loading agent...');
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('heartbeat, last_heartbeat')
      .eq('id', agent_id)
      .single();

    console.log('Agent query result:', { hasAgent: !!agent, agentError: agentError?.message });

    if (agentError) {
      console.error('Error loading agent:', agentError);
      return new Response(JSON.stringify({ error: 'Agent not found', details: agentError.message }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Query script_batches for candidates
    const requiredKeys = [
      'wordpress_installer',
      'setup_ssl_letsencrypt', 
      'install_n8n_automation',
      'install_nodejs_pm2',
      'install_docker_compose'
    ];

    // Build the query to match user_request against key, name, description using ILIKE
    // Also include all required keys
    const { data: candidates, error: candidatesError } = await supabase
      .from('script_batches')
      .select('id, key, name, description, inputs_schema, inputs_defaults, preflight, os_targets, risk, max_timeout_sec')
      .or(`key.ilike.%${user_request}%,name.ilike.%${user_request}%,description.ilike.%${user_request}%,key.in.(${requiredKeys.join(',')})`);

    if (candidatesError) {
      console.error('Error loading candidates:', candidatesError);
      return new Response(JSON.stringify({ error: 'Failed to load batch candidates' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Load all command_policies rows
    const { data: commandPolicies, error: policiesError } = await supabase
      .from('command_policies')
      .select('id, policy_name, mode, match_type, match_value, os_whitelist, risk, timeout_sec, confirm_message');

    if (policiesError) {
      console.error('Error loading command policies:', policiesError);
      return new Response(JSON.stringify({ error: 'Failed to load command policies' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Build response payload
    const response: RouterPayloadResponse = {
      user_request,
      heartbeat: agent.heartbeat,
      candidates: candidates || [],
      command_policies: commandPolicies || [],
      policy_notes: {
        wp_min_ram_mb: 2048,
        wp_min_disk_gb: 5,
        n8n_min_ram_mb: 2048,
        n8n_min_disk_gb: 2,
        ssl_requires_443: true,
        web_requires_80: true
      }
    };

    console.log(`Router payload generated successfully. Found ${candidates?.length || 0} candidates and ${commandPolicies?.length || 0} policies`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing router payload request:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});