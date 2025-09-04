-- Clear all login attempts for elin@ultahost.com to reset testing
DELETE FROM public.login_attempts 
WHERE email = 'elin@ultahost.com';