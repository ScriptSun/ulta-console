import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIRequest {
  system: string;
  user: any;
  schema?: Record<string, unknown>;
  temperature?: number;
  tenantId?: string;
  agentId?: string;
  requestType?: string;
}

const AI_MODELS: Record<string, any> = {
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    provider: 'openai',
    pricing: { prompt: 0.000150, completion: 0.0006 }
  },
  'gpt-4o': {
    id: 'gpt-4o',
    provider: 'openai',
    pricing: { prompt: 0.0025, completion: 0.01 }
  },
  'gpt-5-2025-08-07': {
    id: 'gpt-5-2025-08-07',
    provider: 'openai',
    pricing: { prompt: 0.005, completion: 0.015 }
  },
  'gpt-5-mini-2025-08-07': {
    id: 'gpt-5-mini-2025-08-07',
    provider: 'openai',
    pricing: { prompt: 0.001, completion: 0.004 }
  },
  'claude-3-5-sonnet': {
    id: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    pricing: { prompt: 0.003, completion: 0.015 }
  }
};

async function callOpenAI(model: string, params: AIRequest) {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response_format = params.schema 
    ? { 
        type: "json_schema" as const, 
        json_schema: { 
          name: "UltaAI_JSON", 
          schema: params.schema, 
          strict: true 
        } 
      }
    : { type: "json_object" as const };

  // Handle different model parameter requirements
  const isNewerModel = model.includes('gpt-5') || model.includes('gpt-4.1') || model.includes('o3') || model.includes('o4');
  const requestParams: any = {
    model,
    response_format,
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: JSON.stringify(params.user) }
    ]
  };

  if (isNewerModel) {
    requestParams.max_completion_tokens = 4000;
  } else {
    requestParams.max_tokens = 4000;
    if (params.temperature !== undefined) {
      requestParams.temperature = params.temperature;
    }
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestParams),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
  }

  return await response.json();
}

async function callAnthropic(model: string, params: AIRequest) {
  // Placeholder for future Anthropic integration
  throw new Error(`Anthropic models (${model}) not implemented yet`);
}

async function logAIUsage(
  supabase: any,
  modelId: string, 
  usage: any, 
  tenantId?: string, 
  agentId?: string, 
  requestType?: string
) {
  if (!tenantId || !usage) return;

  try {
    const model = AI_MODELS[modelId];
    const pricing = model?.pricing;
    
    if (!pricing) return;

    const cost = (usage.prompt_tokens * pricing.prompt + usage.completion_tokens * pricing.completion) / 1000;
    
    await supabase.rpc('log_ai_usage', {
      _tenant_id: tenantId,
      _agent_id: agentId,
      _model: modelId,
      _prompt_tokens: usage.prompt_tokens,
      _completion_tokens: usage.completion_tokens,
      _cost_usd: cost,
      _request_type: requestType || 'general'
    });
  } catch (error) {
    console.error('Failed to log AI usage:', error);
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const params: AIRequest = await req.json();

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Load AI settings for failover models
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'ai_models')
      .single();

    let failoverModels = ['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet']; // defaults
    
    if (!settingsError && settings?.setting_value?.default_models) {
      failoverModels = settings.setting_value.default_models;
    }

    const errors: Array<{ model: string; error: string }> = [];

    // Attempt each model in order
    for (let i = 0; i < failoverModels.length; i++) {
      const modelId = failoverModels[i];
      
      try {
        console.log(`Attempting AI request with model ${i + 1}/${failoverModels.length}: ${modelId}`);
        
        let result;
        const model = AI_MODELS[modelId];
        
        if (!model) {
          throw new Error(`Unsupported model: ${modelId}`);
        }

        switch (model.provider) {
          case 'openai':
            result = await callOpenAI(model.id, params);
            break;
          case 'anthropic':
            result = await callAnthropic(model.id, params);
            break;
          default:
            throw new Error(`Unsupported provider: ${model.provider}`);
        }

        const content = result.choices[0]?.message?.content;
        if (!content) {
          throw new Error("No content received from AI model");
        }

        // Log successful usage
        await logAIUsage(
          supabase,
          modelId,
          result.usage,
          params.tenantId,
          params.agentId,
          params.requestType
        );

        console.log(`✅ AI request successful with model: ${modelId}`);
        
        return new Response(
          JSON.stringify({
            success: true,
            content: JSON.parse(content),
            model: modelId,
            usage: result.usage,
            failover_attempts: i
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      } catch (error: any) {
        const errorMessage = error.message || 'Unknown error';
        errors.push({ model: modelId, error: errorMessage });
        
        console.warn(`❌ Model ${modelId} failed:`, errorMessage);
        
        // If this is the last model, throw the accumulated errors
        if (i === failoverModels.length - 1) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `All AI models failed. Errors: ${errors.map(e => `${e.model}: ${e.error}`).join('; ')}`,
              attempts: errors
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        console.log(`🔄 Trying next model in failover chain...`);
      }
    }

  } catch (error) {
    console.error('Error in ai-router function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});