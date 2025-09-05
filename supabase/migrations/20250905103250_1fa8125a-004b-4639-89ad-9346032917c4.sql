-- Fix the channel providers constraint issue

-- Drop the global unique constraint that's causing the problem
ALTER TABLE channel_providers DROP CONSTRAINT IF EXISTS unique_channel_provider_type_global;

-- Also drop any other conflicting constraints
ALTER TABLE channel_providers DROP CONSTRAINT IF EXISTS channel_providers_type_key;
ALTER TABLE channel_providers DROP CONSTRAINT IF EXISTS channel_providers_name_key;

-- Ensure we have the correct per-customer constraint
ALTER TABLE channel_providers DROP CONSTRAINT IF EXISTS channel_providers_customer_name_unique;
ALTER TABLE channel_providers ADD CONSTRAINT channel_providers_customer_type_unique 
  UNIQUE (customer_id, type);

-- Clean up any existing duplicates by customer and type (keep the most recent)
WITH ranked_providers AS (
  SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY customer_id, type 
      ORDER BY updated_at DESC, created_at DESC
    ) as rn
  FROM channel_providers
),
duplicates_to_delete AS (
  SELECT id FROM ranked_providers WHERE rn > 1
)
DELETE FROM channel_providers 
WHERE id IN (SELECT id FROM duplicates_to_delete);