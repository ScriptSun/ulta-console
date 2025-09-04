-- Ensure system_settings table has security configuration
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES (
  'security',
  '{
    "twoFactorRequired": false,
    "sessionTimeout": 24,
    "passwordMinLength": 8,
    "passwordRequireSpecialChars": true,
    "maxFailedLogins": 5,
    "lockoutDuration": 30
  }'::jsonb,
  'Security and authentication settings'
) ON CONFLICT (setting_key) DO NOTHING;

-- Create function to update security settings
CREATE OR REPLACE FUNCTION public.update_security_settings(_settings jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admins can update security settings
  IF NOT is_admin() THEN
    RETURN FALSE;
  END IF;
  
  -- Update security settings
  INSERT INTO public.system_settings (setting_key, setting_value, description)
  VALUES ('security', _settings, 'Security and authentication settings')
  ON CONFLICT (setting_key) 
  DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = now();
  
  RETURN TRUE;
END;
$$;

-- Enhanced login attempt tracking with dynamic security settings
CREATE OR REPLACE FUNCTION public.track_login_attempt_enhanced(
  _email text, 
  _user_id uuid DEFAULT NULL::uuid, 
  _success boolean DEFAULT false, 
  _ip_address inet DEFAULT NULL::inet, 
  _user_agent text DEFAULT NULL::text
)
RETURNS TABLE(
  is_banned boolean, 
  attempts_remaining integer, 
  ban_reason text,
  lockout_until timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  security_config RECORD;
  current_attempts INTEGER := 0;
  user_status RECORD;
  lockout_until_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current security settings
  SELECT * INTO security_config FROM get_security_settings();
  
  -- Insert login attempt
  INSERT INTO public.user_login_attempts (user_id, email, ip_address, attempted_at, success, user_agent)
  VALUES (_user_id, _email, _ip_address, now(), _success, _user_agent);
  
  -- If login was successful, reset failed attempts and extend session
  IF _success THEN
    UPDATE public.user_security_status 
    SET 
      failed_login_count = 0,
      last_successful_login = now(),
      session_expires_at = now() + (security_config.session_timeout_hours || ' hours')::INTERVAL,
      is_banned = false,
      ban_reason = null,
      banned_at = null,
      updated_at = now()
    WHERE user_id = _user_id OR email = _email;
    
    -- Create record if doesn't exist
    INSERT INTO public.user_security_status (user_id, email, last_successful_login, session_expires_at)
    VALUES (_user_id, _email, now(), now() + (security_config.session_timeout_hours || ' hours')::INTERVAL)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN QUERY SELECT false, security_config.max_login_attempts, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;
  
  -- Handle failed login
  SELECT * INTO user_status FROM public.user_security_status WHERE user_id = _user_id OR email = _email;
  
  IF user_status.id IS NULL THEN
    INSERT INTO public.user_security_status (user_id, email, failed_login_count, last_failed_login)
    VALUES (_user_id, _email, 1, now())
    RETURNING * INTO user_status;
    current_attempts := 1;
  ELSE
    current_attempts := user_status.failed_login_count + 1;
    
    -- Check if user should be banned
    IF current_attempts >= security_config.max_login_attempts THEN
      lockout_until_time := now() + (security_config.lockout_duration || ' minutes')::INTERVAL;
      
      UPDATE public.user_security_status 
      SET 
        failed_login_count = current_attempts,
        last_failed_login = now(),
        is_banned = true,
        ban_reason = 'Too many failed login attempts',
        banned_at = now(),
        banned_until = lockout_until_time,
        updated_at = now()
      WHERE id = user_status.id;
      
      RETURN QUERY SELECT true, 0, 'Account temporarily locked due to too many failed login attempts', lockout_until_time;
      RETURN;
    ELSE
      UPDATE public.user_security_status 
      SET 
        failed_login_count = current_attempts,
        last_failed_login = now(),
        updated_at = now()
      WHERE id = user_status.id;
    END IF;
  END IF;
  
  RETURN QUERY SELECT false, security_config.max_login_attempts - current_attempts, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE;
END;
$$;

-- Function to validate password against security policies
CREATE OR REPLACE FUNCTION public.validate_password_policy(_password text)
RETURNS TABLE(valid boolean, errors text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  security_config RECORD;
  error_list TEXT[] := '{}';
BEGIN
  SELECT * INTO security_config FROM get_security_settings();
  
  -- Check minimum length
  IF length(_password) < security_config.password_min_length THEN
    error_list := array_append(error_list, 'Password must be at least ' || security_config.password_min_length || ' characters long');
  END IF;
  
  -- Check for special characters if required
  IF security_config.require_special_chars AND NOT (_password ~ '[^a-zA-Z0-9]') THEN
    error_list := array_append(error_list, 'Password must contain at least one special character');
  END IF;
  
  RETURN QUERY SELECT (array_length(error_list, 1) IS NULL), error_list;
END;
$$;

-- Update the get_security_settings function to read from system_settings
CREATE OR REPLACE FUNCTION public.get_security_settings()
RETURNS TABLE(
  max_login_attempts integer, 
  session_timeout_hours integer, 
  require_2fa boolean, 
  password_min_length integer,
  require_special_chars boolean,
  lockout_duration integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  settings_data JSONB;
BEGIN
  SELECT setting_value INTO settings_data
  FROM public.system_settings 
  WHERE setting_key = 'security';
  
  IF settings_data IS NULL THEN
    -- Return defaults
    RETURN QUERY SELECT 5, 24, false, 8, true, 30;
  ELSE
    RETURN QUERY SELECT 
      COALESCE((settings_data->>'maxFailedLogins')::INTEGER, 5),
      COALESCE((settings_data->>'sessionTimeout')::INTEGER, 24),
      COALESCE((settings_data->>'twoFactorRequired')::BOOLEAN, false),
      COALESCE((settings_data->>'passwordMinLength')::INTEGER, 8),
      COALESCE((settings_data->>'passwordRequireSpecialChars')::BOOLEAN, true),
      COALESCE((settings_data->>'lockoutDuration')::INTEGER, 30);
  END IF;
END;
$$;