-- Fix infinite recursion in console_team_members RLS policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Team members can view each other" ON public.console_team_members;
DROP POLICY IF EXISTS "Owner or Admin can update team members" ON public.console_team_members;
DROP POLICY IF EXISTS "Owner or Admin can delete team members" ON public.console_team_members;
DROP POLICY IF EXISTS "Owner or Admin can insert team members" ON public.console_team_members;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.console_team_members 
    WHERE admin_id = _user_id AND team_id = _team_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_owner_or_admin(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.console_team_members 
    WHERE admin_id = _user_id 
    AND team_id = _team_id 
    AND role IN ('Owner', 'Admin')
  );
$$;

-- Create new RLS policies using security definer functions
CREATE POLICY "Team members can view each other" 
ON public.console_team_members 
FOR SELECT 
USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Owner or Admin can insert team members" 
ON public.console_team_members 
FOR INSERT 
WITH CHECK (public.is_team_owner_or_admin(auth.uid(), team_id));

CREATE POLICY "Owner or Admin can update team members" 
ON public.console_team_members 
FOR UPDATE 
USING (public.is_team_owner_or_admin(auth.uid(), team_id));

CREATE POLICY "Owner or Admin can delete team members" 
ON public.console_team_members 
FOR DELETE 
USING (public.is_team_owner_or_admin(auth.uid(), team_id));