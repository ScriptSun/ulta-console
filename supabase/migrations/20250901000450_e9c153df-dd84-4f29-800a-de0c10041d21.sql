-- Create system_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for system_settings
CREATE POLICY "Admins can manage all system_settings" ON public.system_settings
FOR ALL USING (is_admin());

CREATE POLICY "Authenticated users can read system_settings" ON public.system_settings
FOR SELECT USING (true);

-- Add update trigger for system_settings
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings if they don't exist
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
('ai_models', '{
  "enabled_models": ["gpt-4o-mini", "gpt-4o", "claude-3-5-sonnet"],
  "default_models": ["gpt-4o-mini", "gpt-4o", "claude-3-5-sonnet"],
  "max_tokens": 4000,
  "temperature": 0.7
}', 'AI model configuration and failover settings'),

('rate_limits', '{
  "requests_per_minute": 60,
  "requests_per_hour": 1000,
  "max_concurrent_requests": 50,
  "timeout_seconds": 30
}', 'API rate limiting and timeout configuration'),

('security', '{
  "require_2fa": false,
  "session_timeout": 24,
  "max_login_attempts": 5,
  "password_min_length": 8
}', 'Security policies and authentication settings'),

('notifications', '{
  "email_enabled": true,
  "slack_enabled": false,
  "telegram_enabled": false,
  "telegram_bot_token": "",
  "telegram_chat_id": "",
  "webhook_url": "",
  "alert_thresholds": {
    "error_rate": 5,
    "response_time": 5000
  },
  "telegram_notifications": {
    "agent_errors": true,
    "system_alerts": true,
    "security_events": false,
    "batch_completions": false
  }
}', 'Notification configuration and external integrations')

ON CONFLICT (setting_key) DO NOTHING;