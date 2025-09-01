-- Ensure the user elin@ultahost.com has admin role and can see everything
-- First check if user exists in admin_profiles, if not create it
INSERT INTO public.admin_profiles (id, email, full_name)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users 
WHERE email = 'elin@ultahost.com'
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email,
  full_name = COALESCE(admin_profiles.full_name, EXCLUDED.full_name);

-- Assign admin role to user with customer ID (this is the main tenant)
INSERT INTO public.user_roles (user_id, customer_id, role)
SELECT 
  u.id,
  '22222222-2222-2222-2222-222222222222'::uuid, -- Main customer/tenant ID
  'admin'::app_role
FROM auth.users u
WHERE u.email = 'elin@ultahost.com'
ON CONFLICT (user_id, customer_id, role) DO NOTHING;

-- Also create a customer record if it doesn't exist
INSERT INTO public.customers (id, name, created_at)
VALUES (
  '22222222-2222-2222-2222-222222222222'::uuid,
  'Main Organization',
  now()
) ON CONFLICT (id) DO NOTHING;