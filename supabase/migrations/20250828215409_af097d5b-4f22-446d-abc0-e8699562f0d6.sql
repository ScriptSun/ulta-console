-- Fix intent mapping with correct policy_mode value
INSERT INTO public.intent_mappings (
  customer_id,
  intent_name,
  description,
  operation_type,
  batch_key,
  policy_mode,
  risk_level,
  active,
  created_by,
  updated_by
) VALUES (
  '00000000-0000-0000-0000-000000000001', -- System customer for global mappings
  'install_wordpress',
  'Install WordPress on a server',
  'batch',
  'wordpress_install',
  'auto_allow', -- Changed from 'none' to valid policy mode
  'medium',
  true,
  '00000000-0000-0000-0000-000000000001', -- System user
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (customer_id, intent_name) DO UPDATE SET
  batch_key = EXCLUDED.batch_key,
  policy_mode = EXCLUDED.policy_mode,
  active = EXCLUDED.active,
  updated_at = now();