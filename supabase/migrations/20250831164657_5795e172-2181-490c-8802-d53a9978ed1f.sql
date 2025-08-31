-- Drop all existing RLS policies on console_team_members that cause infinite recursion
DROP POLICY IF EXISTS "Owner or Admin can manage members for their team" ON console_team_members;
DROP POLICY IF EXISTS "Owner or Admin can add members to their team" ON console_team_members;
DROP POLICY IF EXISTS "Owner or Admin can update members in their team" ON console_team_members;
DROP POLICY IF EXISTS "Owner or Admin can remove members from their team" ON console_team_members;
DROP POLICY IF EXISTS "Team members can view other members in their team" ON console_team_members;

-- Create simple, non-recursive RLS policies
-- Allow users to view their own memberships
CREATE POLICY "Users can view their own team memberships" 
ON console_team_members 
FOR SELECT 
USING (admin_id = auth.uid());

-- Allow users to insert their own memberships (for creating teams or being added)
CREATE POLICY "Users can insert their own team memberships" 
ON console_team_members 
FOR INSERT 
WITH CHECK (admin_id = auth.uid());

-- Allow team owners and admins to manage team members (using a simple function check)
CREATE OR REPLACE FUNCTION public.is_team_owner_or_admin_simple(_user_id uuid, _team_id uuid)
RETURNS boolean
SECURITY DEFINER
STABLE
LANGUAGE sql
AS $$
  SELECT EXISTS (
    SELECT 1 FROM console_team_members 
    WHERE team_id = _team_id 
    AND admin_id = _user_id 
    AND role IN ('Owner', 'Admin')
  );
$$;

-- Policy for team owners/admins to manage all team members
CREATE POLICY "Team owners and admins can manage all team members" 
ON console_team_members 
FOR ALL
USING (is_team_owner_or_admin_simple(auth.uid(), team_id))
WITH CHECK (is_team_owner_or_admin_simple(auth.uid(), team_id));