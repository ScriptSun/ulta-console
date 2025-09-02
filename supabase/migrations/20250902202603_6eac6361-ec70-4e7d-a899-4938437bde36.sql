-- Update AI models to use faster models for better performance
UPDATE system_settings 
SET setting_value = jsonb_build_object(
  'default_models', jsonb_build_array('gpt-5-nano-2025-08-07', 'gpt-5-mini-2025-08-07', 'claude-3-5-haiku-20241022'),
  'enabled_models', jsonb_build_array('gpt-5-nano-2025-08-07', 'gpt-5-mini-2025-08-07', 'claude-3-5-haiku-20241022', 'gpt-5-2025-08-07', 'claude-sonnet-4-20250514'),
  'max_tokens', 4000,
  'temperature', 0.7
)
WHERE setting_key = 'ai_models';

-- Update the other AI settings key as well
UPDATE system_settings 
SET setting_value = jsonb_build_array('gpt-5-nano-2025-08-07', 'gpt-5-mini-2025-08-07', 'claude-3-5-haiku-20241022')
WHERE setting_key = 'ai.models';

-- Update global defaults
UPDATE system_settings 
SET setting_value = jsonb_build_object(
  'default_models', jsonb_build_array('gpt-5-nano-2025-08-07', 'gpt-5-mini-2025-08-07', 'claude-3-5-haiku-20241022'),
  'max_tokens', 4000,
  'temperature', 0.7
)
WHERE setting_key = 'ai.defaults.global';

-- Update AI model pricing for the new faster models
UPDATE system_settings 
SET setting_value = jsonb_build_object(
  'gpt-5-nano-2025-08-07', jsonb_build_object(
    'displayName', 'GPT-5 Nano',
    'prompt_cost_per_1k', 0.0005,
    'completion_cost_per_1k', 0.002
  ),
  'gpt-5-mini-2025-08-07', jsonb_build_object(
    'displayName', 'GPT-5 Mini', 
    'prompt_cost_per_1k', 0.001,
    'completion_cost_per_1k', 0.004
  ),
  'gpt-5-2025-08-07', jsonb_build_object(
    'displayName', 'GPT-5',
    'prompt_cost_per_1k', 0.005,
    'completion_cost_per_1k', 0.015
  ),
  'claude-3-5-haiku-20241022', jsonb_build_object(
    'displayName', 'Claude 3.5 Haiku',
    'prompt_cost_per_1k', 0.0008,
    'completion_cost_per_1k', 0.004
  ),
  'claude-sonnet-4-20250514', jsonb_build_object(
    'displayName', 'Claude 4 Sonnet',
    'prompt_cost_per_1k', 0.003,
    'completion_cost_per_1k', 0.015
  ),
  'claude-opus-4-20250514', jsonb_build_object(
    'displayName', 'Claude 4 Opus',
    'prompt_cost_per_1k', 0.015,
    'completion_cost_per_1k', 0.075
  )
)
WHERE setting_key = 'ai_model_pricing';