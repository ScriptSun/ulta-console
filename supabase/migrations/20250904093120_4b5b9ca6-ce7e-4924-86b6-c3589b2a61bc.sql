-- Fix search path for functions created without proper search_path setting
-- This addresses the "Function Search Path Mutable" security warnings

-- Update the existing track_login_attempt_enhanced function to have proper search_path
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