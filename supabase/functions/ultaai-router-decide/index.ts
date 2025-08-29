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

const ROUTER_RESPONSE_SCHEMA = {
  "type":"object",
  "oneOf":[
    { "type":"object","required":["task","batch_id","params","status","risk","preflight"],
      "properties":{
        "task":{"type":"string"},
        "batch_id":{"type":"string"},
        "params":{"type":"object","additionalProperties":{"type":["string","number","boolean","null"]}},
        "status":{"type":"string","enum":["confirmed"]},
        "risk":{"type":"string","enum":["low","medium","high"]},
        "preflight":{"type":"array","items":{"type":"string"}}
      },
      "additionalProperties":false
    },
    { "type":"object","required":["task","params","status","risk"],
      "properties":{
        "task":{"type":"string","enum":["custom_shell"]},
        "params":{"type":"object","required":["description","shell"],
          "properties":{"description":{"type":"string"},"shell":{"type":"string"}},
          "additionalProperties":false
        },
        "status":{"type":"string","enum":["unconfirmed"]},
        "risk":{"type":"string","enum":["low","medium","high"]}
      },
      "additionalProperties":false
    },
    { "type":"object","required":["task","status","batch"],
      "properties":{
        "task":{"type":"string","enum":["proposed_batch"]},
        "status":{"type":"string","enum":["unconfirmed"]},
        "batch":{"type":"object","required":["key","name","risk","description","inputs_schema","inputs_defaults","preflight","commands"],
          "properties":{
            "key":{"type":"string"},
            "name":{"type":"string"},
            "risk":{"type":"string","enum":["low","medium","high"]},
            "description":{"type":"string"},
            "inputs_schema":{"type":"object"},
            "inputs_defaults":{"type":"object"},
            "preflight":{"type":"object"},
            "commands":{"type":"array","items":{"type":"string"}}
          },
          "additionalProperties":false
        }
      },
      "additionalProperties":false
    },
    { "type":"object","required":["task","reason"],
      "properties":{
        "task":{"type":"string","enum":["not_supported"]},
        "reason":{"type":"string"}
      },
      "additionalProperties":false
    }
  ]
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
}): Promise<any> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiApiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required but not set");
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

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 4000,
      response_format,
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(user) }
      ]
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('OpenAI API error:', response.status, errorBody);
    throw new Error(`OpenAI API error: ${response.status} ${errorBody}`);
  }

  const completion = await response.json();
  const content = completion.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error("No content received from OpenAI");
  }

  return JSON.parse(content);
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

    const { agent_id, user_request }: RequestBody = await req.json();

    if (!agent_id || !user_request) {
      return new Response(JSON.stringify({ error: 'Missing agent_id or user_request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing router decision for agent_id: ${agent_id}, user_request: ${user_request}`);

    // 1. Call /api/ultaai/router/payload
    const payloadResponse = await supabase.functions.invoke('ultaai-router-payload', {
      body: { agent_id, user_request }
    });

    if (payloadResponse.error) {
      console.error('Error calling router payload:', payloadResponse.error);
      return new Response(JSON.stringify({ error: 'Failed to get router payload' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = payloadResponse.data;
    console.log('Got payload with', payload.candidates?.length || 0, 'candidates');

    // 2. Call GPT with the router system prompt and schema
    const decision = await callGPT({
      system: ROUTER_SYSTEM_PROMPT,
      user: payload,
      schema: ROUTER_RESPONSE_SCHEMA
    });

    console.log('GPT decision:', decision.task);

    // 3. Update agents table with the decision
    const { error: updateError } = await supabase
      .from('agents')
      .update({ last_decision_json: decision })
      .eq('id', agent_id);

    if (updateError) {
      console.error('Error updating agent with decision:', updateError);
      // Continue anyway, just log the error
    }

    console.log(`Router decision completed successfully for agent ${agent_id}`);

    // 4. Return the decision
    return new Response(JSON.stringify(decision), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing router decision:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});