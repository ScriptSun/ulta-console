import { supabase } from "@/integrations/supabase/client";

export interface AIRequestParams {
  system: string;
  user: any;
  schema?: Record<string, unknown>;
  temperature?: number;
  tenantId?: string;
  agentId?: string;
  requestType?: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google';
  pricing?: {
    prompt: number;
    completion: number;
  };
}

export const AI_MODELS: Record<string, AIModel> = {
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    pricing: { prompt: 0.000150, completion: 0.0006 }
  },
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    pricing: { prompt: 0.0025, completion: 0.01 }
  },
  'gpt-5-2025-08-07': {
    id: 'gpt-5-2025-08-07',
    name: 'GPT-5',
    provider: 'openai',
    pricing: { prompt: 0.005, completion: 0.015 }
  },
  'gpt-5-mini-2025-08-07': {
    id: 'gpt-5-mini-2025-08-07',
    name: 'GPT-5 Mini',
    provider: 'openai',
    pricing: { prompt: 0.001, completion: 0.004 }
  },
  'claude-3-5-sonnet': {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    pricing: { prompt: 0.003, completion: 0.015 }
  },
  'claude-3-opus': {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    pricing: { prompt: 0.015, completion: 0.075 }
  },
  'claude-opus-4-20250514': {
    id: 'claude-opus-4-20250514',
    name: 'Claude 4 Opus',
    provider: 'anthropic',
    pricing: { prompt: 0.015, completion: 0.075 }
  }
};

class AIService {
  private static instance: AIService;
  private failoverModels: string[] = ['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet'];
  private lastSettingsCheck = 0;
  private settingsCacheTime = 5 * 60 * 1000; // 5 minutes cache

  private constructor() {}

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  private async loadAISettings(): Promise<void> {
    const now = Date.now();
    if (now - this.lastSettingsCheck < this.settingsCacheTime) {
      return; // Use cached settings
    }

    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'ai_models')
        .single();

      if (error) {
        console.warn('Failed to load AI settings, using defaults:', error);
        return;
      }

      if (data?.setting_value && typeof data.setting_value === 'object' && data.setting_value !== null) {
        const settingValue = data.setting_value as any;
        if (settingValue.default_models && Array.isArray(settingValue.default_models)) {
          this.failoverModels = settingValue.default_models;
        }
      }

      this.lastSettingsCheck = now;
    } catch (error) {
      console.warn('Error loading AI settings:', error);
    }
  }

  private async callOpenAI(model: string, params: AIRequestParams): Promise<any> {
    // Use the edge function for AI requests to handle API keys securely
    const response = await supabase.functions.invoke('ai-router', {
      body: {
        model,
        ...params
      }
    });

    if (response.error) {
      throw new Error(response.error.message || 'AI request failed');
    }

    if (!response.data.success) {
      throw new Error(response.data.error || 'AI request failed');
    }

    return {
      completion: {
        choices: [{ message: { content: JSON.stringify(response.data.content) } }],
        usage: response.data.usage
      },
      model: response.data.model
    };
  }

  private async callAnthropic(model: string, params: AIRequestParams): Promise<any> {
    // Use the edge function for AI requests
    const response = await supabase.functions.invoke('ai-router', {
      body: {
        model,
        ...params
      }
    });

    if (response.error) {
      throw new Error(response.error.message || 'AI request failed');
    }

    if (!response.data.success) {
      throw new Error(response.data.error || 'AI request failed');
    }

    return {
      completion: {
        choices: [{ message: { content: JSON.stringify(response.data.content) } }],
        usage: response.data.usage
      },
      model: response.data.model
    };
  }

  private async callModel(modelId: string, params: AIRequestParams): Promise<any> {
    // Use the edge function for all AI requests to handle failover centrally
    const response = await supabase.functions.invoke('ai-router', {
      body: params
    });

    if (response.error) {
      throw new Error(response.error.message || 'AI request failed');
    }

    if (!response.data.success) {
      throw new Error(response.data.error || 'AI request failed');
    }

    return response.data;
  }

  private async logAIUsage(
    modelId: string, 
    usage: any, 
    tenantId?: string, 
    agentId?: string, 
    requestType?: string
  ): Promise<void> {
    if (!tenantId || !usage) return;

    try {
      const model = AI_MODELS[modelId];
      const pricing = model?.pricing;
      
      if (!pricing) {
        console.warn(`No pricing info for model ${modelId}`);
        return;
      }

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

  public async callAI(params: AIRequestParams): Promise<any> {
    // The edge function now handles all failover logic
    const result = await this.callModel('', params); // Model selection happens in edge function
    
    console.log(`✅ AI request successful with model: ${result.model} after ${result.failover_attempts} attempts`);
    
    return {
      content: result.content,
      model: result.model,
      usage: result.usage,
      failover_attempts: result.failover_attempts
    };
  }

  public getFailoverModels(): string[] {
    return [...this.failoverModels];
  }

  public async refreshSettings(): Promise<void> {
    this.lastSettingsCheck = 0; // Force refresh
    await this.loadAISettings();
  }
}

// Export singleton instance
export const aiService = AIService.getInstance();

// Legacy compatibility function
export async function callGPT(params: AIRequestParams): Promise<any> {
  const result = await aiService.callAI(params);
  return result.content; // Return just content for backward compatibility
}