-- First, let's check what users exist and create owner access
-- Get the user ID for elin@ultahost.com from auth.users and create admin profile and owner role

-- Insert admin profile for elin@ultahost.com (in case it doesn't exist)
INSERT INTO public.admin_profiles (id, email, full_name)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users 
WHERE email = 'elin@ultahost.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(admin_profiles.full_name, EXCLUDED.full_name);

-- Create owner role for elin@ultahost.com with default customer
INSERT INTO public.user_roles (user_id, customer_id, role)
SELECT au.id, '22222222-2222-2222-2222-222222222222'::uuid, 'owner'::app_role
FROM auth.users au
WHERE au.email = 'elin@ultahost.com'
ON CONFLICT (user_id, customer_id, role) DO NOTHING;

-- Also create admin role as backup
INSERT INTO public.user_roles (user_id, customer_id, role)
SELECT au.id, '22222222-2222-2222-2222-222222222222'::uuid, 'admin'::app_role
FROM auth.users au
WHERE au.email = 'elin@ultahost.com'
ON CONFLICT (user_id, customer_id, role) DO NOTHING;

-- Verify the setup
SELECT 
  au.email,
  ur.role,
  ur.customer_id,
  ap.full_name
FROM auth.users au
LEFT JOIN public.user_roles ur ON au.id = ur.user_id
LEFT JOIN public.admin_profiles ap ON au.id = ap.id
WHERE au.email = 'elin@ultahost.com';