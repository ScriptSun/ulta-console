-- Drop and recreate the get_security_settings function with enhanced return type
DROP FUNCTION IF EXISTS public.get_security_settings();

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

-- Recreate the get_security_settings function with enhanced return type
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