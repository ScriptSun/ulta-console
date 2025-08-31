-- Handle existing agents without user_id or plan_key before applying constraints

-- First, let's see if we have any users to assign orphaned agents to
-- If we have users, assign orphaned agents to the first user
-- If no users exist, we'll delete the orphaned agents as they're likely test data

DO $$
DECLARE
    first_user_id UUID;
    orphaned_count INTEGER;
BEGIN
    -- Get the first available user
    SELECT id INTO first_user_id FROM auth.users ORDER BY created_at LIMIT 1;
    
    -- Count orphaned agents
    SELECT COUNT(*) INTO orphaned_count FROM agents WHERE user_id IS NULL;
    
    IF first_user_id IS NOT NULL AND orphaned_count > 0 THEN
        -- Assign orphaned agents to the first user
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
                'reason', 'Preparing for NOT NULL constraint'
            )
        );
    ELSIF orphaned_count > 0 THEN
        -- No users available, delete orphaned agents (they're likely test data)
        DELETE FROM agents WHERE user_id IS NULL;
        
        -- Log this deletion
        INSERT INTO audit_logs (customer_id, actor, action, target, meta)
        VALUES (
            '00000000-0000-0000-0000-000000000001'::uuid,
            'system',
            'agents_cleanup',
            'orphaned_agents',
            jsonb_build_object(
                'deleted_count', orphaned_count,
                'reason', 'No users available for assignment'
            )
        );
    END IF;
END $$;

-- Set default plan for agents without one
UPDATE agents 
SET plan_key = 'free_plan' 
WHERE plan_key IS NULL OR plan_key = '';

-- Now apply the NOT NULL constraints
ALTER TABLE agents 
ALTER COLUMN user_id SET NOT NULL,
ALTER COLUMN plan_key SET NOT NULL;

-- Add check constraint to ensure plan_key is not empty
ALTER TABLE agents 
ADD CONSTRAINT agents_plan_key_not_empty 
CHECK (plan_key IS NOT NULL AND plan_key != '');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents (user_id);
CREATE INDEX IF NOT EXISTS idx_agents_plan_key ON agents (plan_key);

-- Log the successful constraint application
INSERT INTO audit_logs (customer_id, actor, action, target, meta)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'system',
    'schema_update',
    'agents_table_constraints',
    jsonb_build_object(
        'constraints_added', ARRAY['user_id_not_null', 'plan_key_not_null', 'plan_key_not_empty_check'],
        'description', 'Successfully enforced user and plan requirements for agent creation',
        'timestamp', now()
    )
);