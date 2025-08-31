-- Add token tracking columns to agent_usage table
ALTER TABLE public.agent_usage 
ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gpt-4o-mini';

-- Insert or update model pricing configuration in system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'openai_model_pricing',
  '{
    "gpt-4o-mini": {
      "prompt_cost_per_1k": 0.000150,
      "completion_cost_per_1k": 0.000600
    },
    "gpt-4o": {
      "prompt_cost_per_1k": 0.005000,
      "completion_cost_per_1k": 0.015000
    },
    "gpt-5-mini-2025-08-07": {
      "prompt_cost_per_1k": 0.000200,
      "completion_cost_per_1k": 0.000800
    },
    "gpt-5-2025-08-07": {
      "prompt_cost_per_1k": 0.010000,
      "completion_cost_per_1k": 0.030000
    }
  }'::jsonb,
  'OpenAI model pricing per 1K tokens'
) ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();