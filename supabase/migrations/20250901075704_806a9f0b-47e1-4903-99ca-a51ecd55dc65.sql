-- Update agents with invalid plan keys to use existing plans
UPDATE agents 
SET plan_key = CASE 
    WHEN plan_key IN ('enterprise_plan', 'ultimate_plan') THEN 'premium_plan'
    WHEN plan_key IN ('business_plan', 'scale_plan') THEN 'pro_plan'
    ELSE plan_key
END
WHERE plan_key NOT IN (SELECT slug FROM subscription_plans);

-- Make user_id NOT NULL if it isn't already
ALTER TABLE agents ALTER COLUMN user_id SET NOT NULL;

-- Add unique constraint to subscription_plans.slug first
ALTER TABLE subscription_plans ADD CONSTRAINT unique_subscription_plans_slug UNIQUE (slug);

-- Add foreign key constraint to ensure plan_key exists in subscription_plans
ALTER TABLE agents 
ADD CONSTRAINT fk_agents_plan_key 
FOREIGN KEY (plan_key) REFERENCES subscription_plans(slug);

-- Add check constraint to ensure valid plan assignment
ALTER TABLE agents 
ADD CONSTRAINT chk_agents_valid_assignment 
CHECK (user_id IS NOT NULL AND plan_key IS NOT NULL);