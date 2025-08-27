-- Create a teams table for better organization
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  customer_id UUID NOT NULL,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Enable RLS on teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Create policies for teams
CREATE POLICY "Admins can manage all teams" 
ON public.teams 
FOR ALL 
USING (is_admin());

CREATE POLICY "Owners can manage teams in their customer" 
ON public.teams 
FOR ALL 
USING (customer_id = ANY (get_user_customer_ids()) AND get_user_role_in_customer(customer_id, 'owner'::app_role));

CREATE POLICY "Admins and approvers can view teams" 
ON public.teams 
FOR SELECT 
USING (customer_id = ANY (get_user_customer_ids()) OR is_admin());

-- Create team_members table to link users to teams with specific roles
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'guest',
  invited_by UUID NOT NULL DEFAULT auth.uid(),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (team_id, user_id)
);

-- Enable RLS on team_members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Create policies for team_members
CREATE POLICY "Admins can manage all team_members" 
ON public.team_members 
FOR ALL 
USING (is_admin());

CREATE POLICY "Team owners can manage team members" 
ON public.team_members 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.teams t 
  WHERE t.id = team_members.team_id 
  AND (get_user_role_in_customer(t.customer_id, 'owner'::app_role) OR is_admin())
));

CREATE POLICY "Team admins can manage team members" 
ON public.team_members 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.teams t 
  WHERE t.id = team_members.team_id 
  AND (get_user_role_in_customer(t.customer_id, 'admin'::app_role) OR is_admin())
));

CREATE POLICY "Team members can view other team members" 
ON public.team_members 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.teams t 
  WHERE t.id = team_members.team_id 
  AND t.customer_id = ANY (get_user_customer_ids())
));

-- Create triggers for updated_at
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert a default team for the admin customer
INSERT INTO public.teams (name, description, customer_id, created_by)
VALUES (
  'Admin Team',
  'Default administrative team',
  '22222222-2222-2222-2222-222222222222',
  '24d4d38f-8bc7-4270-984b-3c9f62e14cb1'
) ON CONFLICT DO NOTHING;