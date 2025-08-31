// AI Cost Tracking Utility for Edge Functions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Model pricing per 1K tokens (USD)
export const MODEL_PRICING = {
  'gpt-5-2025-08-07': { prompt: 0.015, completion: 0.06 },
  'gpt-5-mini-2025-08-07': { prompt: 0.0075, completion: 0.03 },
  'gpt-5-nano-2025-08-07': { prompt: 0.004, completion: 0.016 },
  'gpt-4.1-2025-04-14': { prompt: 0.01, completion: 0.03 },
  'gpt-4.1-mini-2025-04-14': { prompt: 0.005, completion: 0.015 },
  'gpt-4o': { prompt: 0.0025, completion: 0.01 },
  'gpt-4o-mini': { prompt: 0.00015, completion: 0.0006 },
  'o3-2025-04-16': { prompt: 0.02, completion: 0.08 },
  'o4-mini-2025-04-16': { prompt: 0.01, completion: 0.04 },
  // Claude models
  'claude-3-5-sonnet-20241022': { prompt: 0.003, completion: 0.015 },
  'claude-3-opus-20240229': { prompt: 0.015, completion: 0.075 },
  'claude-3-haiku-20240307': { prompt: 0.00025, completion: 0.00125 },
  // Gemini models
  'gemini-pro': { prompt: 0.0005, completion: 0.0015 },
  'gemini-pro-vision': { prompt: 0.0025, completion: 0.0075 }
} as const;

export interface AIUsageData {
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
}

export class AICostTracker {
  private supabase;

  constructor() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Calculate cost based on model and token usage
   */
  calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING];
    if (!pricing) {
      console.warn(`Unknown model pricing for: ${model}, using default rates`);
      // Default to GPT-4o-mini pricing for unknown models
      return (promptTokens * 0.00015 + completionTokens * 0.0006) / 1000;
    }
    
    return (promptTokens * pricing.prompt + completionTokens * pricing.completion) / 1000;
  }

  /**
   * Log AI usage to database
   */
  async logUsage(
    tenantId: string,
    agentId: string | null,
    model: string,
    promptTokens: number,
    completionTokens: number,
    requestType: string,
    metadata: Record<string, any> = {}
  ): Promise<string | null> {
    try {
      const totalTokens = promptTokens + completionTokens;
      const costUsd = this.calculateCost(model, promptTokens, completionTokens);

      const { data, error } = await this.supabase
        .rpc('log_ai_usage', {
          _tenant_id: tenantId,
          _agent_id: agentId,
          _model: model,
          _prompt_tokens: promptTokens,
          _completion_tokens: completionTokens,
          _cost_usd: costUsd,
          _request_type: requestType,
          _metadata: metadata
        });

      if (error) {
        console.error('Failed to log AI usage:', error);
        return null;
      }

      console.log(`AI Usage logged: ${model} - $${costUsd.toFixed(6)} (${totalTokens} tokens)`);
      return data;
    } catch (error) {
      console.error('Error logging AI usage:', error);
      return null;
    }
  }

  /**
   * Extract usage data from OpenAI response
   */
  extractOpenAIUsage(response: any, model: string): AIUsageData {
    const usage = response.usage || {};
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || promptTokens + completionTokens;
    const costUsd = this.calculateCost(model, promptTokens, completionTokens);

    return {
      model,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      cost_usd: costUsd
    };
  }
}