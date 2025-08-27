import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface NormalizedCommand {
  binary: string;
  argv: string[];
  timeout_sec: number;
  agent_id: string;
  customer_id: string;
  os?: string;
}

interface SignedTask {
  task_id: string;
  agent_id: string;
  command: string;
  args: string[];
  timeout_sec: number;
  signature: string;
  created_at: string;
}

interface SignerResponse {
  status: 'task_signed' | 'task_rejected' | 'validation_failed';
  task?: SignedTask;
  reason?: string;
  error?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Allowed binaries per OS
const ALLOWED_BINARIES: Record<string, string[]> = {
  ubuntu: [
    'uptime', 'df', 'free', 'ps', 'top', 'htop', 'ls', 'cat', 'less', 'more', 'head', 'tail',
    'date', 'hostname', 'hostnamectl', 'timedatectl', 'ss', 'ip', 'ifconfig', 'lscpu',
    'systemctl', 'apt-get', 'docker', 'whoami', 'id', 'groups', 'uname', 'which', 'whereis'
  ],
  debian: [
    'uptime', 'df', 'free', 'ps', 'top', 'htop', 'ls', 'cat', 'less', 'more', 'head', 'tail',
    'date', 'hostname', 'hostnamectl', 'timedatectl', 'ss', 'ip', 'ifconfig', 'lscpu',
    'systemctl', 'apt-get', 'docker', 'whoami', 'id', 'groups', 'uname', 'which', 'whereis'
  ],
  centos: [
    'uptime', 'df', 'free', 'ps', 'top', 'htop', 'ls', 'cat', 'less', 'more', 'head', 'tail',
    'date', 'hostname', 'hostnamectl', 'timedatectl', 'ss', 'ip', 'ifconfig', 'lscpu',
    'systemctl', 'yum', 'dnf', 'docker', 'whoami', 'id', 'groups', 'uname', 'which', 'whereis'
  ],
  rhel: [
    'uptime', 'df', 'free', 'ps', 'top', 'htop', 'ls', 'cat', 'less', 'more', 'head', 'tail',
    'date', 'hostname', 'hostnamectl', 'timedatectl', 'ss', 'ip', 'ifconfig', 'lscpu',
    'systemctl', 'yum', 'dnf', 'docker', 'whoami', 'id', 'groups', 'uname', 'which', 'whereis'
  ],
  alpine: [
    'uptime', 'df', 'free', 'ps', 'top', 'ls', 'cat', 'less', 'more', 'head', 'tail',
    'date', 'hostname', 'ss', 'ip', 'ifconfig', 'docker', 'whoami', 'id', 'groups', 'uname', 'which'
  ],
  windows: [
    'dir', 'type', 'find', 'findstr', 'tasklist', 'systeminfo', 'hostname', 'ipconfig',
    'netstat', 'whoami', 'ver', 'where', 'powershell'
  ],
  macos: [
    'uptime', 'df', 'free', 'ps', 'top', 'ls', 'cat', 'less', 'more', 'head', 'tail',
    'date', 'hostname', 'netstat', 'ifconfig', 'docker', 'whoami', 'id', 'groups', 'uname', 'which'
  ]
};

// Safe punctuation characters allowed in argv
const SAFE_PUNCTUATION = new Set([
  '-', '_', '.', '/', ':', '=', '@', '+', ',', ' ', '\\', '"', "'", '[', ']'
]);

function validateBinary(binary: string, os: string = 'ubuntu'): boolean {
  const allowedForOs = ALLOWED_BINARIES[os.toLowerCase()] || ALLOWED_BINARIES['ubuntu'];
  return allowedForOs.includes(binary);
}

function validateArgv(argv: string[]): { valid: boolean; invalidArg?: string } {
  for (const arg of argv) {
    // Check each character in the argument
    for (const char of arg) {
      const isAlphanumeric = /[a-zA-Z0-9]/.test(char);
      const isSafePunctuation = SAFE_PUNCTUATION.has(char);
      
      if (!isAlphanumeric && !isSafePunctuation) {
        return { valid: false, invalidArg: arg };
      }
    }
  }
  return { valid: true };
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkAgentAllowlist(supabase: any, agentId: string, customerid: string): Promise<boolean> {
  try {
    // Check if agent has 'run_inline_safe' command in its allowlist
    // This is a simplified check - in production, you'd query the actual agent allowlist
    const { data: commands, error } = await supabase
      .from('allowlist_commands')
      .select('command_name, active')
      .eq('customer_id', customerid)
      .eq('command_name', 'run_inline_safe')
      .eq('active', true);

    if (error) {
      console.error('Error checking agent allowlist:', error);
      return false;
    }

    return commands && commands.length > 0;
  } catch (error) {
    console.error('Error in checkAgentAllowlist:', error);
    return false;
  }
}

function buildSafeRunnerTask(command: NormalizedCommand): {
  task_command: string;
  task_args: string[];
  payload_for_signing: string;
} {
  const task_command = 'run_inline_safe';
  const task_args = [
    '--timeout',
    command.timeout_sec.toString(),
    '--',
    command.binary,
    ...command.argv
  ];
  
  // Create payload for HMAC signing
  const payload_for_signing = JSON.stringify({
    command: task_command,
    args: task_args,
    agent_id: command.agent_id,
    timestamp: Date.now()
  });

  return { task_command, task_args, payload_for_signing };
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
    const signingSecret = Deno.env.get('COMMAND_SIGNING_SECRET')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!signingSecret) {
      return new Response(JSON.stringify({ 
        status: 'validation_failed',
        error: 'Signing secret not configured' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const command: NormalizedCommand = await req.json();
    
    // Validate required fields
    if (!command.binary || !Array.isArray(command.argv) || !command.timeout_sec || !command.agent_id || !command.customer_id) {
      return new Response(JSON.stringify({ 
        status: 'validation_failed',
        error: 'Missing required fields: binary, argv, timeout_sec, agent_id, customer_id' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Processing command signing request:', {
      agent_id: command.agent_id,
      binary: command.binary,
      argv_length: command.argv.length,
      timeout: command.timeout_sec,
      os: command.os
    });

    // Validate binary is allowed for OS
    if (!validateBinary(command.binary, command.os)) {
      const response: SignerResponse = {
        status: 'validation_failed',
        reason: `Binary '${command.binary}' not allowed for OS '${command.os || 'ubuntu'}'`
      };
      
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate argv items are safe
    const argValidation = validateArgv(command.argv);
    if (!argValidation.valid) {
      const response: SignerResponse = {
        status: 'validation_failed',
        reason: `Unsafe argument detected: '${argValidation.invalidArg}'. Only alphanumeric and safe punctuation allowed.`
      };
      
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if agent has run_inline_safe in allowlist
    const hasAllowlistEntry = await checkAgentAllowlist(supabase, command.agent_id, command.customer_id);
    if (!hasAllowlistEntry) {
      const response: SignerResponse = {
        status: 'task_rejected',
        reason: 'Agent lacks run_inline_safe in allowlist'
      };
      
      return new Response(JSON.stringify(response), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build safe runner task
    const { task_command, task_args, payload_for_signing } = buildSafeRunnerTask(command);
    
    // HMAC sign the payload
    const signature = await hmacSign(payload_for_signing, signingSecret);
    
    // Create signed task
    const signedTask: SignedTask = {
      task_id: crypto.randomUUID(),
      agent_id: command.agent_id,
      command: task_command,
      args: task_args,
      timeout_sec: command.timeout_sec,
      signature: signature,
      created_at: new Date().toISOString()
    };

    const response: SignerResponse = {
      status: 'task_signed',
      task: signedTask
    };

    console.log('Command signed successfully:', {
      task_id: signedTask.task_id,
      agent_id: command.agent_id,
      command: task_command,
      args_count: task_args.length
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Signer hook error:', error);
    return new Response(JSON.stringify({ 
      status: 'validation_failed',
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});