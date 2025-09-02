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
    reason?: string;
    params?: {
      shell?: string;
      description?: string;
    };
    batch?: {
      key: string;
      name: string;
      risk: 'low' | 'medium' | 'high';
      description: string;
      inputs_schema: Record<string, unknown>;
      inputs_defaults: Record<string, unknown>;
      preflight: Record<string, unknown>;
      commands: string[];
    };
    batch_id?: string;
    risk?: string;
    // Support for AI draft actions
    suggested?: {
      kind: 'command' | 'batch_script';
      description?: string;
      command?: string;
      name?: string;
      overview?: string;
      commands?: string[];
      post_checks?: string[];
    };
    summary?: string;
    script?: {
      name: string;
      overview: string;
      commands: string[];
      post_checks: string[];
    };
  };
  confirm?: boolean;
}

interface ExecutionResult {
  status: 'success' | 'rejected' | 'awaiting_confirm' | 'error' | 'started';
  message?: string;
  reason?: string;
  script_id?: string;
  batch_id?: string;
  run_id?: string;
  exit_code?: number;
  stdout_tail?: string;
  stderr_tail?: string;
}

async function callPolicyCheck(commands: string[]): Promise<any> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const response = await supabase.functions.invoke('ultaai-policy-check', {
    body: { 
      agent_id: 'system', // Using system for policy checks
      commands 
    }
  });

  if (response.error) {
    throw new Error(`Policy check failed: ${response.error.message}`);
  }

  return response.data;
}

async function callInputsFill(inputs_schema: Record<string, unknown>, inputs_defaults: Record<string, unknown>, params: Record<string, unknown>): Promise<any> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const response = await supabase.functions.invoke('ultaai-inputs-fill', {
    body: { 
      inputs_schema,
      inputs_defaults,
      params
    }
  });

  if (response.error) {
    throw new Error(`Inputs fill failed: ${response.error.message}`);
  }

  return response.data;
}

async function simulateCommandExecution(commands: string[]): Promise<{ exit_code: number; stdout_tail: string; stderr_tail: string }> {
  // Simulate command execution - in real implementation this would call the agent
  console.log('Simulating execution of commands:', commands);
  
  // Simulate success for most commands
  const isSuccess = Math.random() > 0.1; // 90% success rate
  
  if (isSuccess) {
    return {
      exit_code: 0,
      stdout_tail: `Commands executed successfully:\n${commands.slice(-3).join('\n')}`,
      stderr_tail: ""
    };
  } else {
    return {
      exit_code: 1,
      stdout_tail: "",
      stderr_tail: `Error executing command: ${commands[commands.length - 1]}\nPermission denied`
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { agent_id, decision, confirm }: RequestBody = await req.json();

    if (!agent_id || !decision) {
      return new Response(JSON.stringify({ error: 'Missing agent_id or decision' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing execution for agent_id: ${agent_id}, task: ${decision.task}, confirm: ${confirm}`);

    // Get agent tenant_id for batch_runs
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .select('customer_id')
      .eq('id', agent_id)
      .single();

    if (agentError || !agentData) {
      return new Response(JSON.stringify({
        status: 'error',
        reason: 'Agent not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tenant_id = agentData.customer_id;

    // 1. Handle not_supported decisions
    if (decision.task === 'not_supported') {
      return new Response(JSON.stringify({ 
        status: 'rejected', 
        reason: decision.reason || 'Task not supported' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Handle AI draft actions (convert them to execution)
    if (decision.suggested || decision.script) {
      const commands: string[] = [];
      let source = 'ai_draft_action';
      
      if (decision.suggested?.kind === 'command' && decision.suggested.command) {
        commands.push(decision.suggested.command);
      } else if (decision.suggested?.kind === 'batch_script' && decision.suggested.commands) {
        commands.push(...decision.suggested.commands);
      } else if (decision.script?.commands) {
        commands.push(...decision.script.commands);
      }

      if (commands.length === 0) {
        return new Response(JSON.stringify({
          status: 'error',
          reason: 'No commands found in draft action'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check policy for all draft commands
      const policyResult = await callPolicyCheck(commands);
      const forbiddenCommands = policyResult.result.filter((r: any) => r.mode === 'forbid');

      if (forbiddenCommands.length > 0) {
        return new Response(JSON.stringify({
          status: 'rejected',
          reason: 'Draft contains forbidden commands'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create batch_runs entry for tracking
      const { data: runData, error: runError } = await supabase
        .from('batch_runs')
        .insert({
          batch_id: null, // No specific batch for draft actions
          agent_id: agent_id,
          tenant_id: tenant_id,
          status: 'running',
          started_at: new Date().toISOString(),
          raw_stdout: '',
          raw_stderr: '',
          contract: null,
          parser_warning: false
        })
        .select('id')
        .single();

      if (runError) {
        console.error('Error creating batch run:', runError);
        return new Response(JSON.stringify({
          status: 'error',
          reason: 'Failed to create execution record'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Add source metadata to the run
      await supabase.from('batch_runs')
        .update({
          contract: { source: source, summary: decision.summary }
        })
        .eq('id', runData.id);

      // Simulate execution (in real implementation, this would be handled by ws-exec)
      const execution = await simulateCommandExecution(commands);
      
      // Update the run with results
      await supabase.from('batch_runs')
        .update({
          status: execution.exit_code === 0 ? 'completed' : 'failed',
          finished_at: new Date().toISOString(),
          raw_stdout: execution.stdout_tail,
          raw_stderr: execution.stderr_tail,
          duration_sec: Math.floor(Math.random() * 30) + 5 // Simulate 5-35 second duration
        })
        .eq('id', runData.id);

      return new Response(JSON.stringify({
        status: 'started',
        run_id: runData.id,
        message: 'Draft action execution started',
        ...execution
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Handle custom_shell decisions
    if (decision.task === 'custom_shell') {
      const cmd = decision.params?.shell;
      if (!cmd) {
        return new Response(JSON.stringify({ 
          status: 'error', 
          reason: 'Missing shell command' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check policy for the command
      const policyResult = await callPolicyCheck([cmd]);
      const commandResult = policyResult.result[0];

      if (commandResult.mode === 'forbid') {
        return new Response(JSON.stringify({
          status: 'rejected',
          reason: 'forbidden'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (commandResult.mode === 'confirm' && !confirm) {
        return new Response(JSON.stringify({
          status: 'awaiting_confirm',
          message: commandResult.confirm_message || 'Please confirm to run this command'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Execute if auto or confirmed
      const execution = await simulateCommandExecution([cmd]);
      return new Response(JSON.stringify({
        status: 'success',
        ...execution
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Handle proposed_batch decisions
    if (decision.task === 'proposed_batch') {
      if (!decision.batch) {
        return new Response(JSON.stringify({ 
          status: 'error', 
          reason: 'Missing batch definition' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate proposed commands with policy check
      const policyResult = await callPolicyCheck(decision.batch.commands);
      const forbiddenCommands = policyResult.result.filter((r: any) => r.mode === 'forbid');

      if (forbiddenCommands.length > 0) {
        return new Response(JSON.stringify({
          status: 'rejected',
          reason: 'forbidden commands present'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!confirm) {
        return new Response(JSON.stringify({
          status: 'awaiting_confirm',
          message: 'New batch proposed, review and confirm'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Insert new batch
      const { data: newBatch, error: insertError } = await supabase
        .from('script_batches')
        .insert({
          key: decision.batch.key,
          name: decision.batch.name,
          description: decision.batch.description,
          risk: decision.batch.risk,
          inputs_schema: decision.batch.inputs_schema,
          inputs_defaults: decision.batch.inputs_defaults,
          preflight: decision.batch.preflight,
          os_targets: ['ubuntu', 'debian'], // Default OS targets
          max_timeout_sec: 300,
          per_agent_concurrency: 1,
          per_tenant_concurrency: 10,
          customer_id: '00000000-0000-0000-0000-000000000001' // Default system customer
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error inserting batch:', insertError);
        return new Response(JSON.stringify({
          status: 'error',
          reason: 'Failed to create batch'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        status: 'success',
        batch_id: newBatch.id,
        message: 'New batch created successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Handle confirmed batch (existing batch by key)
    // Look up batch by key
    const { data: batch, error: batchError } = await supabase
      .from('script_batches')
      .select('id, key, name, risk, inputs_schema, inputs_defaults, preflight')
      .eq('key', decision.task)
      .single();

    if (batchError || !batch) {
      return new Response(JSON.stringify({
        status: 'error',
        reason: `Batch not found: ${decision.task}`
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle risk-based confirmation
    if (batch.risk === 'high' && !confirm) {
      return new Response(JSON.stringify({
        status: 'awaiting_confirm',
        message: 'High risk action requires confirmation'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (batch.risk === 'medium' && !confirm) {
      // For medium risk, check if all commands would be auto-approved
      // For now, require confirmation for medium risk
      return new Response(JSON.stringify({
        status: 'awaiting_confirm',
        message: 'Medium risk action requires confirmation'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fill inputs
    const filledInputs = await callInputsFill(
      batch.inputs_schema || {},
      batch.inputs_defaults || {},
      decision.params || {}
    );

    // In a real implementation, you would expand the batch to concrete commands here
    // For now, simulate with some example commands
    const commands = [
      `echo "Executing batch: ${batch.name}"`,
      `echo "Using inputs: ${JSON.stringify(filledInputs.inputs)}"`,
      `echo "Batch completed successfully"`
    ];

    // Final policy check on concrete commands
    const finalPolicyResult = await callPolicyCheck(commands);
    const finalForbidden = finalPolicyResult.result.filter((r: any) => r.mode === 'forbid');

    if (finalForbidden.length > 0) {
      return new Response(JSON.stringify({
        status: 'rejected',
        reason: 'Generated commands contain forbidden operations'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Execute the batch
    const execution = await simulateCommandExecution(commands);

    return new Response(JSON.stringify({
      status: 'success',
      script_id: batch.id,
      ...execution
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing execution:', error);
    return new Response(JSON.stringify({ 
      status: 'error',
      reason: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});