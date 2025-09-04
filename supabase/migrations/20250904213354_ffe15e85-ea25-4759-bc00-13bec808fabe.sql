-- Drop the problematic constraint if it exists
ALTER TABLE email_providers DROP CONSTRAINT IF EXISTS unique_primary_per_customer;

-- Create a partial unique index that only applies when is_primary is true
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_provider_primary_per_customer 
ON email_providers (customer_id) 
WHERE is_primary = true;