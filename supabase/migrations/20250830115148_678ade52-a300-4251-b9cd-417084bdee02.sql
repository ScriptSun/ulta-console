-- Add unique key field to subscription_plans table
ALTER TABLE public.subscription_plans 
ADD COLUMN key TEXT UNIQUE NOT NULL DEFAULT '';

-- Update existing plans with proper keys
UPDATE public.subscription_plans 
SET key = 'free_plan' 
WHERE name = 'Free';

UPDATE public.subscription_plans 
SET key = 'starter_plan' 
WHERE name = 'Starter';

UPDATE public.subscription_plans 
SET key = 'pro_plan' 
WHERE name = 'Pro';

UPDATE public.subscription_plans 
SET key = 'premium_plan' 
WHERE name = 'Premium';

-- Remove the default constraint after updating existing records
ALTER TABLE public.subscription_plans 
ALTER COLUMN key DROP DEFAULT;

-- Create index on key field for performance
CREATE INDEX idx_subscription_plans_key ON public.subscription_plans(key);