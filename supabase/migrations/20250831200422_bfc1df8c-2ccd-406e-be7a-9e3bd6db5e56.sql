-- Fix infinite recursion in console_team_members policies
-- Drop all existing policies first
DROP POLICY IF EXISTS "Create own memberships" ON console_team_members;
DROP POLICY IF EXISTS "Delete own memberships" ON console_team_members;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON console_team_members;
DROP POLICY IF EXISTS "Enable insert for users creating their own membership" ON console_team_members;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON console_team_members;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON console_team_members;
DROP POLICY IF EXISTS "Owner or Admin can add team members" ON console_team_members;
DROP POLICY IF EXISTS "Owner or Admin can remove team members" ON console_team_members;
DROP POLICY IF EXISTS "Owners and Admins can delete team members" ON console_team_members;
DROP POLICY IF EXISTS "Owners and Admins can insert team members" ON console_team_members;
DROP POLICY IF EXISTS "Owners and Admins can update team members" ON console_team_members;
DROP POLICY IF EXISTS "Team members can read team membership" ON console_team_members;
DROP POLICY IF EXISTS "Team members can view their team memberships" ON console_team_members;
DROP POLICY IF EXISTS "Team owners and admins can manage all team members" ON console_team_members;
DROP POLICY IF EXISTS "Update own memberships" ON console_team_members;
DROP POLICY IF EXISTS "Users can create team memberships for themselves" ON console_team_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON console_team_members;
DROP POLICY IF EXISTS "View own memberships" ON console_team_members;
DROP POLICY IF EXISTS "member can self insert on create" ON console_team_members;
DROP POLICY IF EXISTS "owner or admin can manage members" ON console_team_members;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view their own memberships"
ON console_team_members FOR SELECT
USING (admin_id = auth.uid());

CREATE POLICY "Users can insert their own membership"
ON console_team_members FOR INSERT
WITH CHECK (admin_id = auth.uid());

CREATE POLICY "System can manage team memberships"
ON console_team_members FOR ALL
USING (true)
WITH CHECK (true);

-- Ensure admin profile exists for elin@ultahost.com
INSERT INTO admin_profiles (id, email, full_name)
VALUES (
  '5bb0dbc1-471d-4ac6-9be8-f851a59ef3fc',
  'elin@ultahost.com',
  'elin'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(admin_profiles.full_name, EXCLUDED.full_name);

-- Create a default team if none exists
INSERT INTO console_teams (id, name)
VALUES (
  gen_random_uuid(),
  'Default Team'
)
ON CONFLICT DO NOTHING;

-- Make elin an Owner of the first available team
INSERT INTO console_team_members (
  team_id,
  admin_id,
  role
)
SELECT 
  (SELECT id FROM console_teams LIMIT 1),
  '5bb0dbc1-471d-4ac6-9be8-f851a59ef3fc',
  'Owner'
WHERE NOT EXISTS (
  SELECT 1 FROM console_team_members 
  WHERE admin_id = '5bb0dbc1-471d-4ac6-9be8-f851a59ef3fc'
);