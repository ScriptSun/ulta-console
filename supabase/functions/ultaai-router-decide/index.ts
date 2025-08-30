import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  agent_id: string;
  user_request: string;
}

// UltaAI Dual-Mode System Prompt
const ULTA_DUAL_MODE_ASSISTANT = `You are UltaAI, a conversational hosting assistant.

Input payload:
{
  "user_request": "<string>",
  "heartbeat": { "os": "...", "os_version": "...", "package_manager": "apt|yum|dnf|apk|choco", "open_ports": [ ... ], "running_services": [ ... ] },
  "batches": [ { "id": "<uuid>", "key": "<slug>", "name": "<title>", "description": "<one sentence>", "risk": "<low|medium|high>", "inputs_schema": { ... }, "inputs_defaults": { ... }, "preflight": { "checks": [ ... ] } } ],
  "command_policies": [ { "mode": "auto|confirm|forbid", "match_type": "regex|exact", "match_value": "<pattern>" } ],
  "policy_notes": { "wp_min_ram_mb": 2048, "wp_min_disk_gb": 5 }
}

Respond in two modes:

1) Chat mode (natural text only):
   If the user is greeting or asking something that does not require server execution, reply in one short friendly sentence. No JSON.

2) Action mode (JSON only):
   A) If the request matches a known batch in "batches", return:
      {
        "mode": "action",
        "task": "<batch_key>",
        "batch_id": "<uuid>",
        "status": "<confirmed|unconfirmed>",
        "params": { ...auto_filled },
        "missing_params": [ ... ],
        "risk": "<low|medium|high>",
        "human": "<short tip for the UI>"
      }

   B) If there is no matching batch but the request is a real server task, choose ONE of:
      B1) Single safe command (simple task):
          {
            "mode": "action",
            "task": "custom_shell",
            "status": "unconfirmed",
            "risk": "<low|medium|high>",
            "params": {
              "description": "<short description>",
              "shell": "<one safe Linux command>"
            },
            "human": "Press Execute if allowed by policy."
          }

      B2) Mini batch script (needs several steps):
          {
            "mode": "action",
            "task": "proposed_batch_script",
            "status": "unconfirmed",
            "risk": "<low|medium|high>",
            "script": {
              "name": "<short title>",
              "overview": "<one sentence>",
              "commands": [
                "<step 1 single command>",
                "<step 2 single command>",
                "<step 3 single command>"
              ],
              "post_checks": [
                "<curl or systemctl check>"
              ]
            },
            "human": "This script can be executed as a batch if allowed by policy."
          }

   C) If the request is unsafe or forbidden, return:
      {
        "mode": "action",
        "task": "not_supported",
        "status": "rejected",
        "reason": "<short reason>",
        "human": "<short hint>"
      }

Rules:
- Detect the package manager from heartbeat (prefer heartbeat.package_manager). If unknown, infer: Ubuntu/Debian=apt, CentOS/RHEL=yum or dnf, Fedora=dnf, Alpine=apk.
- Commands must be safe. Never use rm, dd, mkfs, eval, base64, curl|bash, pipes, &&, or ; in a single command line.
- For mini batch "commands", each array item is a single line command with no pipes or && or ;.
- Respect command_policies: if a command would match a forbid pattern, do not output it. Prefer the not_supported form with a reason.
- Prefer idempotent steps. Example: install packages with the native package manager, enable services with systemctl, reload rather than restart when possible.
- Add a very short "human" sentence to help the UI.
- For chat, text only. For actions, JSON only.`;

serve(async (req) => {
  console.log('🚀 Function called with method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
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

    console.log('🔧 Environment check:', {
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasSupabaseKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      hasOpenAIKey: !!Deno.env.get('OPENAI_API_KEY')
    });

    const { agent_id, user_request }: RequestBody = await req.json();

    if (!agent_id || !user_request) {
      console.error('❌ Missing required parameters:', { agent_id: !!agent_id, user_request: !!user_request });
      return new Response(JSON.stringify({ error: 'Missing agent_id or user_request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🎯 Processing router decision for agent_id: ${agent_id}, user_request: ${user_request}`);

    // 1. Call ultaai-router-payload
    console.log('📞 Calling ultaai-router-payload...');
    const payloadResponse = await supabase.functions.invoke('ultaai-router-payload', {
      body: { agent_id, user_request }
    });

    console.log('📊 Payload response:', { 
      hasData: !!payloadResponse.data, 
      hasError: !!payloadResponse.error,
      errorMessage: payloadResponse.error?.message 
    });

    if (payloadResponse.error) {
      console.error('❌ Error calling router payload:', payloadResponse.error);
      return new Response(JSON.stringify({ error: 'Failed to get router payload', details: payloadResponse.error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = payloadResponse.data;
    console.log('✅ Got payload with', payload.candidates?.length || 0, 'candidates');
    
    // 2. Transform payload to match new prompt format
    const transformedPayload = {
      user_request: payload.user_request,
      heartbeat: payload.heartbeat,
      batches: payload.candidates, // Rename candidates to batches for the new prompt
      command_policies: payload.command_policies || [],
      policy_notes: payload.policy_notes || {}
    };
    
    console.log('🔄 Transformed payload for OpenAI:', JSON.stringify(transformedPayload, null, 2));

    // 3. Call GPT with dual-mode system prompt
    console.log('🤖 Calling OpenAI GPT...');
    
    // Helper function to safely parse JSON responses
    function tryParseJSON(s: string) {
      try { 
        return JSON.parse(s); 
      } catch { 
        return null; 
      }
    }
    
    try {
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      
      if (!openaiApiKey) {
        throw new Error("OPENAI_API_KEY environment variable is required but not set");
      }

      const requestBody: any = {
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" }, // Always use JSON mode for dual-mode responses
        messages: [
          { role: "system", content: ULTA_DUAL_MODE_ASSISTANT },
          { role: "user", content: JSON.stringify(transformedPayload) }
        ]
      };

      console.log('🔧 OpenAI request config:', {
        model: requestBody.model,
        hasResponseFormat: !!requestBody.response_format
      });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 OpenAI Response Status:', response.status);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('❌ OpenAI API error:', response.status, errorBody);
        throw new Error(`OpenAI API error: ${response.status} ${errorBody}`);
      }

      const completion = await response.json();
      
      console.log('✅ OpenAI Response:', {
        model: completion.model,
        usage: completion.usage,
        finish_reason: completion.choices[0]?.finish_reason
      });

      const raw = completion.choices[0]?.message?.content ?? "";
      console.log('📝 OpenAI Content:', raw);
      
      if (!raw) {
        throw new Error("No content received from OpenAI");
      }

      // Parse response - handle both chat and action modes
      const obj = tryParseJSON(raw);
      
      if (obj && obj.mode === "action") {
        console.log('🎯 Action mode response:', obj);
        
        // Store action decision in agents table
        const { error: updateError } = await supabase
          .from('agents')
          .update({ last_decision_json: obj })
          .eq('id', agent_id);

        if (updateError) {
          console.error('⚠️ Error updating agent with decision:', updateError);
        }

        console.log(`✅ Action decision completed for agent ${agent_id}`);
        
        // Return the action JSON as is
        return new Response(JSON.stringify(obj), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else if (obj && obj.text) {
        // Handle structured chat response with text field
        console.log('💬 Structured chat mode response');
        return new Response(JSON.stringify({ 
          mode: "chat", 
          text: obj.text 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        // Handle plain text chat response or fallback
        console.log('💬 Plain text chat mode response');
        const chatText = obj && typeof obj === 'string' ? obj : (raw.trim() || "Hello, how can I help you?");
        
        return new Response(JSON.stringify({ 
          mode: "chat", 
          text: chatText 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (gptError) {
      console.error('❌ OpenAI API error:', gptError);
      return new Response(JSON.stringify({ 
        error: 'Failed to process with AI', 
        details: gptError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('💥 Error processing router decision:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});