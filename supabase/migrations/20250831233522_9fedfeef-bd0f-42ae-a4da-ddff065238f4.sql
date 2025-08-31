-- Create storage bucket for profile images
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-images', 'profile-images', true);

-- Create RLS policies for profile images
CREATE POLICY "Users can upload their own profile image" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own profile image" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile image" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Profile images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'profile-images');

-- Add avatar_url column to admin_profiles table
ALTER TABLE admin_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create system_settings table for global configurations
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL DEFAULT auth.uid()
);

-- Enable RLS on system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for system_settings
CREATE POLICY "Admins can manage all system_settings" 
ON system_settings 
FOR ALL 
USING (is_admin());

CREATE POLICY "Users can view public system_settings" 
ON system_settings 
FOR SELECT 
USING (is_public = true OR is_admin());

-- Insert default system settings
INSERT INTO system_settings (key, value, description, category, is_public) VALUES
  ('ai_models', '{"enabled_models": ["gpt-4o-mini", "gpt-4o", "claude-3-5-sonnet"], "default_model": "gpt-4o-mini"}', 'Available AI models and default selection', 'ai', true),
  ('rate_limits', '{"requests_per_minute": 60, "requests_per_hour": 1000}', 'API rate limiting configuration', 'api', false),
  ('security', '{"require_2fa": false, "session_timeout": 24}', 'Security configuration settings', 'security', false),
  ('notifications', '{"email_enabled": true, "slack_enabled": false}', 'Notification system configuration', 'notifications', false)
ON CONFLICT (key) DO NOTHING;