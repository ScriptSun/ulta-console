import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Intent classification patterns
const INTENT_PATTERNS = {
  install_wordpress: [
    /install\s+wordpress/i,
    /install\s+wp/i,
    /wp\s+install/i,
    /setup\s+wordpress/i,
    /create\s+wordpress/i,
    /deploy\s+wordpress/i
  ],
  check_cpu: [
    /check\s+cpu/i,
    /cpu\s+usage/i,
    /cpu\s+status/i,
    /processor\s+load/i,
    /system\s+load/i
  ],
  check_disk: [
    /check\s+disk/i,
    /disk\s+usage/i,
    /disk\s+space/i,
    /storage\s+usage/i,
    /free\s+space/i
  ],
  check_memory: [
    /check\s+memory/i,
    /check\s+ram/i,
    /memory\s+usage/i,
    /ram\s+usage/i
  ],
  restart_service: [
    /restart\s+(.*)/i,
    /reboot\s+(.*)/i,
    /stop\s+(.*)/i,
    /start\s+(.*)/i
  ],
  backup_database: [
    /backup\s+database/i,
    /backup\s+db/i,
    /database\s+backup/i,
    /export\s+database/i
  ],
  update_system: [
    /update\s+system/i,
    /system\s+update/i,
    /upgrade\s+system/i,
    /security\s+updates/i
  ]
};

// Batch mappings
const INTENT_BATCH_MAP = {
  install_wordpress: 'WordPress Installer',
  check_cpu: 'System Monitor',
  check_disk: 'System Monitor', 
  check_memory: 'System Monitor',
  restart_service: 'Service Manager',
  backup_database: 'Database Backup',
  update_system: 'System Updater'
};

interface RouterInput {
  tenant_id: string;
  user_id: string;
  agent_id: string;
  conversation_id: string;
  text: string;
}

interface RouterOutput {
  state: 'smalltalk' | 'needs_inputs' | 'input_error' | 'preflight_block' | 'task_queued' | 
         'task_started' | 'task_progress' | 'task_succeeded' | 'task_failed' | 'done';
  message?: string;
  schema?: any;
  defaults?: any;
  errors?: Record<string, string>;
  details?: string[];
  progress?: { percent?: number; step?: string };
  contract?: any;
  run_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const input: RouterInput = await req.json();
    console.log('Chat router input:', input);

    const result = await processRouterRequest(supabase, input);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Chat router error:', error);
    return new Response(JSON.stringify({ 
      state: 'done',
      message: 'An error occurred processing your request.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processRouterRequest(supabase: any, input: RouterInput): Promise<RouterOutput> {
  const { tenant_id, user_id, agent_id, conversation_id, text } = input;

  // Step 1: Classify Intent
  const intent = classifyIntent(text);
  console.log('Classified intent:', intent);

  // Log classification event
  await logChatEvent(supabase, conversation_id, agent_id, 'intent_classified', {
    intent,
    text: text.substring(0, 100)
  });

  // Handle smalltalk
  if (!intent) {
    const smalltalkResponse = generateSmallTalkResponse(text);
    await logChatEvent(supabase, conversation_id, agent_id, 'smalltalk_response', {
      response: smalltalkResponse
    });
    return {
      state: 'smalltalk',
      message: smalltalkResponse
    };
  }

  // Step 2: Policy Gate Check
  const policyCheck = await checkCommandPolicy(supabase, tenant_id, intent, text);
  if (policyCheck.blocked) {
    await logChatEvent(supabase, conversation_id, agent_id, 'policy_blocked', {
      intent,
      reason: policyCheck.reason
    });
    return {
      state: 'done',
      message: policyCheck.message
    };
  }

  // Step 3: Resolve Batch
  const batch = await resolveBatch(supabase, tenant_id, intent, agent_id);
  if (!batch) {
    await logChatEvent(supabase, conversation_id, agent_id, 'batch_not_found', { intent });
    return {
      state: 'done',
      message: `Sorry, I don't know how to ${intent.replace('_', ' ')} on this system.`
    };
  }

  // Step 4: Handle Inputs
  const inputsResult = await handleInputs(supabase, conversation_id, batch, text, intent);
  if (inputsResult.state !== 'inputs_valid') {
    return inputsResult;
  }

  // Step 5: Preflight Checks
  const preflightResult = await runPreflightChecks(supabase, agent_id, batch);
  if (preflightResult.failed) {
    await logChatEvent(supabase, conversation_id, agent_id, 'preflight_failed', {
      details: preflightResult.details
    });
    return {
      state: 'preflight_block',
      details: preflightResult.details
    };
  }

  // Step 6: Concurrency Check
  const concurrencyResult = await checkConcurrency(supabase, batch.id, agent_id, tenant_id);
  if (concurrencyResult.blocked) {
    await logChatEvent(supabase, conversation_id, agent_id, 'concurrency_blocked', {
      reason: concurrencyResult.reason
    });
    return {
      state: 'done',
      message: concurrencyResult.message
    };
  }

  // Step 7: Enqueue Task
  const runResult = await enqueueTask(supabase, batch, agent_id, tenant_id, conversation_id, inputsResult.inputs);
  
  if (runResult.success) {
    return {
      state: 'task_queued',
      message: `Task queued successfully. Starting ${batch.name}...`,
      run_id: runResult.run_id
    };
  } else {
    return {
      state: 'done',
      message: 'Failed to queue task. Please try again.'
    };
  }
}

function classifyIntent(text: string): string | null {
  const lowerText = text.toLowerCase().trim();
  
  // Check against patterns
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(lowerText)) {
        return intent;
      }
    }
  }
  
  // Simple keyword fallback
  if (lowerText.includes('wordpress') || lowerText.includes('wp')) {
    return 'install_wordpress';
  }
  if (lowerText.includes('cpu') || lowerText.includes('processor')) {
    return 'check_cpu';
  }
  if (lowerText.includes('disk') || lowerText.includes('storage')) {
    return 'check_disk';
  }
  if (lowerText.includes('memory') || lowerText.includes('ram')) {
    return 'check_memory';
  }
  if (lowerText.includes('restart') || lowerText.includes('reboot')) {
    return 'restart_service';
  }
  if (lowerText.includes('backup') && (lowerText.includes('database') || lowerText.includes('db'))) {
    return 'backup_database';
  }
  if (lowerText.includes('update') && lowerText.includes('system')) {
    return 'update_system';
  }
  
  return null;
}

function generateSmallTalkResponse(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('hey')) {
    return "Hello! I can help you manage your servers. Try asking me to install WordPress, check system resources, or manage services.";
  }
  if (lowerText.includes('help') || lowerText.includes('what can you do')) {
    return "I can help you with server management tasks like:\n• Installing WordPress\n• Checking CPU, memory, and disk usage\n• Restarting services\n• Backing up databases\n• Updating systems\n\nJust tell me what you'd like to do!";
  }
  if (lowerText.includes('thank')) {
    return "You're welcome! Let me know if you need help with anything else.";
  }
  
  return "I'm here to help with server management tasks. You can ask me to install software, check system status, manage services, or perform maintenance tasks.";
}

async function checkCommandPolicy(supabase: any, tenant_id: string, intent: string, text: string) {
  try {
    // Check for matching command policies
    const { data: policies, error } = await supabase
      .from('command_policies')
      .select(`
        id,
        policy_name,
        mode,
        match_type,
        match_value,
        active,
        os_whitelist,
        risk,
        timeout_sec,
        confirm_message
      `)
      .eq('customer_id', tenant_id)
      .eq('active', true)
      .or(`match_value.ilike.%${intent}%,match_value.ilike.%${text.substring(0, 50)}%`);

    if (error) throw error;

    // Check for forbidden policies
    const forbiddenPolicy = policies?.find(p => p.mode === 'forbid');
    if (forbiddenPolicy) {
      return {
        blocked: true,
        reason: 'policy_forbidden',
        message: `This action is not allowed: ${forbiddenPolicy.policy_name}`
      };
    }

    // For now, allow auto execution - confirmation policies would require additional UI flow
    const confirmPolicy = policies?.find(p => p.mode === 'confirm');
    if (confirmPolicy) {
      // In a full implementation, this would create a confirmation request
      console.log('Confirmation policy found but auto-approving for demo:', confirmPolicy.policy_name);
    }

    return { blocked: false };
  } catch (error) {
    console.error('Policy check error:', error);
    return { blocked: false }; // Default to allow on error
  }
}

async function resolveBatch(supabase: any, tenant_id: string, intent: string, agent_id: string) {
  try {
    const batchName = INTENT_BATCH_MAP[intent];
    if (!batchName) return null;

    // Get agent OS
    const { data: agent } = await supabase
      .from('agents')
      .select('os')
      .eq('id', agent_id)
      .single();

    if (!agent) return null;

    // Find matching batch
    const { data: batch } = await supabase
      .from('script_batches')
      .select(`
        id,
        name,
        description,
        risk,
        os_targets,
        active_version,
        customer_id,
        max_timeout_sec
      `)
      .eq('name', batchName)
      .contains('os_targets', [agent.os])
      .neq('active_version', null)
      .single();

    return batch;
  } catch (error) {
    console.error('Batch resolution error:', error);
    return null;
  }
}

async function handleInputs(supabase: any, conversation_id: string, batch: any, text: string, intent: string) {
  try {
    // Get conversation context to check for cached inputs
    const { data: conversation } = await supabase
      .from('chat_conversations')
      .select('meta')
      .eq('id', conversation_id)
      .single();

    const conversationMeta = conversation?.meta || {};
    const cachedInputs = conversationMeta.pending_inputs || {};

    // Extract inputs from text based on intent
    const extractedInputs = extractInputsFromText(text, intent);
    const allInputs = { ...cachedInputs, ...extractedInputs };

    // Validate against schema
    const schema = batch.inputs_schema || {};
    const defaults = batch.inputs_defaults || {};
    const required = schema.required || [];

    const errors: Record<string, string> = {};
    const validatedInputs: Record<string, any> = {};

    // Check required fields
    for (const field of required) {
      if (!allInputs[field] && !defaults[field]) {
        errors[field] = `${field} is required`;
      } else {
        validatedInputs[field] = allInputs[field] || defaults[field];
      }
    }

    // Add optional fields with defaults
    if (schema.properties) {
      for (const [field, prop] of Object.entries(schema.properties as any)) {
        if (!validatedInputs[field] && defaults[field]) {
          validatedInputs[field] = defaults[field];
        } else if (allInputs[field]) {
          validatedInputs[field] = allInputs[field];
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      // Cache partial inputs
      await supabase
        .from('chat_conversations')
        .update({
          meta: {
            ...conversationMeta,
            last_intent: intent,
            pending_inputs: allInputs
          }
        })
        .eq('id', conversation_id);

      return {
        state: 'needs_inputs' as const,
        schema,
        defaults,
        errors
      };
    }

    // Clear cached inputs on success
    const updatedMeta = { ...conversationMeta };
    delete updatedMeta.pending_inputs;
    
    await supabase
      .from('chat_conversations')
      .update({
        meta: updatedMeta,
        last_intent: intent
      })
      .eq('id', conversation_id);

    return {
      state: 'inputs_valid' as const,
      inputs: validatedInputs
    };
  } catch (error) {
    console.error('Input handling error:', error);
    return {
      state: 'input_error' as const,
      message: 'Error processing inputs'
    };
  }
}

function extractInputsFromText(text: string, intent: string): Record<string, any> {
  const inputs: Record<string, any> = {};
  
  // Domain extraction for WordPress
  if (intent === 'install_wordpress') {
    const domainMatch = text.match(/(?:domain|site|for)\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (domainMatch) {
      inputs.DOMAIN = domainMatch[1];
    }
    
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) {
      inputs.WP_ADMIN_EMAIL = emailMatch[0];
    }
  }
  
  // Service name extraction
  if (intent === 'restart_service') {
    const serviceMatch = text.match(/(?:restart|reboot|stop|start)\s+([a-zA-Z0-9_-]+)/i);
    if (serviceMatch) {
      inputs.SERVICE_NAME = serviceMatch[1];
    }
  }
  
  return inputs;
}

async function runPreflightChecks(supabase: any, agent_id: string, batch: any) {
  try {
    // Get latest agent snapshot
    const { data: agent } = await supabase
      .from('agents')
      .select(`
        id,
        os,
        status,
        heartbeat,
        memory_usage,
        cpu_usage,
        customer_id
      `)
      .eq('id', agent_id)
      .maybeSingle();

    if (!agent) {
      return {
        failed: true,
        details: ['Agent not found or offline']
      };
    }

    const details: string[] = [];

    // Check agent status
    if (agent.status !== 'running') {
      details.push(`Agent is ${agent.status}, expected running`);
    }

    // Check OS compatibility
    if (!batch.os_targets.includes(agent.os)) {
      details.push(`Agent OS ${agent.os} not supported for this batch`);
    }

    // Custom preflight checks from batch
    if (batch.preflight) {
      // Evaluate preflight JSON conditions
      const preflightChecks = batch.preflight;
      
      if (preflightChecks.min_memory && agent.memory_usage > preflightChecks.min_memory) {
        details.push(`Insufficient memory: ${agent.memory_usage}% used, need < ${preflightChecks.min_memory}%`);
      }
      
      if (preflightChecks.min_disk_space && agent.cpu_usage > 90) {
        details.push('High CPU usage detected, recommend waiting');
      }
    }

    return {
      failed: details.length > 0,
      details
    };
  } catch (error) {
    console.error('Preflight check error:', error);
    return {
      failed: true,
      details: ['Preflight check failed']
    };
  }
}

async function checkConcurrency(supabase: any, batch_id: string, agent_id: string, tenant_id: string) {
  try {
    // Use the existing database function
    const { data: result } = await supabase.rpc('check_batch_concurrency', {
      _batch_id: batch_id,
      _agent_id: agent_id
    });

    if (!result || result.length === 0) {
      return { blocked: true, reason: 'concurrency_check_failed', message: 'Unable to verify concurrency limits' };
    }

    const check = result[0];
    if (!check.can_run) {
      return {
        blocked: true,
        reason: check.block_scope,
        message: check.block_reason
      };
    }

    return { blocked: false };
  } catch (error) {
    console.error('Concurrency check error:', error);
    return { blocked: false }; // Allow on error
  }
}

async function enqueueTask(supabase: any, batch: any, agent_id: string, tenant_id: string, conversation_id: string, inputs: Record<string, any>) {
  try {
    // Use the existing database function to start batch run
    const { data: result } = await supabase.rpc('start_batch_run', {
      _batch_id: batch.id,
      _agent_id: agent_id
    });

    if (!result || result.length === 0 || result[0].status !== 'started') {
      return { success: false };
    }

    const run_id = result[0].run_id;

    // Log task queued event
    await logChatEvent(supabase, conversation_id, agent_id, 'task_queued', {
      batch_id: batch.id,
      batch_name: batch.name,
      run_id,
      inputs
    });

    // In a real implementation, this would dispatch to the agent
    // For now, just simulate the task start
    setTimeout(async () => {
      await logChatEvent(supabase, conversation_id, agent_id, 'task_started', {
        run_id,
        batch_name: batch.name
      });
    }, 1000);

    return {
      success: true,
      run_id
    };
  } catch (error) {
    console.error('Task enqueue error:', error);
    return { success: false };
  }
}

async function logChatEvent(supabase: any, conversation_id: string, agent_id: string, type: string, payload: any) {
  try {
    await supabase
      .from('chat_events')
      .insert({
        conversation_id,
        agent_id,
        type,
        payload
      });
  } catch (error) {
    console.error('Error logging chat event:', error);
  }
}