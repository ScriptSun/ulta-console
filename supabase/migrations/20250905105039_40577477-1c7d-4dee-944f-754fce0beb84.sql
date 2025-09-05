-- Delete problematic record and clean up data

-- Delete the problematic record that keeps causing issues
DELETE FROM channel_providers 
WHERE id = 'a8b5baf3-cdf7-4990-96c6-cf81e95b0b69';

-- Now safely migrate all remaining records to system-wide customer ID
UPDATE email_providers 
SET customer_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE customer_id != '00000000-0000-0000-0000-000000000001'::uuid;

UPDATE channel_providers 
SET customer_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE customer_id != '00000000-0000-0000-0000-000000000001'::uuid;

-- Remove any remaining duplicates (keep most recent for each type)
WITH ranked_channels AS (
    SELECT *,
        ROW_NUMBER() OVER (
            PARTITION BY customer_id, type 
            ORDER BY updated_at DESC, created_at DESC
        ) as rn
    FROM channel_providers
    WHERE customer_id = '00000000-0000-0000-0000-000000000001'::uuid
),
duplicates_to_delete AS (
    SELECT id FROM ranked_channels WHERE rn > 1
)
DELETE FROM channel_providers 
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- Create system-wide notification settings if not exists
INSERT INTO notification_settings (
    customer_id, 
    failover_order, 
    domain_health, 
    created_by, 
    updated_by
)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid, 
    '[]'::jsonb, 
    '[]'::jsonb, 
    '00000000-0000-0000-0000-000000000001'::uuid, 
    '00000000-0000-0000-0000-000000000001'::uuid
)
ON CONFLICT (customer_id) DO NOTHING;