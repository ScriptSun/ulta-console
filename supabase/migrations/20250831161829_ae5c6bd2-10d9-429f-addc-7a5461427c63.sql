-- Update RLS policies for admin_profiles to ensure proper team-based access
DROP POLICY IF EXISTS "Team members can view each other's profiles" ON admin_profiles;
DROP POLICY IF EXISTS "Users can view their own admin profile" ON admin_profiles;
DROP POLICY IF EXISTS "Users can insert their own admin profile" ON admin_profiles;
DROP POLICY IF EXISTS "Users can update their own admin profile" ON admin_profiles;

-- Admin profiles: visible to owner and team Owners/Admins
CREATE POLICY "Owners can view their own profile" ON admin_profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Team Owners and Admins can view member profiles" ON admin_profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM console_team_members ctm1
    JOIN console_team_members ctm2 ON ctm1.team_id = ctm2.team_id
    WHERE ctm1.admin_id = auth.uid() 
    AND ctm1.role IN ('Owner', 'Admin')
    AND ctm2.admin_id = admin_profiles.id
  )
);

CREATE POLICY "Users can insert their own profile" ON admin_profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON admin_profiles
FOR UPDATE USING (auth.uid() = id);

-- Update console_team_members policies for stricter control
DROP POLICY IF EXISTS "Team members can view roles for their team" ON console_team_members;
DROP POLICY IF EXISTS "Owner or Admin can manage team member roles" ON console_team_members;
DROP POLICY IF EXISTS "Owner or Admin can remove team members" ON console_team_members;

CREATE POLICY "Team members can view their team" ON console_team_members
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM console_team_members ctm
    WHERE ctm.team_id = console_team_members.team_id
    AND ctm.admin_id = auth.uid()
  )
);

CREATE POLICY "Owner or Admin can insert team members" ON console_team_members
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM console_team_members ctm
    WHERE ctm.team_id = console_team_members.team_id
    AND ctm.admin_id = auth.uid()
    AND ctm.role IN ('Owner', 'Admin')
  )
);

CREATE POLICY "Owner or Admin can update team members" ON console_team_members
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM console_team_members ctm
    WHERE ctm.team_id = console_team_members.team_id
    AND ctm.admin_id = auth.uid()
    AND ctm.role IN ('Owner', 'Admin')
  )
);

CREATE POLICY "Owner or Admin can delete team members" ON console_team_members
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM console_team_members ctm
    WHERE ctm.team_id = console_team_members.team_id
    AND ctm.admin_id = auth.uid()
    AND ctm.role IN ('Owner', 'Admin')
  )
);

-- Update console_member_page_perms policies
DROP POLICY IF EXISTS "Owner or Admin can manage page permissions for their team" ON console_member_page_perms;
DROP POLICY IF EXISTS "Team members can view page permissions for their team" ON console_member_page_perms;

CREATE POLICY "Members can view their own page permissions" ON console_member_page_perms
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM console_team_members ctm
    WHERE ctm.id = console_member_page_perms.member_id
    AND ctm.admin_id = auth.uid()
  )
);

CREATE POLICY "Team Owners and Admins can view all page permissions" ON console_member_page_perms
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM console_team_members ctm1
    JOIN console_team_members ctm2 ON ctm1.team_id = ctm2.team_id
    WHERE ctm1.admin_id = auth.uid()
    AND ctm1.role IN ('Owner', 'Admin')
    AND ctm2.id = console_member_page_perms.member_id
  )
);

CREATE POLICY "Only Owners and Admins can write page permissions" ON console_member_page_perms
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM console_team_members ctm1
    JOIN console_team_members ctm2 ON ctm1.team_id = ctm2.team_id
    WHERE ctm1.admin_id = auth.uid()
    AND ctm1.role IN ('Owner', 'Admin')
    AND ctm2.id = console_member_page_perms.member_id
  )
);

-- Update console_member_widget_scopes policies
DROP POLICY IF EXISTS "Owner or Admin can manage widget scopes for their team" ON console_member_widget_scopes;
DROP POLICY IF EXISTS "Team members can view widget scopes for their team" ON console_member_widget_scopes;

CREATE POLICY "Members can view their own widget scopes" ON console_member_widget_scopes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM console_team_members ctm
    WHERE ctm.id = console_member_widget_scopes.member_id
    AND ctm.admin_id = auth.uid()
  )
);

CREATE POLICY "Team Owners and Admins can view all widget scopes" ON console_member_widget_scopes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM console_team_members ctm1
    JOIN console_team_members ctm2 ON ctm1.team_id = ctm2.team_id
    WHERE ctm1.admin_id = auth.uid()
    AND ctm1.role IN ('Owner', 'Admin')
    AND ctm2.id = console_member_widget_scopes.member_id
  )
);

CREATE POLICY "Only Owners and Admins can write widget scopes" ON console_member_widget_scopes
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM console_team_members ctm1
    JOIN console_team_members ctm2 ON ctm1.team_id = ctm2.team_id
    WHERE ctm1.admin_id = auth.uid()
    AND ctm1.role IN ('Owner', 'Admin')
    AND ctm2.id = console_member_widget_scopes.member_id
  )
);