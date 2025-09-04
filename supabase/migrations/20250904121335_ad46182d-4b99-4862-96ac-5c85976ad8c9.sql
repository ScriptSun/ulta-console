-- Clear login attempts to remove lockout for testing
DELETE FROM public.login_attempts 
WHERE email = 'elin@ultahost.com';