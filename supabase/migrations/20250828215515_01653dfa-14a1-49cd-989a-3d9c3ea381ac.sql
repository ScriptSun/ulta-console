-- Create intent mapping for WordPress install batch with correct constraints
INSERT INTO public.intent_mappings (
  customer_id,
  intent_name,
  description,
  operation_type,
  batch_key,
  policy_mode,
  command_template,
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
  NULL, -- Must be NULL for batch operation_type
  NULL, -- Must be NULL for batch operation_type  
  'medium',
  true,
  '00000000-0000-0000-0000-000000000001', -- System user
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (customer_id, intent_name) DO UPDATE SET
  batch_key = EXCLUDED.batch_key,
  policy_mode = EXCLUDED.policy_mode,
  command_template = EXCLUDED.command_template,
  active = EXCLUDED.active,
  updated_at = now();