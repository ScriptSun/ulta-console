-- Create storage bucket for profile images
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for profile images
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can upload their own profile image'
  ) THEN
    CREATE POLICY "Users can upload their own profile image" 
    ON storage.objects 
    FOR INSERT 
    WITH CHECK (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can update their own profile image'
  ) THEN
    CREATE POLICY "Users can update their own profile image" 
    ON storage.objects 
    FOR UPDATE 
    USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can delete their own profile image'
  ) THEN
    CREATE POLICY "Users can delete their own profile image" 
    ON storage.objects 
    FOR DELETE 
    USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Profile images are publicly accessible'
  ) THEN
    CREATE POLICY "Profile images are publicly accessible" 
    ON storage.objects 
    FOR SELECT 
    USING (bucket_id = 'profile-images');
  END IF;
END $$;

-- Add avatar_url column to admin_profiles table if it doesn't exist
ALTER TABLE admin_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create user_preferences table for notifications and settings
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_alerts BOOLEAN NOT NULL DEFAULT true,
  system_updates BOOLEAN NOT NULL DEFAULT true,
  security_alerts BOOLEAN NOT NULL DEFAULT true,
  agent_notifications BOOLEAN NOT NULL DEFAULT false,
  theme_preference TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_preferences
CREATE POLICY "Users can view their own preferences" 
ON user_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
ON user_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" 
ON user_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create user_sessions table for tracking login activity
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_end TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT,
  device_type TEXT,
  location TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_sessions
CREATE POLICY "Users can view their own sessions" 
ON user_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create function to track user sessions
CREATE OR REPLACE FUNCTION public.track_user_session(
  user_uuid UUID,
  client_ip INET DEFAULT NULL,
  client_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_id UUID;
BEGIN
  INSERT INTO public.user_sessions (
    user_id,
    ip_address,
    user_agent,
    device_type,
    location
  ) VALUES (
    user_uuid,
    client_ip,
    client_user_agent,
    CASE 
      WHEN client_user_agent ILIKE '%mobile%' THEN 'Mobile'
      WHEN client_user_agent ILIKE '%tablet%' THEN 'Tablet'
      ELSE 'Desktop'
    END,
    'Unknown' -- In real implementation, you'd use IP geolocation
  ) RETURNING id INTO session_id;
  
  RETURN session_id;
END;
$$;