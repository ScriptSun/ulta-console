-- Create user security tracking tables
CREATE TABLE IF NOT EXISTS public.user_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  ip_address INET,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  success BOOLEAN DEFAULT false,
  user_agent TEXT
);

CREATE INDEX idx_user_login_attempts_user_id ON public.user_login_attempts(user_id);
CREATE INDEX idx_user_login_attempts_email ON public.user_login_attempts(email);
CREATE INDEX idx_user_login_attempts_attempted_at ON public.user_login_attempts(attempted_at);

-- Create user security status table
CREATE TABLE IF NOT EXISTS public.user_security_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  banned_at TIMESTAMP WITH TIME ZONE,
  banned_by UUID REFERENCES auth.users(id),
  failed_login_count INTEGER DEFAULT 0,
  last_failed_login TIMESTAMP WITH TIME ZONE,
  last_successful_login TIMESTAMP WITH TIME ZONE,
  session_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_user_security_status_user_id ON public.user_security_status(user_id);
CREATE INDEX idx_user_security_status_email ON public.user_security_status(email);

-- Enable RLS
ALTER TABLE public.user_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_security_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_login_attempts
CREATE POLICY "Admins can view all login attempts" ON public.user_login_attempts
  FOR SELECT USING (is_admin());

CREATE POLICY "System can insert login attempts" ON public.user_login_attempts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own login attempts" ON public.user_login_attempts
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for user_security_status  
CREATE POLICY "Admins can manage all security status" ON public.user_security_status
  FOR ALL USING (is_admin());

CREATE POLICY "System can manage security status" ON public.user_security_status
  FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Users can view their own security status" ON public.user_security_status
  FOR SELECT USING (auth.uid() = user_id);

-- Function to check if user is banned
CREATE OR REPLACE FUNCTION public.is_user_banned(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_security_status 
    WHERE user_id = _user_id AND is_banned = true
  );
END;
$$;

-- Function to get security settings
CREATE OR REPLACE FUNCTION public.get_security_settings()
RETURNS TABLE(
  max_login_attempts INTEGER,
  session_timeout_hours INTEGER,
  require_2fa BOOLEAN,
  password_min_length INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings_data JSONB;
BEGIN
  SELECT setting_value INTO settings_data
  FROM public.system_settings 
  WHERE setting_key = 'security';
  
  IF settings_data IS NULL THEN
    -- Return defaults
    RETURN QUERY SELECT 5, 24, false, 8;
  ELSE
    RETURN QUERY SELECT 
      COALESCE((settings_data->>'max_login_attempts')::INTEGER, 5),
      COALESCE((settings_data->>'session_timeout')::INTEGER, 24),
      COALESCE((settings_data->>'require_2fa')::BOOLEAN, false),
      COALESCE((settings_data->>'password_min_length')::INTEGER, 8);
  END IF;
END;
$$;

-- Function to track login attempts and handle banning
CREATE OR REPLACE FUNCTION public.track_login_attempt(
  _email TEXT,
  _user_id UUID DEFAULT NULL,
  _success BOOLEAN DEFAULT false,
  _ip_address INET DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL
)
RETURNS TABLE(
  is_banned BOOLEAN,
  attempts_remaining INTEGER,
  ban_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  security_config RECORD;
  current_attempts INTEGER := 0;
  user_status RECORD;
BEGIN
  -- Get security settings
  SELECT * INTO security_config FROM get_security_settings();
  
  -- Insert login attempt
  INSERT INTO public.user_login_attempts (user_id, email, ip_address, attempted_at, success, user_agent)
  VALUES (_user_id, _email, _ip_address, now(), _success, _user_agent);
  
  -- If login was successful, reset failed attempts
  IF _success THEN
    UPDATE public.user_security_status 
    SET 
      failed_login_count = 0,
      last_successful_login = now(),
      session_expires_at = now() + (security_config.session_timeout_hours || ' hours')::INTERVAL,
      updated_at = now()
    WHERE user_id = _user_id;
    
    -- Create record if doesn't exist
    INSERT INTO public.user_security_status (user_id, email, last_successful_login, session_expires_at)
    VALUES (_user_id, _email, now(), now() + (security_config.session_timeout_hours || ' hours')::INTERVAL)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN QUERY SELECT false, security_config.max_login_attempts, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Handle failed login
  -- Get or create user security status
  SELECT * INTO user_status FROM public.user_security_status WHERE user_id = _user_id OR email = _email;
  
  IF user_status.id IS NULL THEN
    INSERT INTO public.user_security_status (user_id, email, failed_login_count, last_failed_login)
    VALUES (_user_id, _email, 1, now())
    RETURNING * INTO user_status;
    current_attempts := 1;
  ELSE
    current_attempts := user_status.failed_login_count + 1;
    UPDATE public.user_security_status 
    SET 
      failed_login_count = current_attempts,
      last_failed_login = now(),
      updated_at = now()
    WHERE id = user_status.id;
  END IF;
  
  -- Check if user should be banned
  IF current_attempts >= security_config.max_login_attempts AND NOT user_status.is_banned THEN
    UPDATE public.user_security_status 
    SET 
      is_banned = true,
      ban_reason = 'Exceeded maximum login attempts (' || security_config.max_login_attempts || ')',
      banned_at = now(),
      updated_at = now()
    WHERE id = user_status.id;
    
    RETURN QUERY SELECT true, 0, 'Account banned due to too many failed login attempts'::TEXT;
  ELSE
    RETURN QUERY SELECT 
      user_status.is_banned, 
      GREATEST(0, security_config.max_login_attempts - current_attempts),
      user_status.ban_reason;
  END IF;
END;
$$;

-- Function to check if session is expired
CREATE OR REPLACE FUNCTION public.is_session_expired(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_expires TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT session_expires_at INTO session_expires
  FROM public.user_security_status 
  WHERE user_id = _user_id;
  
  IF session_expires IS NULL THEN
    RETURN false; -- No session tracking yet
  END IF;
  
  RETURN session_expires < now();
END;
$$;

-- Function to unban user (admin only)
CREATE OR REPLACE FUNCTION public.unban_user(
  _user_id UUID,
  _admin_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can unban users';
  END IF;
  
  UPDATE public.user_security_status 
  SET 
    is_banned = false,
    ban_reason = NULL,
    banned_at = NULL,
    banned_by = NULL,
    failed_login_count = 0,
    updated_at = now()
  WHERE user_id = _user_id;
  
  RETURN FOUND;
END;
$$;

-- Function to extend session
CREATE OR REPLACE FUNCTION public.extend_user_session(_user_id UUID)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  security_config RECORD;
  new_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get security settings
  SELECT * INTO security_config FROM get_security_settings();
  
  new_expiry := now() + (security_config.session_timeout_hours || ' hours')::INTERVAL;
  
  UPDATE public.user_security_status 
  SET 
    session_expires_at = new_expiry,
    updated_at = now()
  WHERE user_id = _user_id;
  
  RETURN new_expiry;
END;
$$;