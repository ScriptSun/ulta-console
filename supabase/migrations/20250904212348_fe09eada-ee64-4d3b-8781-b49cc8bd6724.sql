-- Fix the email providers constraint to allow multiple customers to have the same provider type
-- Drop the problematic global unique constraint
ALTER TABLE public.email_providers DROP CONSTRAINT IF EXISTS unique_email_provider_type_global;

-- Add a proper constraint that allows each customer to have one of each provider type
ALTER TABLE public.email_providers ADD CONSTRAINT unique_email_provider_type_per_customer UNIQUE (customer_id, type);

-- Also ensure the primary constraint works correctly with boolean values
-- The existing constraint should work, but let's make sure it handles false values correctly
DROP INDEX IF EXISTS idx_primary_per_customer;
CREATE UNIQUE INDEX idx_primary_per_customer ON public.email_providers (customer_id) WHERE is_primary = true;