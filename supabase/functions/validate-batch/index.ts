import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ValidateBatchRequest {
  batch_name: string;
  inputs: Record<string, any>;
  agent_snapshot: {
    os: string;
    agent_version: string;
    ram_mb: number;
    disk_free_gb: number;
    open_ports: number[];
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { batch_name, inputs, agent_snapshot }: ValidateBatchRequest = await req.json();

    console.log('Validating batch:', { batch_name, inputs, agent_snapshot });

    // 1. Check if batch exists and is active
    const { data: batch, error: batchError } = await supabaseClient
      .from('allowlist_batches')
      .select('*')
      .eq('batch_name', batch_name)
      .eq('active', true)
      .single();

    if (batchError || !batch) {
      return new Response(
        JSON.stringify({
          status: 'error',
          reason: 'Batch not found or inactive'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // 2. Validate inputs against schema
    if (batch.inputs_schema) {
      try {
        const schema = batch.inputs_schema;
        
        // Check required fields
        if (schema.required) {
          for (const requiredField of schema.required) {
            if (!(requiredField in inputs)) {
              return new Response(
                JSON.stringify({
                  status: 'error',
                  reason: `Missing required input: ${requiredField}`
                }),
                { 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  status: 200
                }
              );
            }
          }
        }

        // Validate input types
        if (schema.properties) {
          for (const [inputName, inputValue] of Object.entries(inputs)) {
            const propSchema = schema.properties[inputName];
            if (propSchema) {
              const expectedType = propSchema.type;
              const actualType = typeof inputValue;
              
              if (expectedType === 'number' && actualType !== 'number') {
                return new Response(
                  JSON.stringify({
                    status: 'error',
                    reason: `Input ${inputName} must be a number, got ${actualType}`
                  }),
                  { 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200
                  }
                );
              }
              
              if (expectedType === 'string' && actualType !== 'string') {
                return new Response(
                  JSON.stringify({
                    status: 'error',
                    reason: `Input ${inputName} must be a string, got ${actualType}`
                  }),
                  { 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200
                  }
                );
              }
            }
          }
        }
      } catch (error) {
        console.error('Input schema validation error:', error);
        return new Response(
          JSON.stringify({
            status: 'error',
            reason: 'Input validation failed'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
    }

    // 3. Check preflight requirements
    if (batch.preflight) {
      const preflight = batch.preflight;
      
      if (preflight.min_ram_mb && agent_snapshot.ram_mb < preflight.min_ram_mb) {
        return new Response(
          JSON.stringify({
            status: 'error',
            reason: `Insufficient RAM: ${agent_snapshot.ram_mb}MB < ${preflight.min_ram_mb}MB required`
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
      
      if (preflight.min_disk_free_gb && agent_snapshot.disk_free_gb < preflight.min_disk_free_gb) {
        return new Response(
          JSON.stringify({
            status: 'error',
            reason: `Insufficient disk space: ${agent_snapshot.disk_free_gb}GB < ${preflight.min_disk_free_gb}GB required`
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
      
      if (preflight.require_open_ports) {
        for (const requiredPort of preflight.require_open_ports) {
          if (!agent_snapshot.open_ports.includes(requiredPort)) {
            return new Response(
              JSON.stringify({
                status: 'error',
                reason: `Required port ${requiredPort} is not open`
              }),
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
              }
            );
          }
        }
      }
    }

    // 4. Get and validate batch steps
    const { data: steps, error: stepsError } = await supabaseClient
      .from('allowlist_batch_steps')
      .select(`
        *,
        allowlist_commands!inner(
          command_name,
          active,
          os_whitelist,
          min_agent_version,
          allowlist_command_params(json_schema)
        )
      `)
      .eq('batch_id', batch.id)
      .order('step_index');

    if (stepsError || !steps || steps.length === 0) {
      return new Response(
        JSON.stringify({
          status: 'error',
          reason: 'No valid steps found for batch'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // 5. Validate each step
    for (const step of steps) {
      const command = step.allowlist_commands;
      
      // Check if command is active
      if (!command.active) {
        return new Response(
          JSON.stringify({
            status: 'error',
            reason: `Step ${step.step_index + 1}: Command ${command.command_name} is inactive`
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
      
      // Check OS compatibility
      if (command.os_whitelist && command.os_whitelist.length > 0) {
        if (!command.os_whitelist.includes(agent_snapshot.os.toLowerCase())) {
          return new Response(
            JSON.stringify({
              status: 'error',
              reason: `Step ${step.step_index + 1}: OS ${agent_snapshot.os} not compatible with ${command.command_name}`
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            }
          );
        }
      }
      
      // Check agent version
      if (command.min_agent_version && agent_snapshot.agent_version < command.min_agent_version) {
        return new Response(
          JSON.stringify({
            status: 'error',
            reason: `Step ${step.step_index + 1}: Agent version ${agent_snapshot.agent_version} < ${command.min_agent_version} required`
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
      
      // Expand parameter template and validate
      try {
        let expandedParams = JSON.stringify(step.params_template);
        
        // Replace placeholders with input values
        Object.entries(inputs).forEach(([key, value]) => {
          const placeholder = `{{inputs.${key}}}`;
          expandedParams = expandedParams.replace(
            new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 
            JSON.stringify(value).slice(1, -1) // Remove quotes for proper JSON replacement
          );
        });
        
        const parsedParams = JSON.parse(expandedParams);
        
        // Check for unreplaced placeholders
        if (expandedParams.includes('{{inputs.')) {
          return new Response(
            JSON.stringify({
              status: 'error',
              reason: `Step ${step.step_index + 1}: Unresolved template variables in parameters`
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            }
          );
        }
        
        // Validate expanded parameters against command schema
        if (command.allowlist_command_params?.[0]?.json_schema) {
          const schema = command.allowlist_command_params[0].json_schema;
          
          if (schema.required) {
            for (const requiredField of schema.required) {
              if (!(requiredField in parsedParams)) {
                return new Response(
                  JSON.stringify({
                    status: 'error',
                    reason: `Step ${step.step_index + 1}: Missing required parameter ${requiredField}`
                  }),
                  { 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200
                  }
                );
              }
            }
          }
        }
        
      } catch (error) {
        console.error('Parameter expansion error:', error);
        return new Response(
          JSON.stringify({
            status: 'error',
            reason: `Step ${step.step_index + 1}: Parameter template expansion failed`
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
    }

    // 6. Log validation attempt
    await supabaseClient
      .from('audit_logs')
      .insert({
        customer_id: '00000000-0000-0000-0000-000000000000', // TODO: Get from auth context
        actor: 'system',
        action: 'batch_validation',
        target: batch_name,
        meta: {
          inputs,
          agent_snapshot,
          steps_count: steps.length,
          result: 'success'
        }
      });

    return new Response(
      JSON.stringify({
        status: 'ok',
        message: `Batch validation successful (${steps.length} steps validated)`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Batch validation error:', error);
    
    return new Response(
      JSON.stringify({
        status: 'error',
        reason: 'Internal server error during batch validation'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});