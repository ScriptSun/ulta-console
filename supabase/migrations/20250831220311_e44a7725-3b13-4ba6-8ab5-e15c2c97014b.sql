-- Create system_settings table for configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for system_settings
CREATE POLICY "system_settings_read_policy" ON public.system_settings
FOR SELECT USING (true);

-- Insert AI model pricing configuration including Claude and Gemini models
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'ai_model_pricing',
  '{
    "gpt-4o-mini": {
      "prompt_cost_per_1k": 0.000150,
      "completion_cost_per_1k": 0.000600,
      "displayName": "GPT-4o Mini"
    },
    "gpt-4o": {
      "prompt_cost_per_1k": 0.005000,
      "completion_cost_per_1k": 0.015000,
      "displayName": "GPT-4o"
    },
    "gpt-5-mini-2025-08-07": {
      "prompt_cost_per_1k": 0.000200,
      "completion_cost_per_1k": 0.000800,
      "displayName": "GPT-5 Mini"
    },
    "gpt-5-2025-08-07": {
      "prompt_cost_per_1k": 0.010000,
      "completion_cost_per_1k": 0.030000,
      "displayName": "GPT-5"
    },
    "claude-3-5-sonnet-20241022": {
      "prompt_cost_per_1k": 0.003000,
      "completion_cost_per_1k": 0.015000,
      "displayName": "Claude 3.5 Sonnet"
    },
    "claude-3-5-haiku-20241022": {
      "prompt_cost_per_1k": 0.000250,
      "completion_cost_per_1k": 0.001250,
      "displayName": "Claude 3.5 Haiku"
    },
    "claude-3-opus-20240229": {
      "prompt_cost_per_1k": 0.015000,
      "completion_cost_per_1k": 0.075000,
      "displayName": "Claude 3 Opus"
    },
    "claude-sonnet-4-20250514": {
      "prompt_cost_per_1k": 0.005000,
      "completion_cost_per_1k": 0.025000,
      "displayName": "Claude 4 Sonnet"
    },
    "claude-opus-4-20250514": {
      "prompt_cost_per_1k": 0.020000,
      "completion_cost_per_1k": 0.100000,
      "displayName": "Claude 4 Opus"
    },
    "gemini-1.5-pro": {
      "prompt_cost_per_1k": 0.003500,
      "completion_cost_per_1k": 0.010500,
      "displayName": "Gemini 1.5 Pro"
    },
    "gemini-1.5-flash": {
      "prompt_cost_per_1k": 0.000075,
      "completion_cost_per_1k": 0.000300,
      "displayName": "Gemini 1.5 Flash"
    },
    "gemini-2.0-flash-exp": {
      "prompt_cost_per_1k": 0.000075,
      "completion_cost_per_1k": 0.000300,
      "displayName": "Gemini 2.0 Flash"
    }
  }'::jsonb,
  'Complete AI model pricing configuration including OpenAI, Claude, and Gemini models'
) ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();