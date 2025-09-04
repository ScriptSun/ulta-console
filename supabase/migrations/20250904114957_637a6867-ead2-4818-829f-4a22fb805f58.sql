-- Clear failed login attempts for elin@ultahost.com for testing
DELETE FROM public.login_attempts 
WHERE email = 'elin@ultahost.com' 
AND success = false;