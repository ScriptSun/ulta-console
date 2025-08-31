-- Add token tracking columns to agent_usage table
ALTER TABLE public.agent_usage 
ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gpt-4o-mini';

-- Create system_settings table for model pricing configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for system_settings (only if doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'system_settings' 
        AND policyname = 'system_settings_admin_policy'
    ) THEN
        CREATE POLICY "system_settings_admin_policy" ON public.system_settings
        FOR ALL USING (is_admin());
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'system_settings' 
        AND policyname = 'system_settings_read_policy'
    ) THEN
        CREATE POLICY "system_settings_read_policy" ON public.system_settings
        FOR SELECT USING (true);
    END IF;
END$$;

-- Insert model pricing configuration
INSERT INTO public.system_settings (setting_key, setting_value, description)
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
) ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = now();