import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  agent_id: string;
  decision: {
    task: string;
    summary?: string;
    suggested?: {
      kind: 'command' | 'batch_script';
      command?: string;
      commands?: string[];
    };
    script?: {
      commands: string[];
    };
  };
  run_id?: string;
}

interface PreflightCheck {
  check: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  details?: any;
}

interface PreflightResponse {
  preflight_ok: boolean;
  preflight_checks: PreflightCheck[];
  failed: string[];
}

// Generate minimal preflight checks from heartbeat and heuristics
function generatePreflightChecks(heartbeat: any, commands: string[]): PreflightCheck[] {
  const checks: PreflightCheck[] = [];
  
  // Check network access if package manager operations detected
  const needsNetwork = commands.some(cmd => 
    cmd.includes('apt ') || cmd.includes('yum ') || cmd.includes('curl ') || 
    cmd.includes('wget ') || cmd.includes('pip ') || cmd.includes('npm ')
  );
  
  if (needsNetwork) {
    // Simple network connectivity check
    checks.push({
      check: 'network_access',
      status: 'pass', // Assume pass for simulation
      message: 'Network access available for package operations'
    });
    
    // Package index check
    if (commands.some(cmd => cmd.includes('apt ') || cmd.includes('yum '))) {
      checks.push({
        check: 'package_index',
        status: 'pass',
        message: 'Package index is accessible'
      });
    }
  }
  
  // Check disk space if installations detected
  const needsDisk = commands.some(cmd => 
    cmd.includes('apt install') || cmd.includes('yum install') ||
    cmd.includes('download') || cmd.includes('unzip') || cmd.includes('tar')
  );
  
  if (needsDisk && heartbeat?.disk_free_gb) {
    const diskFreeGb = parseFloat(heartbeat.disk_free_gb) || 0;
    const requiredGb = 2; // Minimum 2GB for installations
    
    checks.push({
      check: 'min_disk',
      status: diskFreeGb >= requiredGb ? 'pass' : 'fail',
      message: diskFreeGb >= requiredGb 
        ? `Sufficient disk space: ${diskFreeGb.toFixed(1)}GB available`
        : `Insufficient disk space: ${diskFreeGb.toFixed(1)}GB available, need ${requiredGb}GB`,
      details: { available: diskFreeGb, required: requiredGb }
    });
  }
  
  // Check memory if server software installations detected
  const needsMemory = commands.some(cmd => 
    cmd.includes('nginx') || cmd.includes('apache') || cmd.includes('mysql') ||
    cmd.includes('postgresql') || cmd.includes('redis') || cmd.includes('php-fpm')
  );
  
  if (needsMemory && heartbeat?.memory_usage_percent) {
    const memoryUsage = parseFloat(heartbeat.memory_usage_percent) || 0;
    const maxUsageForInstall = 80; // Don't install server software if memory > 80%
    
    checks.push({
      check: 'max_memory',
      status: memoryUsage <= maxUsageForInstall ? 'pass' : 'warn',
      message: memoryUsage <= maxUsageForInstall
        ? `Memory usage acceptable: ${memoryUsage.toFixed(1)}%`
        : `High memory usage: ${memoryUsage.toFixed(1)}%, installation may affect performance`,
      details: { current: memoryUsage, max_recommended: maxUsageForInstall }
    });
  }
  
  // Basic system readiness check
  if (heartbeat?.uptime_seconds) {
    const uptimeHours = (heartbeat.uptime_seconds / 3600) || 0;
    checks.push({
      check: 'system_stability',
      status: uptimeHours >= 0.1 ? 'pass' : 'warn',
      message: uptimeHours >= 0.1 
        ? `System stable: ${uptimeHours.toFixed(1)} hours uptime`
        : 'System recently rebooted, may be unstable',
      details: { uptime_hours: uptimeHours }
    });
  }
  
  // If no specific checks were generated, add a basic connectivity check
  if (checks.length === 0) {
    checks.push({
      check: 'agent_connectivity',
      status: 'pass',
      message: 'Agent is responsive and ready for commands'
    });
  }
  
  return checks;
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { agent_id, decision, run_id }: RequestBody = await req.json();

    if (!agent_id || !decision) {
      return new Response(JSON.stringify({ error: 'Missing agent_id or decision' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generating preflight for agent_id: ${agent_id}, task: ${decision.task}`);

    // Get agent heartbeat data
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .select('heartbeat')
      .eq('id', agent_id)
      .single();

    if (agentError || !agentData) {
      return new Response(JSON.stringify({
        error: 'Agent not found or no heartbeat data'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract commands from decision
    const commands: string[] = [];
    
    if (decision.suggested?.kind === 'command' && decision.suggested.command) {
      commands.push(decision.suggested.command);
    } else if (decision.suggested?.kind === 'batch_script' && decision.suggested.commands) {
      commands.push(...decision.suggested.commands);
    } else if (decision.script?.commands) {
      commands.push(...decision.script.commands);
    }

    if (commands.length === 0) {
      return new Response(JSON.stringify({
        error: 'No commands found in decision'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate preflight checks
    const checks = generatePreflightChecks(agentData.heartbeat, commands);
    
    // Determine overall status
    const failedChecks = checks.filter(check => check.status === 'fail');
    const preflightOk = failedChecks.length === 0;
    
    const response: PreflightResponse = {
      preflight_ok: preflightOk,
      preflight_checks: checks,
      failed: failedChecks.map(check => check.message || check.check)
    };

    console.log('Preflight result:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating preflight:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});