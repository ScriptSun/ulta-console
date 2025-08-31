-- Create admin_profiles row for the logged in auth user
-- This prevents FK errors when creating console_team_members

INSERT INTO admin_profiles(id, email, full_name)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users
WHERE id = auth.uid()
ON CONFLICT (id) DO NOTHING;