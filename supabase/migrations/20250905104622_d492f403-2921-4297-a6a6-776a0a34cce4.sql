-- Create simplified system-wide notification policies

-- Update RLS policies for email_providers to be system-wide
DROP POLICY IF EXISTS "Users can manage email providers in their customer" ON email_providers;
DROP POLICY IF EXISTS "Admins can manage system email providers" ON email_providers;

CREATE POLICY "System admins can manage email providers" ON email_providers
FOR ALL TO authenticated
USING (
    is_admin() OR 
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'owner')
    )
)
WITH CHECK (
    is_admin() OR 
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'owner')
    )
);

-- Update RLS policies for channel_providers to be system-wide  
DROP POLICY IF EXISTS "Users can manage channel providers in their customer" ON channel_providers;
DROP POLICY IF EXISTS "Admins can manage system channel providers" ON channel_providers;

CREATE POLICY "System admins can manage channel providers" ON channel_providers
FOR ALL TO authenticated
USING (
    is_admin() OR 
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'owner')
    )
)
WITH CHECK (
    is_admin() OR 
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'owner')
    )
);

-- Update RLS policies for notification_settings to be system-wide
DROP POLICY IF EXISTS "Users can manage notification settings in their customer" ON notification_settings;
DROP POLICY IF EXISTS "Admins can manage system notification settings" ON notification_settings;

CREATE POLICY "System admins can manage notification settings" ON notification_settings
FOR ALL TO authenticated
USING (
    is_admin() OR 
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'owner')
    )
)
WITH CHECK (
    is_admin() OR 
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'owner')
    )
);

-- Create system-wide notification settings record if it doesn't exist
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