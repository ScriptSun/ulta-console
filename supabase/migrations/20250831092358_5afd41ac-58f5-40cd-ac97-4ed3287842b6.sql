-- Enforce agent creation constraints: user_id and plan_key are required
-- This prevents agents from being created without proper user and plan associations

-- First, update existing agents that might have null values (if any)
-- Set a default plan for agents without one
UPDATE agents 
SET plan_key = 'free_plan' 
WHERE plan_key IS NULL OR plan_key = '';

-- Set user_id to a system default for agents without users (if any exist)
-- In practice, this should be handled by the application, but we'll prepare for it
-- UPDATE agents SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;

-- Make user_id and plan_key NOT NULL to enforce the constraints
ALTER TABLE agents 
ALTER COLUMN user_id SET NOT NULL,
ALTER COLUMN plan_key SET NOT NULL;

-- Add a unique constraint to ensure one agent per user (if this is the intended business rule)
-- Comment out if you want multiple agents per user
-- ALTER TABLE agents ADD CONSTRAINT agents_user_id_unique UNIQUE (user_id);

-- Add check constraint to ensure plan_key is not empty
ALTER TABLE agents 
ADD CONSTRAINT agents_plan_key_not_empty 
CHECK (plan_key IS NOT NULL AND plan_key != '');

-- Add check constraint to ensure user_id is not empty UUID
ALTER TABLE agents 
ADD CONSTRAINT agents_user_id_not_empty 
CHECK (user_id IS NOT NULL);

-- Create index for better performance on user lookups
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents (user_id);
CREATE INDEX IF NOT EXISTS idx_agents_plan_key ON agents (plan_key);

-- Add audit logging for this change
INSERT INTO audit_logs (customer_id, actor, action, target, meta)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'system',
  'schema_update',
  'agents_table_constraints',
  jsonb_build_object(
    'changes', ARRAY['user_id_not_null', 'plan_key_not_null', 'plan_key_not_empty_check'],
    'description', 'Enforced user and plan requirements for agent creation',
    'timestamp', now()
  )
);