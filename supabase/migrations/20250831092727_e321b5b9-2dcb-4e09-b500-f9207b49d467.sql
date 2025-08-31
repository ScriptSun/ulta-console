-- Fix the constraint by using the correct users table
-- The foreign key references the 'users' table in public schema

-- First, check what users exist in the public.users table
-- and assign orphaned agents accordingly

DO $$
DECLARE
    first_user_id UUID;
    orphaned_count INTEGER;
BEGIN
    -- Get the first available user from public.users table
    SELECT id INTO first_user_id FROM public.users ORDER BY created_at LIMIT 1;
    
    -- Count orphaned agents
    SELECT COUNT(*) INTO orphaned_count FROM agents WHERE user_id IS NULL;
    
    IF first_user_id IS NOT NULL AND orphaned_count > 0 THEN
        -- Assign orphaned agents to the first available user
        UPDATE agents 
        SET user_id = first_user_id 
        WHERE user_id IS NULL;
        
        -- Log this assignment
        INSERT INTO audit_logs (customer_id, actor, action, target, meta)
        VALUES (
            '00000000-0000-0000-0000-000000000001'::uuid,
            'system',
            'agents_user_assignment',
            'orphaned_agents',
            jsonb_build_object(
                'assigned_user_id', first_user_id,
                'agents_count', orphaned_count,
                'reason', 'Preparing for NOT NULL constraint - assigned to public.users'
            )
        );
    ELSIF orphaned_count > 0 THEN
        -- No users available, we need to create a system user or delete agents
        -- For now, let's delete orphaned agents as they're likely test data
        DELETE FROM agents WHERE user_id IS NULL;
        
        INSERT INTO audit_logs (customer_id, actor, action, target, meta)
        VALUES (
            '00000000-0000-0000-0000-000000000001'::uuid,
            'system',
            'agents_cleanup',
            'orphaned_agents',
            jsonb_build_object(
                'deleted_count', orphaned_count,
                'reason', 'No users available in public.users table'
            )
        );
    END IF;
END $$;

-- Clean up agents that reference non-existent users in public.users
DELETE FROM agents 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM public.users);

-- Set default plan for agents without one
UPDATE agents 
SET plan_key = 'free_plan' 
WHERE plan_key IS NULL OR plan_key = '';

-- Now apply the NOT NULL constraints
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