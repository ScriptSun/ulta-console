-- Add RLS policies for console_team_members to support team creation and management

-- Allow inserting yourself into a team you just created
CREATE POLICY "member can self insert on create"
ON console_team_members
FOR INSERT
TO authenticated
WITH CHECK (admin_id = auth.uid());

-- Allow Owners and Admins to manage members of their teams
CREATE POLICY "owner or admin can manage members"
ON console_team_members
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM console_team_members m
    WHERE m.team_id = console_team_members.team_id
    AND m.admin_id = auth.uid()
    AND m.role IN ('Owner','Admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM console_team_members m
    WHERE m.team_id = console_team_members.team_id
    AND m.admin_id = auth.uid()
    AND m.role IN ('Owner','Admin')
  )
);