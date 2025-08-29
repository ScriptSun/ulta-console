import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  agent_id: string;
  commands: string[];
}

interface PolicyMatch {
  id: string;
  policy_name: string;
  mode: string;
  match_type: string;
  match_value: string;
  confirm_message?: string;
  risk: string;
  specificity_score: number;
}

interface CommandResult {
  command: string;
  mode: 'auto' | 'confirm' | 'forbid';
  policy_name: string;
  confirm_message?: string;
}

interface PolicyCheckResponse {
  result: CommandResult[];
  summary: {
    forbid: number;
    confirm: number;
    auto: number;
  };
}

function calculateSpecificityScore(matchType: string, matchValue: string, command: string): number {
  if (matchType === 'exact') {
    // Exact matches get higher specificity based on length
    return matchValue === command ? matchValue.length + 1000 : 0;
  } else if (matchType === 'regex') {
    // Regex matches get lower specificity, but more specific patterns score higher
    // Count special regex characters to estimate specificity
    const specialChars = (matchValue.match(/[\[\](){}.*+?^$|\\]/g) || []).length;
    return matchValue.length - specialChars;
  }
  return 0;
}

function findMatchingPolicies(command: string, policies: any[]): PolicyMatch[] {
  const matches: PolicyMatch[] = [];
  
  for (const policy of policies) {
    let isMatch = false;
    let specificityScore = 0;
    
    if (policy.match_type === 'exact') {
      isMatch = policy.match_value === command;
      specificityScore = calculateSpecificityScore('exact', policy.match_value, command);
    } else if (policy.match_type === 'regex') {
      try {
        const regex = new RegExp(policy.match_value);
        isMatch = regex.test(command);
        specificityScore = calculateSpecificityScore('regex', policy.match_value, command);
      } catch (error) {
        console.warn(`Invalid regex pattern in policy ${policy.policy_name}: ${policy.match_value}`);
        continue;
      }
    }
    
    if (isMatch) {
      matches.push({
        id: policy.id,
        policy_name: policy.policy_name,
        mode: policy.mode,
        match_type: policy.match_type,
        match_value: policy.match_value,
        confirm_message: policy.confirm_message,
        risk: policy.risk,
        specificity_score: specificityScore
      });
    }
  }
  
  return matches;
}

function determineCommandMode(command: string, matches: PolicyMatch[]): CommandResult {
  // Priority: forbid > confirm > auto
  
  // Check for forbid policies first
  const forbidMatches = matches.filter(m => m.mode === 'forbid');
  if (forbidMatches.length > 0) {
    // Pick the most specific forbid policy
    const mostSpecific = forbidMatches.sort((a, b) => b.specificity_score - a.specificity_score)[0];
    return {
      command,
      mode: 'forbid',
      policy_name: mostSpecific.policy_name,
      confirm_message: undefined // forbid doesn't need confirm message
    };
  }
  
  // Check for confirm policies
  const confirmMatches = matches.filter(m => m.mode === 'confirm');
  if (confirmMatches.length > 0) {
    // Pick the most specific confirm policy
    const mostSpecific = confirmMatches.sort((a, b) => b.specificity_score - a.specificity_score)[0];
    return {
      command,
      mode: 'confirm',
      policy_name: mostSpecific.policy_name,
      confirm_message: mostSpecific.confirm_message
    };
  }
  
  // Check for auto policies
  const autoMatches = matches.filter(m => m.mode === 'auto');
  if (autoMatches.length > 0) {
    // Pick the most specific auto policy
    const mostSpecific = autoMatches.sort((a, b) => b.specificity_score - a.specificity_score)[0];
    return {
      command,
      mode: 'auto',
      policy_name: mostSpecific.policy_name,
      confirm_message: undefined
    };
  }
  
  // Default: no matching policies, require confirmation
  return {
    command,
    mode: 'confirm',
    policy_name: 'default_confirmation_required',
    confirm_message: 'Please confirm to run'
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

    const { agent_id, commands }: RequestBody = await req.json();

    if (!agent_id || !commands || !Array.isArray(commands)) {
      return new Response(JSON.stringify({ error: 'Missing agent_id or commands array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Checking policies for agent_id: ${agent_id}, ${commands.length} commands`);

    // 1. Load command policies
    const { data: policies, error: policiesError } = await supabase
      .from('command_policies')
      .select('id, policy_name, mode, match_type, match_value, confirm_message, risk, active')
      .eq('active', true); // Only active policies

    if (policiesError) {
      console.error('Error loading command policies:', policiesError);
      return new Response(JSON.stringify({ error: 'Failed to load command policies' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Loaded ${policies?.length || 0} active command policies`);

    // 2-3. Process each command against policies
    const results: CommandResult[] = [];
    
    for (const command of commands) {
      const matches = findMatchingPolicies(command, policies || []);
      const result = determineCommandMode(command, matches);
      results.push(result);
      
      console.log(`Command "${command}" -> ${result.mode} (${result.policy_name})`);
    }

    // 4. Calculate summary
    const summary = {
      forbid: results.filter(r => r.mode === 'forbid').length,
      confirm: results.filter(r => r.mode === 'confirm').length,
      auto: results.filter(r => r.mode === 'auto').length
    };

    const response: PolicyCheckResponse = {
      result: results,
      summary: summary
    };

    console.log(`Policy check completed. Summary: forbid=${summary.forbid}, confirm=${summary.confirm}, auto=${summary.auto}`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing policy check:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});