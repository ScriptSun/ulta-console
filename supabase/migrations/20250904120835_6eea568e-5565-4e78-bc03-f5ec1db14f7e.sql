-- Clear login attempts again for clean testing
DELETE FROM public.login_attempts 
WHERE email = 'elin@ultahost.com';