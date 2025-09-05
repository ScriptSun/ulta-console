-- Fix remaining data migration issues

DO $$
DECLARE
    system_customer_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- First, update any records that still have old customer IDs
    UPDATE email_providers 
    SET 
        customer_id = system_customer_id,
        updated_by = COALESCE(updated_by, created_by, system_customer_id),
        updated_at = now()
    WHERE customer_id != system_customer_id;
    
    UPDATE channel_providers 
    SET 
        customer_id = system_customer_id,
        updated_by = COALESCE(updated_by, created_by, system_customer_id),
        updated_at = now()
    WHERE customer_id != system_customer_id;
    
    -- Remove duplicate channel providers (keep the most recent one for each type)
    WITH ranked_channels AS (
        SELECT *,
            ROW_NUMBER() OVER (
                PARTITION BY customer_id, type 
                ORDER BY updated_at DESC, created_at DESC
            ) as rn
        FROM channel_providers
        WHERE customer_id = system_customer_id
    ),
    duplicates_to_delete AS (
        SELECT id FROM ranked_channels WHERE rn > 1
    )
    DELETE FROM channel_providers 
    WHERE id IN (SELECT id FROM duplicates_to_delete);
    
    -- Remove duplicate email providers (keep the most recent one for each type)
    WITH ranked_emails AS (
        SELECT *,
            ROW_NUMBER() OVER (
                PARTITION BY customer_id, type 
                ORDER BY updated_at DESC, created_at DESC
            ) as rn
        FROM email_providers
        WHERE customer_id = system_customer_id
    ),
    duplicates_to_delete AS (
        SELECT id FROM ranked_emails WHERE rn > 1
    )
    DELETE FROM email_providers 
    WHERE id IN (SELECT id FROM duplicates_to_delete);
    
    -- Ensure system-wide notification settings exist
    INSERT INTO notification_settings (
        customer_id, 
        failover_order, 
        domain_health, 
        created_by, 
        updated_by
    )
    VALUES (
        system_customer_id, 
        '[]'::jsonb, 
        '[]'::jsonb, 
        system_customer_id, 
        system_customer_id
    )
    ON CONFLICT (customer_id) DO NOTHING;
    
END $$;