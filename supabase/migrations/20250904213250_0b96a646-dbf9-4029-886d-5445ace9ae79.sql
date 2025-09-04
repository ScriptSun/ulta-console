-- Check current constraints
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'email_providers'::regclass;

-- Drop the problematic constraint if it exists
ALTER TABLE email_providers DROP CONSTRAINT IF EXISTS unique_primary_per_customer;

-- Create a partial unique constraint that only applies when is_primary is true
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_email_provider_primary_per_customer 
ON email_providers (customer_id) 
WHERE is_primary = true;