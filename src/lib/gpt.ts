import OpenAI from "openai";
import { supabase } from "@/integrations/supabase/client";

interface CallGPTParams {
  system: string;
  user: any;
  schema?: Record<string, unknown>;
  temperature?: number;
  tenantId?: string;
  agentId?: string;
  requestType?: string;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function callGPT({
  system,
  user,
  schema,
  temperature = 0,
  tenantId,
  agentId,
  requestType = 'general'
}: CallGPTParams): Promise<any> {
  if (!process.env.OPENAI_API_KEY) {
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

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4000,
    response_format,
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(user) }
    ]
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content received from OpenAI");
  }

  // Log AI usage if tenant info provided
  if (tenantId && completion.usage) {
    try {
      const MODEL_PRICING = {
        'gpt-4o': { prompt: 0.0025, completion: 0.01 }
      } as const;
      
      const pricing = MODEL_PRICING['gpt-4o'];
      const cost = (completion.usage.prompt_tokens * pricing.prompt + completion.usage.completion_tokens * pricing.completion) / 1000;
      
      await supabase.rpc('log_ai_usage', {
        _tenant_id: tenantId,
        _agent_id: agentId,
        _model: 'gpt-4o',
        _prompt_tokens: completion.usage.prompt_tokens,
        _completion_tokens: completion.usage.completion_tokens,
        _cost_usd: cost,
        _request_type: requestType
      });
    } catch (error) {
      console.error('Failed to log AI usage:', error);
    }
  }

  return JSON.parse(content);
}