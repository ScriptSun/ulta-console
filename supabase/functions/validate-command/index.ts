import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ValidateCommandRequest {
  command_name: string;
  params: Record<string, any>;
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

    const { command_name, params, agent_snapshot }: ValidateCommandRequest = await req.json();

    console.log('Validating command:', { command_name, agent_snapshot });

    // 1. Check if command exists and is active
    const { data: command, error: commandError } = await supabaseClient
      .from('allowlist_commands')
      .select(`
        *,
        scripts!inner(name, id),
        script_versions!inner(sha256, status)
      `)
      .eq('command_name', command_name)
      .eq('active', true)
      .single();

    if (commandError || !command) {
      return new Response(
        JSON.stringify({
          status: 'error',
          reason: 'Command not found or inactive'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // 2. Check OS whitelist
    if (command.os_whitelist && command.os_whitelist.length > 0) {
      if (!command.os_whitelist.includes(agent_snapshot.os.toLowerCase())) {
        return new Response(
          JSON.stringify({
            status: 'error',
            reason: `OS ${agent_snapshot.os} not in whitelist: ${command.os_whitelist.join(', ')}`
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
    }

    // 3. Check minimum agent version
    if (command.min_agent_version) {
      const minVersion = command.min_agent_version;
      const agentVersion = agent_snapshot.agent_version;
      
      // Simple version comparison (assumes semantic versioning)
      if (agentVersion < minVersion) {
        return new Response(
          JSON.stringify({
            status: 'error',
            reason: `Agent version ${agentVersion} is below minimum required ${minVersion}`
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
    }

    // 4. Get command parameters schema and validate
    const { data: commandParams } = await supabaseClient
      .from('allowlist_command_params')
      .select('json_schema, defaults')
      .eq('command_id', command.id)
      .single();

    if (commandParams?.json_schema) {
      try {
        // Basic JSON schema validation (in production, use a proper validator)
        const schema = commandParams.json_schema;
        if (schema.required) {
          for (const requiredField of schema.required) {
            if (!(requiredField in params)) {
              return new Response(
                JSON.stringify({
                  status: 'error',
                  reason: `Missing required parameter: ${requiredField}`
                }),
                { 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  status: 200
                }
              );
            }
          }
        }

        // Validate parameter types
        if (schema.properties) {
          for (const [paramName, paramValue] of Object.entries(params)) {
            const propSchema = schema.properties[paramName];
            if (propSchema) {
              const expectedType = propSchema.type;
              const actualType = typeof paramValue;
              
              if (expectedType === 'number' && actualType !== 'number') {
                return new Response(
                  JSON.stringify({
                    status: 'error',
                    reason: `Parameter ${paramName} must be a number, got ${actualType}`
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
                    reason: `Parameter ${paramName} must be a string, got ${actualType}`
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
        console.error('Schema validation error:', error);
        return new Response(
          JSON.stringify({
            status: 'error',
            reason: 'Parameter validation failed'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
    }

    // 5. Log validation attempt
    await supabaseClient
      .from('audit_logs')
      .insert({
        customer_id: '00000000-0000-0000-0000-000000000000', // TODO: Get from auth context
        actor: 'system',
        action: 'command_validation',
        target: command_name,
        meta: {
          agent_snapshot,
          result: 'success'
        }
      });

    return new Response(
      JSON.stringify({
        status: 'ok',
        message: 'Command validation successful'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Validation error:', error);
    
    return new Response(
      JSON.stringify({
        status: 'error',
        reason: 'Internal server error during validation'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});