-- Reset security status for user elin@ultahost.com
UPDATE public.user_security_status 
SET 
  is_banned = false,
  ban_reason = null,
  banned_at = null,
  failed_login_count = 0,
  updated_at = now()
WHERE email = 'elin@ultahost.com' OR user_id = '5bb0dbc1-471d-4ac6-9be8-f851a59ef3fc';

-- Create a function to reset user security status for debugging
CREATE OR REPLACE FUNCTION public.reset_user_security_status(_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_security_status 
  SET 
    is_banned = false,
    ban_reason = null,
    banned_at = null,
    failed_login_count = 0,
    updated_at = now()
  WHERE email = _email;
  
  RETURN FOUND;
END;
$$;