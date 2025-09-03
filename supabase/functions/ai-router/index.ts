import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client for loading system settings
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Function to get system temperature setting
async function getSystemTemperature(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'ai_models')
      .single();

    if (error) {
      console.warn('Failed to load system temperature, using default:', error);
      return 0.7; // Default fallback
    }

    const aiSettings = data?.setting_value;
    if (aiSettings && typeof aiSettings === 'object' && aiSettings.temperature !== undefined) {
      return aiSettings.temperature;
    }

    return 0.7; // Default fallback
  } catch (error) {
    console.warn('Error loading system temperature:', error);
    return 0.7; // Default fallback
  }
}

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

  // Load system temperature setting if not provided
  let temperature = params.temperature;
  if (temperature === undefined) {
    temperature = await getSystemTemperature();
    console.log(`🌡️ Using system temperature setting: ${temperature}`);
  }

  // Determine if this is a newer model that doesn't support temperature
  const newerModels = ['gpt-5-2025-08-07', 'gpt-5-mini-2025-08-07', 'o3-2025-04-16', 'o4-mini-2025-04-16'];
  const isNewerModel = newerModels.includes(model);

  const requestParams: any = {
    model: model,
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: JSON.stringify(params.user) }
    ]
  };

  if (isNewerModel) {
    requestParams.max_completion_tokens = 4000;
    // Newer models don't support temperature parameter
  } else {
    requestParams.max_tokens = 4000;
    requestParams.temperature = temperature;
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

    // CHECK USAGE LIMITS BEFORE MAKING AI REQUESTS
    if (params.agentId) {
      console.log(`🔍 Checking usage limits for agent: ${params.agentId}`);
      
      try {
        const { data: limitCheck, error: limitError } = await supabase
          .rpc('check_agent_usage_limit', {
            _agent_id: params.agentId,
            _usage_type: 'ai_request'
          });

        if (limitError) {
          console.error('Error checking usage limits:', limitError);
        } else if (limitCheck && limitCheck.length > 0) {
          const limit = limitCheck[0];
          console.log('Usage limit check result:', limit);
          
          if (!limit.allowed) {
            console.log(`❌ Usage limit exceeded for agent ${params.agentId}: ${limit.current_usage}/${limit.limit_amount}`);
            
            return new Response(
              JSON.stringify({
                success: false,
                error: 'AI request limit exceeded',
                message: `You have reached your ${limit.plan_name || 'plan'} limit of ${limit.limit_amount} AI requests this month. Please upgrade your plan to continue.`,
                current_usage: limit.current_usage,
                limit_amount: limit.limit_amount,
                plan_name: limit.plan_name,
                limit_type: 'ai_requests'
              }),
              { 
                status: 429, // Too Many Requests
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }
          
          console.log(`✅ Usage check passed: ${limit.current_usage}/${limit.limit_amount} (${limit.plan_name})`);
        }
      } catch (limitCheckError) {
        console.error('Failed to check usage limits:', limitCheckError);
        // Continue with request - don't block on limit check failures
      }
    }

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

        // Log successful usage and INCREMENT USAGE COUNTER
        await logAIUsage(
          supabase,
          modelId,
          result.usage,
          params.tenantId,
          params.agentId,
          params.requestType
        );
        
        // Increment agent usage counter for plan tracking
        if (params.agentId) {
          try {
            await supabase.rpc('increment_agent_usage', {
              _agent_id: params.agentId,
              _usage_type: 'ai_request',
              _increment: 1
            });
            console.log(`📊 Incremented AI usage counter for agent: ${params.agentId}`);
          } catch (usageError) {
            console.error('Failed to increment usage counter:', usageError);
          }
        }

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