-- Drop ALL existing policies on console_team_members to start fresh
DROP POLICY IF EXISTS "Owner or Admin can add team members" ON public.console_team_members;
DROP POLICY IF EXISTS "Owner or Admin can remove team members" ON public.console_team_members;
DROP POLICY IF EXISTS "Team members can read team membership" ON public.console_team_members;
DROP POLICY IF EXISTS "Owners and Admins can insert team members" ON public.console_team_members;
DROP POLICY IF EXISTS "Owners and Admins can update team members" ON public.console_team_members;
DROP POLICY IF EXISTS "Owners and Admins can delete team members" ON public.console_team_members;
DROP POLICY IF EXISTS "Team members can view their team memberships" ON public.console_team_members;

-- Create clean, non-recursive policies using security definer functions
CREATE POLICY "Users can view their own team memberships" 
ON public.console_team_members 
FOR SELECT 
USING (admin_id = auth.uid());

CREATE POLICY "Team owners can manage all team members" 
ON public.console_team_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.console_teams ct 
    WHERE ct.id = console_team_members.team_id 
    AND ct.created_by = auth.uid()
  )
);

CREATE POLICY "System can insert first team member" 
ON public.console_team_members 
FOR INSERT 
WITH CHECK (admin_id = auth.uid());