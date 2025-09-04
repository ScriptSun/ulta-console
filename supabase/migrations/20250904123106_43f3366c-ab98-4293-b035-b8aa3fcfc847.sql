-- Update the validate_password_policy function to include number requirement
CREATE OR REPLACE FUNCTION public.validate_password_policy(_password text)
 RETURNS TABLE(valid boolean, errors text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- Check for numbers if required
  IF (SELECT COALESCE((setting_value->>'passwordRequireNumbers')::boolean, true) FROM system_settings WHERE setting_key = 'security') 
     AND NOT (_password ~ '[0-9]') THEN
    error_list := array_append(error_list, 'Password must contain at least one number');
  END IF;
  
  RETURN QUERY SELECT (array_length(error_list, 1) IS NULL), error_list;
END;
$function$;