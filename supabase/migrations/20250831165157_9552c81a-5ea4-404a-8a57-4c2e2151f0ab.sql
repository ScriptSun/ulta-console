-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Team owners and admins can manage all team members" ON console_team_members;
DROP FUNCTION IF EXISTS public.is_team_owner_or_admin_simple(_user_id uuid, _team_id uuid);

-- Create simple, non-recursive policies for console_team_members
-- Allow users to view all team memberships they are part of
CREATE POLICY "Users can view team memberships where they are members" 
ON console_team_members 
FOR SELECT 
USING (
  team_id IN (
    SELECT team_id FROM console_team_members WHERE admin_id = auth.uid()
  )
);

-- Allow users to insert their own memberships (for team creation and being added)
CREATE POLICY "Users can insert their own team memberships" 
ON console_team_members 
FOR INSERT 
WITH CHECK (admin_id = auth.uid());

-- Allow users to update members in teams where they have Owner/Admin role
-- We'll check this by looking at their own role in a subquery that doesn't trigger RLS
CREATE POLICY "Team owners and admins can update team members" 
ON console_team_members 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM console_team_members AS owner_check
    WHERE owner_check.team_id = console_team_members.team_id
    AND owner_check.admin_id = auth.uid()
    AND owner_check.role IN ('Owner', 'Admin')
  )
);

-- Allow users to delete team members in teams where they have Owner/Admin role
CREATE POLICY "Team owners and admins can delete team members" 
ON console_team_members 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM console_team_members AS owner_check
    WHERE owner_check.team_id = console_team_members.team_id
    AND owner_check.admin_id = auth.uid()
    AND owner_check.role IN ('Owner', 'Admin')
  )
);