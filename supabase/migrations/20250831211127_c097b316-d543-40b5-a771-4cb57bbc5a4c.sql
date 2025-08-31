-- Create enhanced widget management system with real-time updates

-- Add version tracking to widgets table
ALTER TABLE widgets ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE widgets ADD COLUMN IF NOT EXISTS last_deployed_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE widgets ADD COLUMN IF NOT EXISTS auto_update_enabled BOOLEAN DEFAULT true;
ALTER TABLE widgets ADD COLUMN IF NOT EXISTS deployment_status TEXT DEFAULT 'active';

-- Create widget deployments table for tracking updates
CREATE TABLE IF NOT EXISTS widget_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_id UUID NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    config JSONB NOT NULL,
    deployed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deployment_type TEXT DEFAULT 'manual', -- 'manual', 'auto', 'scheduled'
    deployed_by UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'deployed', -- 'deployed', 'failed', 'rollback'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create widget analytics for enhanced tracking
CREATE TABLE IF NOT EXISTS widget_analytics_enhanced (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_id UUID REFERENCES widgets(id) ON DELETE CASCADE,
    site_key TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'load', 'interaction', 'message', 'error', 'config_update'
    event_data JSONB DEFAULT '{}',
    user_session TEXT,
    user_agent TEXT,
    ip_address INET,
    page_url TEXT,
    referrer TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create real-time configuration updates table
CREATE TABLE IF NOT EXISTS widget_config_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_id UUID NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
    old_config JSONB,
    new_config JSONB NOT NULL,
    update_type TEXT DEFAULT 'theme', -- 'theme', 'settings', 'deployment'
    updated_by UUID REFERENCES auth.users(id),
    auto_deployed BOOLEAN DEFAULT false,
    deployed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE widget_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_analytics_enhanced ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_config_updates ENABLE ROW LEVEL SECURITY;

-- Policies for widget_deployments
CREATE POLICY "Users can view deployments for their widgets" 
ON widget_deployments FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM widgets w
        WHERE w.id = widget_deployments.widget_id
        AND w.customer_id IN (
            SELECT customer_id FROM user_roles WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can create deployments for their widgets"
ON widget_deployments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM widgets w
        WHERE w.id = widget_deployments.widget_id
        AND w.customer_id IN (
            SELECT customer_id FROM user_roles WHERE user_id = auth.uid()
        )
    )
);

-- Policies for widget_analytics_enhanced
CREATE POLICY "Users can view analytics for their widgets"
ON widget_analytics_enhanced FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM widgets w
        WHERE w.id = widget_analytics_enhanced.widget_id
        AND w.customer_id IN (
            SELECT customer_id FROM user_roles WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Anyone can insert analytics events"
ON widget_analytics_enhanced FOR INSERT
WITH CHECK (true);

-- Policies for widget_config_updates
CREATE POLICY "Users can view config updates for their widgets"
ON widget_config_updates FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM widgets w
        WHERE w.id = widget_config_updates.widget_id
        AND w.customer_id IN (
            SELECT customer_id FROM user_roles WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can create config updates for their widgets"
ON widget_config_updates FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM widgets w
        WHERE w.id = widget_config_updates.widget_id
        AND w.customer_id IN (
            SELECT customer_id FROM user_roles WHERE user_id = auth.uid()
        )
    )
);

-- Function to automatically deploy widget updates
CREATE OR REPLACE FUNCTION auto_deploy_widget_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only auto-deploy if auto_update_enabled is true
    IF NEW.auto_update_enabled = true THEN
        -- Create deployment record
        INSERT INTO widget_deployments (
            widget_id,
            version,
            config,
            deployment_type,
            deployed_by,
            status,
            notes
        ) VALUES (
            NEW.id,
            NEW.version,
            NEW.theme,
            'auto',
            NEW.updated_by,
            'deployed',
            'Auto-deployed widget configuration update'
        );

        -- Update last deployed timestamp
        NEW.last_deployed_at = now();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-deployment
DROP TRIGGER IF EXISTS trigger_auto_deploy_widget_update ON widgets;
CREATE TRIGGER trigger_auto_deploy_widget_update
    BEFORE UPDATE ON widgets
    FOR EACH ROW
    WHEN (OLD.theme IS DISTINCT FROM NEW.theme OR OLD.scope IS DISTINCT FROM NEW.scope)
    EXECUTE FUNCTION auto_deploy_widget_update();

-- Function to track widget configuration changes
CREATE OR REPLACE FUNCTION track_widget_config_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Track configuration changes
    INSERT INTO widget_config_updates (
        widget_id,
        old_config,
        new_config,
        update_type,
        updated_by,
        auto_deployed
    ) VALUES (
        NEW.id,
        OLD.theme,
        NEW.theme,
        CASE 
            WHEN OLD.theme IS DISTINCT FROM NEW.theme THEN 'theme'
            WHEN OLD.scope IS DISTINCT FROM NEW.scope THEN 'settings'
            ELSE 'general'
        END,
        NEW.updated_by,
        NEW.auto_update_enabled
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for change tracking
DROP TRIGGER IF EXISTS trigger_track_widget_config_changes ON widgets;
CREATE TRIGGER trigger_track_widget_config_changes
    AFTER UPDATE ON widgets
    FOR EACH ROW
    WHEN (OLD.theme IS DISTINCT FROM NEW.theme OR OLD.scope IS DISTINCT FROM NEW.scope)
    EXECUTE FUNCTION track_widget_config_changes();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_widget_deployments_widget_id ON widget_deployments(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_deployments_deployed_at ON widget_deployments(deployed_at);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_enhanced_widget_id ON widget_analytics_enhanced(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_enhanced_timestamp ON widget_analytics_enhanced(timestamp);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_enhanced_event_type ON widget_analytics_enhanced(event_type);
CREATE INDEX IF NOT EXISTS idx_widget_config_updates_widget_id ON widget_config_updates(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_config_updates_created_at ON widget_config_updates(created_at);

-- Update existing widgets to have version 1 if null
UPDATE widgets SET version = 1 WHERE version IS NULL;
UPDATE widgets SET auto_update_enabled = true WHERE auto_update_enabled IS NULL;
UPDATE widgets SET deployment_status = 'active' WHERE deployment_status IS NULL;