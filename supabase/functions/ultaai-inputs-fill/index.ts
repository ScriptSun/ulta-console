import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AICostTracker } from '../_shared/ai-cost-tracker.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  inputs_schema: Record<string, unknown>;
  inputs_defaults: Record<string, unknown>;
  params: Record<string, unknown>;
}

// Import from routerSpec
const INPUT_FILLER_SYSTEM_PROMPT = `You fill inputs for a batch. Input has inputs_schema, inputs_defaults, and params. Output JSON only: {"inputs":{...}}. Start with defaults, overwrite with params, drop keys not in schema, ensure all required are present.`;

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
      model: "gpt-5-thinking",
      temperature,
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

  const result = JSON.parse(content);
  // Include usage data for cost tracking
  result._usage = completion.usage;
  return result;
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
    const body = await req.json();
    const { inputs_schema, inputs_defaults, params, tenant_id, agent_id } = body;

    if (!inputs_schema || !inputs_defaults || !params) {
      return new Response(JSON.stringify({ error: 'Missing inputs_schema, inputs_defaults, or params' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize cost tracker
    const costTracker = new AICostTracker();

    console.log('Filling inputs with GPT:', {
      schema_keys: Object.keys(inputs_schema),
      defaults_keys: Object.keys(inputs_defaults),
      params_keys: Object.keys(params)
    });

    // Prepare input for GPT
    const inputData = {
      inputs_schema,
      inputs_defaults,
      params
    };

    // Define the response schema
    const responseSchema = {
      type: "object",
      required: ["inputs"],
      properties: {
        inputs: {
          type: "object"
        }
      }
    };

    // Call GPT to fill inputs
    const result = await callGPT({
      system: INPUT_FILLER_SYSTEM_PROMPT,
      user: inputData,
      schema: responseSchema
    });

    // Log AI usage if tenant_id is provided
    if (tenant_id && result._usage) {
      await costTracker.logUsage(
        tenant_id,
        agent_id || null,
        'gpt-5-thinking',
        result._usage.prompt_tokens || 0,
        result._usage.completion_tokens || 0,
        'input_filling',
        { schema_fields: Object.keys(inputs_schema).length }
      );
    }

    // Remove usage info from response
    const { _usage, ...cleanResult } = result;

    console.log('GPT filled inputs successfully:', {
      filled_keys: Object.keys(cleanResult.inputs || {})
    });

    return new Response(JSON.stringify(cleanResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing inputs fill:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});