import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ClassifyRequest {
  tenant_id: string;
  agent_snapshot: {
    os?: string;
    platform?: string;
    [key: string]: any;
  };
  intent_name: string;
  command_line: string;
  params?: Record<string, any>;
}

interface ClassifyResponse {
  decision: 'blocked' | 'needs_confirmation' | 'auto';
  policy_id?: string;
  message?: string;
  normalized_command: string;
  normalized_params?: Record<string, any>;
}

interface CommandPolicy {
  id: string;
  policy_name: string;
  mode: 'auto' | 'confirm' | 'forbid';
  match_type: 'exact' | 'regex' | 'wildcard';
  match_value: string;
  os_whitelist: string[] | null;
  risk: string;
  timeout_sec: number | null;
  param_schema: any;
  confirm_message: string | null;
  active: boolean;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizeCommand(commandLine: string): { normalized: string; baseName: string; firstTokens: string[] } {
  // Remove extra whitespace and normalize
  const normalized = commandLine.trim().replace(/\s+/g, ' ');
  
  // Extract first tokens (split by space, pipes, etc.)
  const tokens = normalized.split(/[\s|;&]+/).filter(token => token.length > 0);
  const baseName = tokens[0] || '';
  
  return {
    normalized,
    baseName,
    firstTokens: tokens.slice(0, 3) // First 3 tokens for matching
  };
}

function normalizeParams(params: Record<string, any> | undefined): Record<string, any> {
  if (!params) return {};
  
  // Basic parameter normalization
  const normalized: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    // Convert to string and trim if it's a string
    if (typeof value === 'string') {
      normalized[key] = value.trim();
    } else {
      normalized[key] = value;
    }
  }
  
  return normalized;
}

function matchesPattern(command: string, pattern: string, matchType: 'exact' | 'regex' | 'wildcard'): boolean {
  try {
    switch (matchType) {
      case 'exact':
        return command === pattern;
      
      case 'regex':
        const regex = new RegExp(pattern, 'i');
        return regex.test(command);
      
      case 'wildcard':
        // Convert wildcard pattern to regex
        const wildcardRegex = new RegExp(
          '^' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*').replace(/\\\?/g, '.') + '$',
          'i'
        );
        return wildcardRegex.test(command);
      
      default:
        return false;
    }
  } catch (error) {
    console.error('Pattern matching error:', error);
    return false;
  }
}

function matchesOS(agentOS: string | undefined, osWhitelist: string[] | null): boolean {
  if (!osWhitelist || osWhitelist.length === 0) {
    return true; // No OS restriction
  }
  
  if (!agentOS) {
    return false; // Agent OS unknown, but policy has OS restrictions
  }
  
  const normalizedAgentOS = agentOS.toLowerCase();
  return osWhitelist.some(os => normalizedAgentOS.includes(os.toLowerCase()));
}

function getDecisionMessage(policy: CommandPolicy): string {
  switch (policy.mode) {
    case 'forbid':
      return `Command blocked by policy "${policy.policy_name}". Risk level: ${policy.risk}.`;
    
    case 'confirm':
      return policy.confirm_message || `Command requires confirmation under policy "${policy.policy_name}".`;
    
    case 'auto':
      return `Command automatically approved by policy "${policy.policy_name}".`;
    
    default:
      return 'Command processed by policy.';
  }
}

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

    // Parse request body
    const body: ClassifyRequest = await req.json();
    
    // Validate required fields
    if (!body.tenant_id || !body.command_line) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: tenant_id, command_line' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Normalize command and parameters
    const { normalized, baseName, firstTokens } = normalizeCommand(body.command_line);
    const normalizedParams = normalizeParams(body.params);

    console.log('Classifying command:', {
      tenant_id: body.tenant_id,
      normalized_command: normalized,
      base_name: baseName,
      first_tokens: firstTokens,
      agent_os: body.agent_snapshot?.os
    });

    // Query active policies for the tenant
    const { data: policies, error: queryError } = await supabase
      .from('command_policies')
      .select('*')
      .eq('customer_id', body.tenant_id)
      .eq('active', true)
      .order('mode', { ascending: true }); // This will order: auto, confirm, forbid

    if (queryError) {
      console.error('Database query error:', queryError);
      return new Response(JSON.stringify({ 
        error: 'Failed to query policies' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const commandPolicies = policies as CommandPolicy[];
    console.log(`Found ${commandPolicies.length} active policies for tenant`);

    // Find matching policies
    const matchingPolicies: CommandPolicy[] = [];
    
    for (const policy of commandPolicies) {
      // Check OS compatibility
      if (!matchesOS(body.agent_snapshot?.os, policy.os_whitelist)) {
        continue;
      }

      // Check command pattern match
      if (matchesPattern(normalized, policy.match_value, policy.match_type)) {
        matchingPolicies.push(policy);
      }
    }

    console.log(`Found ${matchingPolicies.length} matching policies`);

    // Apply priority: forbid > confirm > auto
    const priorityOrder: Record<string, number> = { forbid: 1, confirm: 2, auto: 3 };
    matchingPolicies.sort((a, b) => priorityOrder[a.mode] - priorityOrder[b.mode]);

    // Build response
    let response: ClassifyResponse;

    if (matchingPolicies.length === 0) {
      // No matching policy - default behavior (you may want to configure this)
      response = {
        decision: 'needs_confirmation',
        message: 'No matching policy found. Manual review required.',
        normalized_command: normalized,
        normalized_params: normalizedParams
      };
    } else {
      // Use the highest priority matching policy
      const selectedPolicy = matchingPolicies[0];
      
      response = {
        decision: selectedPolicy.mode === 'forbid' ? 'blocked' : 
                 selectedPolicy.mode === 'confirm' ? 'needs_confirmation' : 'auto',
        policy_id: selectedPolicy.id,
        message: getDecisionMessage(selectedPolicy),
        normalized_command: normalized,
        normalized_params: normalizedParams
      };
    }

    console.log('Classification result:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Classification error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});