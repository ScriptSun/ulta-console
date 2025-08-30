-- Add unique key field to subscription_plans table (nullable first)
ALTER TABLE public.subscription_plans 
ADD COLUMN key TEXT;

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

-- Now make it NOT NULL and UNIQUE after all records have values
ALTER TABLE public.subscription_plans 
ALTER COLUMN key SET NOT NULL;

ALTER TABLE public.subscription_plans 
ADD CONSTRAINT subscription_plans_key_unique UNIQUE (key);

-- Create index on key field for performance
CREATE INDEX idx_subscription_plans_key ON public.subscription_plans(key);