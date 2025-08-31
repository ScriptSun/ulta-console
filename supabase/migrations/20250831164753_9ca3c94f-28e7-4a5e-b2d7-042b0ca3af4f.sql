-- Fix the function search path security issue
CREATE OR REPLACE FUNCTION public.is_team_owner_or_admin_simple(_user_id uuid, _team_id uuid)
RETURNS boolean
SECURITY DEFINER
STABLE
SET search_path = public
LANGUAGE sql
AS $$
  SELECT EXISTS (
    SELECT 1 FROM console_team_members 
    WHERE team_id = _team_id 
    AND admin_id = _user_id 
    AND role IN ('Owner', 'Admin')
  );
$$;