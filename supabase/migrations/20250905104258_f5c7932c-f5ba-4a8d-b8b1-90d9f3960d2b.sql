-- Convert notification system from per-customer to system-wide (more careful approach)

-- System-wide customer ID constant
DO $$
DECLARE
    system_customer_id UUID := '00000000-0000-0000-0000-000000000001';
    current_user_id UUID := auth.uid();
BEGIN
    -- If no authenticated user, use system_customer_id as fallback
    IF current_user_id IS NULL THEN
        current_user_id := system_customer_id;
    END IF;
    
    -- Migrate existing email_providers to system-wide with proper updated_by
    UPDATE email_providers 
    SET 
        customer_id = system_customer_id,
        updated_by = COALESCE(updated_by, created_by, current_user_id),
        updated_at = now()
    WHERE customer_id != system_customer_id;
    
    -- Migrate existing channel_providers to system-wide with proper updated_by
    UPDATE channel_providers 
    SET 
        customer_id = system_customer_id,
        updated_by = COALESCE(updated_by, created_by, current_user_id),
        updated_at = now()
    WHERE customer_id != system_customer_id;
    
    -- Migrate existing notification_settings to system-wide
    INSERT INTO notification_settings (customer_id, failover_order, domain_health, created_by, updated_by)
    VALUES (system_customer_id, '[]'::jsonb, '{}'::jsonb, current_user_id, current_user_id)
    ON CONFLICT (customer_id) DO NOTHING;
END $$;

-- Update RLS policies for system-wide notification management

-- Drop existing policies for email_providers
DROP POLICY IF EXISTS "Users can manage email providers in their customer" ON email_providers;

-- Create new system-wide policies for email_providers
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

-- Drop existing policies for channel_providers  
DROP POLICY IF EXISTS "Users can manage channel providers in their customer" ON channel_providers;

-- Create new system-wide policies for channel_providers
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

-- Drop existing policies for notification_settings
DROP POLICY IF EXISTS "Users can manage notification settings in their customer" ON notification_settings;

-- Create new system-wide policies for notification_settings
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