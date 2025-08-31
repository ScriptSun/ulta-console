-- Drop the problematic recursive policy I just created
DROP POLICY IF EXISTS "Team management operations" ON public.console_team_members;

-- Create completely non-recursive policies
-- Users can always view their own memberships
CREATE POLICY "View own memberships" 
ON public.console_team_members 
FOR SELECT 
USING (admin_id = auth.uid());

-- Users can create their own team memberships (needed for team creation)
CREATE POLICY "Create own memberships" 
ON public.console_team_members 
FOR INSERT 
WITH CHECK (admin_id = auth.uid());

-- Users can update their own memberships
CREATE POLICY "Update own memberships" 
ON public.console_team_members 
FOR UPDATE 
USING (admin_id = auth.uid());

-- Users can delete their own memberships
CREATE POLICY "Delete own memberships" 
ON public.console_team_members 
FOR DELETE 
USING (admin_id = auth.uid());