-- Fix agent constraints by properly handling existing data
-- The agents table references auth.users, not public.profiles

-- First, clean up orphaned agents that reference non-existent users
DELETE FROM agents 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM auth.users);

-- For agents with null user_id, assign them to the first available auth user
-- or delete them if no auth users exist
DO $$
DECLARE
    first_auth_user_id UUID;
    orphaned_count INTEGER;
BEGIN
    -- Get the first available user from auth.users
    SELECT id INTO first_auth_user_id FROM auth.users ORDER BY created_at LIMIT 1;
    
    -- Count orphaned agents
    SELECT COUNT(*) INTO orphaned_count FROM agents WHERE user_id IS NULL;
    
    IF first_auth_user_id IS NOT NULL AND orphaned_count > 0 THEN
        -- Assign orphaned agents to the first auth user
        UPDATE agents 
        SET user_id = first_auth_user_id 
        WHERE user_id IS NULL;
        
        -- Log this assignment
        INSERT INTO audit_logs (customer_id, actor, action, target, meta)
        VALUES (
            '00000000-0000-0000-0000-000000000001'::uuid,
            'system',
            'agents_user_assignment',
            'orphaned_agents',
            jsonb_build_object(
                'assigned_user_id', first_auth_user_id,
                'agents_count', orphaned_count,
                'reason', 'Preparing for NOT NULL constraint - assigned to auth.users'
            )
        );
    ELSIF orphaned_count > 0 THEN
        -- No auth users available, delete orphaned agents
        DELETE FROM agents WHERE user_id IS NULL;
        
        INSERT INTO audit_logs (customer_id, actor, action, target, meta)
        VALUES (
            '00000000-0000-0000-0000-000000000001'::uuid,
            'system',
            'agents_cleanup',
            'orphaned_agents',
            jsonb_build_object(
                'deleted_count', orphaned_count,
                'reason', 'No auth.users available for assignment'
            )
        );
    END IF;
END $$;

-- Set default plan for agents without one
UPDATE agents 
SET plan_key = 'free_plan' 
WHERE plan_key IS NULL OR plan_key = '';

-- Now apply the NOT NULL constraints safely
ALTER TABLE agents 
ALTER COLUMN user_id SET NOT NULL,
ALTER COLUMN plan_key SET NOT NULL;

-- Add check constraints
ALTER TABLE agents 
ADD CONSTRAINT agents_plan_key_not_empty 
CHECK (plan_key IS NOT NULL AND plan_key != '');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents (user_id);
CREATE INDEX IF NOT EXISTS idx_agents_plan_key ON agents (plan_key);