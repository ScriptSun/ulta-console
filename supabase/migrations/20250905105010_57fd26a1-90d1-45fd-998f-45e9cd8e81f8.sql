-- Fix the specific problematic record and complete migration

-- First fix the specific record with null updated_by
UPDATE channel_providers 
SET updated_by = '5bb0dbc1-471d-4ac6-9be8-f851a59ef3fc'
WHERE id = 'a8b5baf3-cdf7-4990-96c6-cf81e95b0b69' AND updated_by IS NULL;

-- Fix any other null updated_by values
UPDATE channel_providers 
SET updated_by = created_by
WHERE updated_by IS NULL AND created_by IS NOT NULL;

UPDATE email_providers 
SET updated_by = created_by
WHERE updated_by IS NULL AND created_by IS NOT NULL;

-- Now safely migrate all records to system-wide customer ID
UPDATE email_providers 
SET customer_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE customer_id != '00000000-0000-0000-0000-000000000001'::uuid;

UPDATE channel_providers 
SET customer_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE customer_id != '00000000-0000-0000-0000-000000000001'::uuid;

-- Remove duplicates (keep most recent for each type)
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

-- Remove email provider duplicates
WITH ranked_emails AS (
    SELECT *,
        ROW_NUMBER() OVER (
            PARTITION BY customer_id, type 
            ORDER BY updated_at DESC, created_at DESC
        ) as rn
    FROM email_providers
    WHERE customer_id = '00000000-0000-0000-0000-000000000001'::uuid
),
duplicates_to_delete AS (
    SELECT id FROM ranked_emails WHERE rn > 1
)
DELETE FROM email_providers 
WHERE id IN (SELECT id FROM duplicates_to_delete);