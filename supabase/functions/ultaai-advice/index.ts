import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  reason: string;
  heartbeat_small: Record<string, unknown>;
}

const ADVICE_SYSTEM_PROMPT = `Write one compact JSON only:
{"message":"<one short sentence>","suggested_fixes":["<fix1>","<fix2>","<fix3>"]}
No prose.`;

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
      model: "gpt-5-2025-08-07",
      max_completion_tokens: 4000,
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
    const { reason, heartbeat_small }: RequestBody = await req.json();

    if (!reason || !heartbeat_small) {
      return new Response(JSON.stringify({ error: 'Missing reason or heartbeat_small' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Generating advice for reason:', reason);

    // Define the response schema
    const responseSchema = {
      type: "object",
      required: ["message", "suggested_fixes"],
      properties: {
        message: {
          type: "string"
        },
        suggested_fixes: {
          type: "array",
          items: {
            type: "string"
          },
          maxItems: 3
        }
      },
      additionalProperties: false
    };

    // Prepare input for GPT
    const inputData = {
      reason,
      heartbeat_small
    };

    // Call GPT to generate advice
    const advice = await callGPT({
      system: ADVICE_SYSTEM_PROMPT,
      user: inputData,
      schema: responseSchema
    });

    console.log('Generated advice successfully');

    return new Response(JSON.stringify(advice), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating advice:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});