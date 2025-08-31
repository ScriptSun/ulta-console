-- Create auth_login_events table for tracking login activity
CREATE TABLE IF NOT EXISTS auth_login_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ip INET,
    geo_country TEXT,
    geo_city TEXT,
    status TEXT NOT NULL DEFAULT 'success', -- 'success', 'failed'
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE auth_login_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view login events in their tenant" ON auth_login_events;
DROP POLICY IF EXISTS "System can insert login events" ON auth_login_events;

-- Policies for auth_login_events
CREATE POLICY "Users can view login events in their tenant"
ON auth_login_events FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.customer_id = ANY (get_user_customer_ids())
    ) OR is_admin()
);

CREATE POLICY "System can insert login events"
ON auth_login_events FOR INSERT
WITH CHECK (true);

-- Create system_settings table for storing AI model pricing
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME zone DEFAULT now(),
    updated_at TIMESTAMP WITH TIME zone DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage system_settings" ON system_settings;
DROP POLICY IF EXISTS "Authenticated users can read system_settings" ON system_settings;

CREATE POLICY "Admins can manage system_settings"
ON system_settings FOR ALL
USING (is_admin());

CREATE POLICY "Authenticated users can read system_settings"
ON system_settings FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Insert default AI model pricing
INSERT INTO system_settings (key, value, description) VALUES 
(
    'ai_model_pricing',
    '{
        "gpt-5-2025-08-07": {
            "prompt_rate": 0.000003,
            "completion_rate": 0.000015
        },
        "gpt-5-mini-2025-08-07": {
            "prompt_rate": 0.0000015,
            "completion_rate": 0.0000006
        },
        "gpt-5-nano-2025-08-07": {
            "prompt_rate": 0.0000003,
            "completion_rate": 0.0000006
        },
        "gpt-4.1-2025-04-14": {
            "prompt_rate": 0.00001,
            "completion_rate": 0.00003
        },
        "gpt-4o-mini": {
            "prompt_rate": 0.000000375,
            "completion_rate": 0.0000015
        },
        "gpt-4o": {
            "prompt_rate": 0.000005,
            "completion_rate": 0.000015
        }
    }',
    'AI model pricing rates for prompt and completion tokens'
)
ON CONFLICT (key) DO NOTHING;

-- Add token tracking columns to agent_usage if not exists
ALTER TABLE agent_usage ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER DEFAULT 0;
ALTER TABLE agent_usage ADD COLUMN IF NOT EXISTS completion_tokens INTEGER DEFAULT 0;
ALTER TABLE agent_usage ADD COLUMN IF NOT EXISTS model TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_auth_login_events_occurred_at ON auth_login_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_auth_login_events_user_id ON auth_login_events(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_login_events_status ON auth_login_events(status);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_created_at ON user_subscriptions(created_at);

CREATE INDEX IF NOT EXISTS idx_agent_usage_date ON agent_usage(usage_date);
CREATE INDEX IF NOT EXISTS idx_agent_usage_agent_type ON agent_usage(agent_id, usage_type);

CREATE INDEX IF NOT EXISTS idx_batch_runs_status ON batch_runs(status);
CREATE INDEX IF NOT EXISTS idx_batch_runs_created_at ON batch_runs(created_at);