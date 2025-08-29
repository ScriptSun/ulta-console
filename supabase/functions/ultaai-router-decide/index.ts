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

// Router specification constants
const ROUTER_SYSTEM_PROMPT = `You are UltaAI Router. Input contains: user_request, heartbeat, candidates[], command_policies[], policy_notes. Decide one of four outputs, return one compact JSON only:

1) Confirmed batch:
{"task":"<script_key>","batch_id":"<uuid>","params":{...},"status":"confirmed","risk":"<low|medium|high>","preflight":[ "...short items..." ]}

2) Custom shell:
{"task":"custom_shell","params":{"description":"<short>","shell":"<one safe command>"},"status":"unconfirmed","risk":"<low|medium|high>"}

3) Proposed batch (no exact match, you create one):
{"task":"proposed_batch","status":"unconfirmed","batch":{
  "key":"<slug>",
  "name":"<human title>",
  "risk":"<low|medium|high>",
  "description":"<1 sentence>",
  "inputs_schema":{...json schema...},
  "inputs_defaults":{...},
  "preflight":{"checks":[ ...objects like {type,min_free_gb,...} ]},
  "commands":[ "<one command per line, no pipes, no &&, no ;>" ]
}}

4) Not supported:
{"task":"not_supported","reason":"<short>"}

Rules:
- Pick best match from candidates by name, key, description
- Enforce candidates[i].preflight against heartbeat before confirming
- Risk for confirmed batch = candidates[i].risk
- Risk for custom_shell or proposed_batch = set based on potential impact
- Never output multiple commands joined by pipes or && or ;
- Obey policy_notes thresholds
- Validate shell against command_policies, do not emit forbidden content
- Only one JSON object, no prose`;

// Simplified schema without oneOf (not supported by OpenAI structured output)
const ROUTER_RESPONSE_SCHEMA = {
  "type": "object",
  "required": ["task"],
  "properties": {
    "task": {
      "type": "string",
      "enum": ["confirmed_batch", "custom_shell", "proposed_batch", "not_supported"]
    },
    "batch_id": {"type": "string"},
    "params": {"type": "object"},
    "status": {"type": "string"},
    "risk": {"type": "string", "enum": ["low", "medium", "high"]},
    "preflight": {"type": "array", "items": {"type": "string"}},
    "batch": {"type": "object"},
    "reason": {"type": "string"}
  },
  "additionalProperties": false
};

// GPT call function
async function callGPT({
  system,
  user,
  schema,
  temperature = 0
}: {
  system: string;
  user: any;
  schema?: Record<string, unknown>;
  temperature?: number;
}): Promise<{ decision: any; logs: any }> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  const logs = {
    request: null as any,
    response: null as any,
    error: null as any
  };
  
  console.log('🔑 OpenAI API Key available:', !!openaiApiKey);
  
  if (!openaiApiKey) {
    const error = "OPENAI_API_KEY environment variable is required but not set";
    logs.error = error;
    throw new Error(error);
  }

  const response_format = schema 
    ? { 
        type: "json_schema" as const, 
        json_schema: { 
          name: "UltaAI_JSON", 
          schema, 
          strict: true 
        } 
      }
    : { type: "json_object" as const };

  const requestBody = {
    model: "gpt-4o",
    max_tokens: 4000,
    response_format,
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(user) }
    ]
  };

  // Store full request for logging
  logs.request = {
    url: 'https://api.openai.com/v1/chat/completions',
    method: 'POST',
    body: requestBody,
    timestamp: new Date().toISOString()
  };

  console.log('📤 OpenAI Request:', {
    model: requestBody.model,
    max_tokens: requestBody.max_tokens,
    response_format: requestBody.response_format,
    messages: requestBody.messages.map(m => ({ role: m.role, content: m.content.substring(0, 200) + '...' }))
  });

  try {
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
      logs.error = {
        status: response.status,
        body: errorBody,
        timestamp: new Date().toISOString()
      };
      throw new Error(`OpenAI API error: ${response.status} ${errorBody}`);
    }

    const completion = await response.json();
    
    // Store full response for logging
    logs.response = {
      status: response.status,
      body: completion,
      timestamp: new Date().toISOString()
    };

    console.log('✅ OpenAI Response:', {
      model: completion.model,
      usage: completion.usage,
      finish_reason: completion.choices[0]?.finish_reason
    });

    const content = completion.choices[0]?.message?.content;
    console.log('📝 OpenAI Content:', content);
    
    if (!content) {
      const error = "No content received from OpenAI";
      logs.error = error;
      throw new Error(error);
    }

    const parsedContent = JSON.parse(content);
    console.log('🎯 Parsed Decision:', parsedContent);

    return { decision: parsedContent, logs };
  } catch (error) {
    if (!logs.error) {
      logs.error = {
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
    throw error;
  }
}

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

    // 2. Call GPT with the router system prompt and schema
    console.log('🤖 Calling OpenAI GPT...');
    
    try {
      const { decision, logs } = await callGPT({
        system: ROUTER_SYSTEM_PROMPT,
        user: payload,
        schema: ROUTER_RESPONSE_SCHEMA
      });

      console.log('🎉 GPT decision received:', decision.task);

      // 3. Update agents table with the decision
      console.log('💾 Updating agent with decision...');
      const { error: updateError } = await supabase
        .from('agents')
        .update({ last_decision_json: decision })
        .eq('id', agent_id);

      if (updateError) {
        console.error('⚠️ Error updating agent with decision:', updateError);
        // Continue anyway, just log the error
      }

      console.log(`✅ Router decision completed successfully for agent ${agent_id}`);

      // 4. Return the decision with logs
      return new Response(JSON.stringify({
        ...decision,
        _debug: {
          openai_logs: logs,
          payload_summary: {
            candidates_count: payload.candidates?.length || 0,
            policies_count: payload.command_policies?.length || 0,
            agent_id: agent_id,
            user_request: user_request
          }
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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