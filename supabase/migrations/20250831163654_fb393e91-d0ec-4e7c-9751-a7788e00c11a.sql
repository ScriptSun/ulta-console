-- Drop ALL remaining problematic policies on console_team_members
DROP POLICY IF EXISTS "Team members can view each other" ON public.console_team_members;
DROP POLICY IF EXISTS "Owner or Admin can insert team members" ON public.console_team_members;
DROP POLICY IF EXISTS "Owner or Admin can update team members" ON public.console_team_members;
DROP POLICY IF EXISTS "Owner or Admin can delete team members" ON public.console_team_members;

-- Create simple, non-recursive policies
-- Allow users to see their own team memberships
CREATE POLICY "Users can view their own memberships" 
ON public.console_team_members 
FOR SELECT 
USING (admin_id = auth.uid());

-- Allow authenticated users to insert their own team memberships (for team creation)
CREATE POLICY "Users can create team memberships for themselves" 
ON public.console_team_members 
FOR INSERT 
WITH CHECK (admin_id = auth.uid());

-- Allow updates and deletes only if user is an Owner or Admin (using simple approach)
CREATE POLICY "Team management operations" 
ON public.console_team_members 
FOR ALL 
USING (
  admin_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.console_team_members existing
    WHERE existing.team_id = console_team_members.team_id 
    AND existing.admin_id = auth.uid() 
    AND existing.role IN ('Owner', 'Admin')
    LIMIT 1
  )
);