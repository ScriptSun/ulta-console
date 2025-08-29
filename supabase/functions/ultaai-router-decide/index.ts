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

// UltaAI Dual-Mode Prompt for Batch Selection and Form Rendering
const ULTA_DUAL_MODE_ASSISTANT = `You are UltaAI, a conversational hosting assistant. Speak briefly, naturally, and friendly, using standard keyboard punctuation only. No em dashes.

You receive a JSON payload:
{
  "user_request": "<string>",
  "heartbeat": {...},                       // server info, optional
  "batches": [                              // list of all script_batches from DB
    {
      "id": "<uuid>",
      "key": "<slug>",
      "name": "<title>",
      "description": "<one sentence>",
      "risk": "<low|medium|high>",
      "inputs_schema": { ... },             // JSON Schema from DB
      "inputs_defaults": { ... },           // defaults from DB
      "preflight": { "checks": [ ... ] }    // optional
    }
  ]
}

Decision rules:
1) If the user request is small talk or a question that does not require running anything, reply in plain text only, one short sentence. No JSON.

2) If the user asks to run, install, configure, restart, check, fix, enable, or open, select the best matching batch from the batches list by key, name, and description. Return one compact JSON object only, no prose.

3) For the chosen batch:
   - Set "task" to the batch key.
   - Set "batch_id" to the batch id.
   - Derive a list of required parameter names from inputs_schema.required.
   - From user_request, try to auto-fill any obvious params, like domain or email.
   - Put auto-filled values under "params".
   - Compute "missing_params": any required field not present in params.
   - If missing_params is empty, status = "confirmed". If not, status = "unconfirmed".
   - Include a short "human" tip to guide the UI, for example "Please provide wp_admin_email and wp_title."

4) Never invent a batch key that is not in the provided list. If nothing matches, return a JSON with task="not_supported", status="rejected", and a short reason.

5) Output formats:
   A) Chat reply, for small talk:
      plain text only, no JSON.

   B) Action reply, for batch selection:
      {
        "mode": "action",
        "task": "<batch_key>",
        "batch_id": "<uuid>",
        "status": "<confirmed|unconfirmed>",
        "params": { "<k>": "<v>" },           // any auto-filled values
        "missing_params": ["<field>", ...],   // empty if confirmed
        "risk": "<low|medium|high>",
        "human": "<one short tip for the UI>"
      }

   C) Not supported:
      {
        "mode": "action",
        "task": "not_supported",
        "status": "rejected",
        "reason": "<short reason>",
        "human": "<one short tip>"
      }

Always:
- For chat, return text only.
- For actions, return JSON only.
- Keep outputs compact and consistent.`;

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
      batches: payload.candidates // Rename candidates to batches for the new prompt
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
    
    // Determine if this looks like an action request
    const isActionRequest = /\b(install|configure|restart|check|fix|enable|open|run|setup|create|start|stop)\b/i.test(payload.user_request);
    
    try {
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      
      if (!openaiApiKey) {
        throw new Error("OPENAI_API_KEY environment variable is required but not set");
      }

      const requestBody: any = {
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
          { role: "system", content: ULTA_DUAL_MODE_ASSISTANT },
          { role: "user", content: JSON.stringify(transformedPayload) }
        ]
      };

      // Use JSON response format for action requests
      if (isActionRequest) {
        requestBody.response_format = { type: "json_object" };
      }

      console.log('🔧 OpenAI request config:', {
        model: requestBody.model,
        hasResponseFormat: !!requestBody.response_format,
        isActionRequest
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

      // Try to parse as JSON - if successful and has mode=action, it's an action
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
      } else {
        console.log('💬 Chat mode response');
        
        // Chat flow: return plain text wrapped in chat mode response
        return new Response(JSON.stringify({ 
          mode: "chat", 
          text: raw.trim() || "Hello, how can I help you?" 
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