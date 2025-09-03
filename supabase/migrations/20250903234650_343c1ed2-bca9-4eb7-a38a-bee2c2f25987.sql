-- Check if unique constraint exists on customer_id in email_branding_settings
-- If not, add it to allow proper upsert operations

-- First, ensure only one record per customer exists (clean up duplicates if any)
WITH ranked_settings AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY updated_at DESC) as rn
  FROM email_branding_settings
)
DELETE FROM email_branding_settings 
WHERE id IN (
  SELECT id FROM ranked_settings WHERE rn > 1
);

-- Add unique constraint on customer_id to allow upsert operations
ALTER TABLE email_branding_settings 
ADD CONSTRAINT email_branding_settings_customer_id_key 
UNIQUE (customer_id);