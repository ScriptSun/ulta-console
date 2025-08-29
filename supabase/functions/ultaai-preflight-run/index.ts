import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  agent_id: string;
  decision: {
    preflight?: string[];
    batch_id?: string;
    batch?: {
      preflight?: {
        checks?: any[];
      };
    };
  };
}

interface PreflightResponse {
  preflight_ok: boolean;
  failed: string[];
}

interface PreflightCheck {
  type: string;
  min_free_gb?: number;
  max_percent?: number;
  port?: number | number[];
  ports?: number[];
  min_seconds?: number;
}

function parsePreflightCheck(checkStr: string): PreflightCheck | null {
  // Parse different preflight check formats
  
  // min_disk(5) -> min_disk with min_free_gb: 5
  const minDiskMatch = checkStr.match(/min_disk\((\d+(?:\.\d+)?)\)/);
  if (minDiskMatch) {
    return {
      type: 'min_disk',
      min_free_gb: parseFloat(minDiskMatch[1])
    };
  }
  
  // max_cpu(80) -> max_cpu with max_percent: 80
  const maxCpuMatch = checkStr.match(/max_cpu\((\d+(?:\.\d+)?)\)/);
  if (maxCpuMatch) {
    return {
      type: 'max_cpu',
      max_percent: parseFloat(maxCpuMatch[1])
    };
  }
  
  // max_memory(75) -> max_memory with max_percent: 75
  const maxMemoryMatch = checkStr.match(/max_memory\((\d+(?:\.\d+)?)\)/);
  if (maxMemoryMatch) {
    return {
      type: 'max_memory',
      max_percent: parseFloat(maxMemoryMatch[1])
    };
  }
  
  // require_ports_open(80) or require_ports_open([80,443])
  const portsOpenMatch = checkStr.match(/require_ports_open\((\[[\d,\s]+\]|\d+)\)/);
  if (portsOpenMatch) {
    const portParam = portsOpenMatch[1];
    let ports: number[];
    if (portParam.startsWith('[')) {
      // Array format: [80,443]
      ports = JSON.parse(portParam);
    } else {
      // Single port: 80
      ports = [parseInt(portParam)];
    }
    return {
      type: 'require_ports_open',
      ports: ports
    };
  }
  
  // require_open_ports_free(443)
  const portsFreMatch = checkStr.match(/require_open_ports_free\((\d+)\)/);
  if (portsFreMatch) {
    return {
      type: 'require_open_ports_free',
      port: parseInt(portsFreMatch[1])
    };
  }
  
  // min_uptime(3600) -> min_uptime with min_seconds: 3600
  const minUptimeMatch = checkStr.match(/min_uptime\((\d+)\)/);
  if (minUptimeMatch) {
    return {
      type: 'min_uptime',
      min_seconds: parseInt(minUptimeMatch[1])
    };
  }
  
  return null;
}

function evaluatePreflightCheck(check: PreflightCheck, heartbeat: any): { passed: boolean; reason?: string } {
  switch (check.type) {
    case 'min_disk':
      const totalDiskGB = heartbeat.disk_total_gb || 100; // Default if not available
      const usedDiskGB = heartbeat.disk_usage_gb || (heartbeat.disk_usage * totalDiskGB / 100) || 0;
      const freeDiskGB = totalDiskGB - usedDiskGB;
      
      if (freeDiskGB >= (check.min_free_gb || 0)) {
        return { passed: true };
      } else {
        return { 
          passed: false, 
          reason: `Insufficient disk space: ${freeDiskGB.toFixed(1)}GB free, need ${check.min_free_gb}GB` 
        };
      }
    
    case 'max_cpu':
      const cpuUsage = heartbeat.cpu_usage || 0;
      if (cpuUsage <= (check.max_percent || 100)) {
        return { passed: true };
      } else {
        return { 
          passed: false, 
          reason: `CPU usage too high: ${cpuUsage}%, limit ${check.max_percent}%` 
        };
      }
    
    case 'max_memory':
      const memoryUsage = heartbeat.memory_usage || 0;
      if (memoryUsage <= (check.max_percent || 100)) {
        return { passed: true };
      } else {
        return { 
          passed: false, 
          reason: `Memory usage too high: ${memoryUsage}%, limit ${check.max_percent}%` 
        };
      }
    
    case 'require_ports_open':
      const openPorts = heartbeat.open_ports || [];
      const requiredPorts = check.ports || [];
      const missingPorts = requiredPorts.filter(port => !openPorts.includes(port));
      
      if (missingPorts.length === 0) {
        return { passed: true };
      } else {
        return { 
          passed: false, 
          reason: `Required ports not open: ${missingPorts.join(', ')}` 
        };
      }
    
    case 'require_open_ports_free':
      const openPortsList = heartbeat.open_ports || [];
      const targetPort = check.port;
      
      if (!openPortsList.includes(targetPort)) {
        return { passed: true };
      } else {
        return { 
          passed: false, 
          reason: `Port ${targetPort} is already in use` 
        };
      }
    
    case 'min_uptime':
      const uptime = heartbeat.uptime_seconds || 0;
      const requiredUptime = check.min_seconds || 0;
      
      if (uptime >= requiredUptime) {
        return { passed: true };
      } else {
        return { 
          passed: false, 
          reason: `Insufficient uptime: ${uptime}s, need ${requiredUptime}s` 
        };
      }
    
    default:
      return { 
        passed: false, 
        reason: `Unknown preflight check type: ${check.type}` 
      };
  }
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

    const { agent_id, decision }: RequestBody = await req.json();

    if (!agent_id || !decision) {
      return new Response(JSON.stringify({ error: 'Missing agent_id or decision' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Running preflight checks for agent_id: ${agent_id}`);

    // Load agent heartbeat
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('heartbeat')
      .eq('id', agent_id)
      .single();

    if (agentError) {
      console.error('Error loading agent:', agentError);
      return new Response(JSON.stringify({ error: 'Agent not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const heartbeat = agent.heartbeat || {};

    // Extract preflight checks from decision
    let preflightChecks: string[] = [];
    
    if (decision.preflight && Array.isArray(decision.preflight)) {
      // Direct preflight array in decision
      preflightChecks = decision.preflight;
    } else if (decision.batch && decision.batch.preflight && decision.batch.preflight.checks) {
      // Preflight checks from proposed batch
      preflightChecks = decision.batch.preflight.checks.map((check: any) => {
        if (typeof check === 'string') return check;
        // Convert object format to string format if needed
        if (check.type === 'min_disk') return `min_disk(${check.min_free_gb || 5})`;
        if (check.type === 'max_cpu') return `max_cpu(${check.max_percent || 80})`;
        if (check.type === 'max_memory') return `max_memory(${check.max_percent || 75})`;
        if (check.type === 'require_ports_open') return `require_ports_open(${check.ports ? JSON.stringify(check.ports) : check.port})`;
        if (check.type === 'require_open_ports_free') return `require_open_ports_free(${check.port})`;
        if (check.type === 'min_uptime') return `min_uptime(${check.min_seconds || 3600})`;
        return JSON.stringify(check);
      });
    } else if (decision.batch_id) {
      // Load preflight from the batch candidate
      const { data: batch, error: batchError } = await supabase
        .from('script_batches')
        .select('preflight')
        .eq('id', decision.batch_id)
        .single();
      
      if (!batchError && batch && batch.preflight && batch.preflight.checks) {
        preflightChecks = batch.preflight.checks.map((check: any) => {
          if (typeof check === 'string') return check;
          // Convert object checks to string format
          if (check.type === 'min_disk') return `min_disk(${check.min_free_gb || 5})`;
          if (check.type === 'max_cpu') return `max_cpu(${check.max_percent || 80})`;
          if (check.type === 'max_memory') return `max_memory(${check.max_percent || 75})`;
          if (check.type === 'require_ports_open') return `require_ports_open(${check.ports ? JSON.stringify(check.ports) : check.port})`;
          if (check.type === 'require_open_ports_free') return `require_open_ports_free(${check.port})`;
          if (check.type === 'min_uptime') return `min_uptime(${check.min_seconds || 3600})`;
          return JSON.stringify(check);
        });
      }
    }

    console.log(`Found ${preflightChecks.length} preflight checks to evaluate`);

    // Evaluate all preflight checks
    const failed: string[] = [];
    
    for (const checkStr of preflightChecks) {
      const check = parsePreflightCheck(checkStr);
      if (!check) {
        failed.push(`Invalid preflight check format: ${checkStr}`);
        continue;
      }
      
      const result = evaluatePreflightCheck(check, heartbeat);
      if (!result.passed) {
        failed.push(result.reason || `Preflight check failed: ${checkStr}`);
      }
    }

    const response: PreflightResponse = {
      preflight_ok: failed.length === 0,
      failed: failed
    };

    console.log(`Preflight evaluation completed. Success: ${response.preflight_ok}, Failed checks: ${failed.length}`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing preflight checks:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});