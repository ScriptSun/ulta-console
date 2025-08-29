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
  };
  confirm?: boolean;
}

interface ExecutionResult {
  status: 'success' | 'rejected' | 'awaiting_confirm' | 'error';
  message?: string;
  reason?: string;
  script_id?: string;
  batch_id?: string;
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

    // 2. Handle custom_shell decisions
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

    // 3. Handle proposed_batch decisions
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

    // 4. Handle confirmed batch (existing batch by key)
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