-- Fix specific problematic record and convert to system-wide

-- System-wide customer ID constant
DO $$
DECLARE
    system_customer_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Fix the specific problematic record first
    UPDATE channel_providers 
    SET updated_by = created_by
    WHERE id = 'a8b5baf3-cdf7-4990-96c6-cf81e95b0b69' AND updated_by IS NULL;
    
    -- Fix any other records with null updated_by by using created_by or system_customer_id
    UPDATE channel_providers 
    SET updated_by = CASE 
        WHEN created_by IS NOT NULL THEN created_by 
        ELSE system_customer_id 
    END
    WHERE updated_by IS NULL;
    
    UPDATE email_providers 
    SET updated_by = CASE 
        WHEN created_by IS NOT NULL THEN created_by 
        ELSE system_customer_id 
    END
    WHERE updated_by IS NULL;
    
    -- Now safely migrate to system-wide
    UPDATE email_providers 
    SET customer_id = system_customer_id, updated_at = now()
    WHERE customer_id != system_customer_id;
    
    UPDATE channel_providers 
    SET customer_id = system_customer_id, updated_at = now()
    WHERE customer_id != system_customer_id;
    
    -- Create system-wide notification settings if not exists
    INSERT INTO notification_settings (customer_id, failover_order, domain_health, created_by, updated_by)
    VALUES (system_customer_id, '[]'::jsonb, '{}'::jsonb, system_customer_id, system_customer_id)
    ON CONFLICT (customer_id) DO NOTHING;
END $$;

-- Update RLS policies for system-wide notification management

-- Drop and recreate email_providers policies
DROP POLICY IF EXISTS "Users can manage email providers in their customer" ON email_providers;
CREATE POLICY "Admins can manage system email providers" ON email_providers
FOR ALL TO authenticated
USING (is_admin() OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
))
WITH CHECK (is_admin() OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
));

-- Drop and recreate channel_providers policies  
DROP POLICY IF EXISTS "Users can manage channel providers in their customer" ON channel_providers;
CREATE POLICY "Admins can manage system channel providers" ON channel_providers
FOR ALL TO authenticated
USING (is_admin() OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
))
WITH CHECK (is_admin() OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
));

-- Drop and recreate notification_settings policies
DROP POLICY IF EXISTS "Users can manage notification settings in their customer" ON notification_settings;
CREATE POLICY "Admins can manage system notification settings" ON notification_settings
FOR ALL TO authenticated
USING (is_admin() OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
))
WITH CHECK (is_admin() OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
));