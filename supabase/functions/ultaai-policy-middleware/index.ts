import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PolicyCheckRequest {
  tenant_id: string;
  commands: string[];
  agent_os?: string;
}

interface PolicyCheckResponse {
  allowed: boolean;
  commands_status: Array<{
    command: string;
    status: 'auto' | 'confirm' | 'forbid';
    reason?: string;
    policy_name?: string;
  }>;
  overall_status: 'auto' | 'confirm' | 'forbid';
  blocked_count: number;
  confirm_count: number;
}

serve(async (req) => {
  console.log('🛡️ Policy middleware called with method:', req.method);
  
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { tenant_id, commands, agent_os }: PolicyCheckRequest = await req.json();

    if (!tenant_id || !commands || !Array.isArray(commands)) {
      return new Response(JSON.stringify({ error: 'Missing tenant_id or commands array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🔍 Checking ${commands.length} commands for tenant ${tenant_id}`);

    // Get active command policies for this tenant + system defaults
    const { data: policies, error: policiesError } = await supabase
      .from('command_policies')
      .select('*')
      .or(`customer_id.eq.${tenant_id},customer_id.eq.00000000-0000-0000-0000-000000000001`)
      .eq('active', true)
      .order('mode', { ascending: false }); // forbid first, then confirm, then auto

    if (policiesError) {
      console.error('❌ Error fetching policies:', policiesError);
      return new Response(JSON.stringify({ error: 'Failed to fetch policies' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`✅ Found ${policies?.length || 0} active policies`);

    const commandsStatus: PolicyCheckResponse['commands_status'] = [];
    let blockedCount = 0;
    let confirmCount = 0;

    // Check each command against policies
    for (const command of commands) {
      const normalizedCommand = command.trim().toLowerCase();
      let commandStatus: 'auto' | 'confirm' | 'forbid' = 'auto';
      let matchedPolicy = null;

      // Check against policies (forbid has highest priority)
      for (const policy of policies || []) {
        if (policy.os_whitelist && agent_os && !policy.os_whitelist.includes(agent_os)) {
          continue; // Skip policy if OS doesn't match
        }

        let matches = false;
        
        switch (policy.match_type) {
          case 'exact':
            matches = normalizedCommand === policy.match_value.toLowerCase();
            break;
          case 'regex':
            try {
              const regex = new RegExp(policy.match_value, 'i');
              matches = regex.test(normalizedCommand);
            } catch (e) {
              console.warn(`⚠️ Invalid regex in policy ${policy.id}:`, e);
            }
            break;
          case 'wildcard':
            const wildcardRegex = policy.match_value
              .replace(/\*/g, '.*')
              .replace(/\?/g, '.');
            matches = new RegExp(`^${wildcardRegex}$`, 'i').test(normalizedCommand);
            break;
        }

        if (matches) {
          commandStatus = policy.mode as 'auto' | 'confirm' | 'forbid';
          matchedPolicy = policy;
          break; // Use first matching policy (highest priority)
        }
      }

      // Count statuses
      if (commandStatus === 'forbid') blockedCount++;
      if (commandStatus === 'confirm') confirmCount++;

      commandsStatus.push({
        command,
        status: commandStatus,
        reason: matchedPolicy?.confirm_message || undefined,
        policy_name: matchedPolicy?.policy_name || undefined,
      });

      console.log(`📋 Command "${command}" -> ${commandStatus}`);
    }

    // Determine overall status
    let overallStatus: 'auto' | 'confirm' | 'forbid' = 'auto';
    if (blockedCount > 0) {
      overallStatus = 'forbid';
    } else if (confirmCount > 0) {
      overallStatus = 'confirm';
    }

    const response: PolicyCheckResponse = {
      allowed: overallStatus !== 'forbid',
      commands_status: commandsStatus,
      overall_status: overallStatus,
      blocked_count: blockedCount,
      confirm_count: confirmCount,
    };

    console.log(`🎯 Policy check result: ${overallStatus} (${blockedCount} blocked, ${confirmCount} confirm)`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Error in policy middleware:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});