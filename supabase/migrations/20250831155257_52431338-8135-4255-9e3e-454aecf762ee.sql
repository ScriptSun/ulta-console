-- Create admin_profiles table for staff
CREATE TABLE public.admin_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now()
);

-- Create console_teams table
CREATE TABLE public.console_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create console_team_members table
CREATE TABLE public.console_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.console_teams(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES public.admin_profiles(id) ON DELETE CASCADE,
  role text CHECK (role IN ('Owner','Admin','Developer','Analyst','ReadOnly')) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(team_id, admin_id)
);

-- Enable RLS on all three tables
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.console_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.console_team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_profiles
-- Users can view their own profile and profiles of team members in the same team
CREATE POLICY "Users can view their own admin profile" 
ON public.admin_profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Team members can view each other's profiles" 
ON public.admin_profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.console_team_members ctm1
    JOIN public.console_team_members ctm2 ON ctm1.team_id = ctm2.team_id
    WHERE ctm1.admin_id = auth.uid() AND ctm2.admin_id = admin_profiles.id
  )
);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own admin profile" 
ON public.admin_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own admin profile" 
ON public.admin_profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- RLS Policies for console_teams
-- Team members can read their team
CREATE POLICY "Team members can read their team" 
ON public.console_teams 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.console_team_members ctm
    WHERE ctm.team_id = console_teams.id AND ctm.admin_id = auth.uid()
  )
);

-- Only Owner can update team name
CREATE POLICY "Only Owner can update team" 
ON public.console_teams 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.console_team_members ctm
    WHERE ctm.team_id = console_teams.id 
    AND ctm.admin_id = auth.uid() 
    AND ctm.role = 'Owner'
  )
);

-- RLS Policies for console_team_members
-- Team members can read their team's membership
CREATE POLICY "Team members can read team membership" 
ON public.console_team_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.console_team_members ctm
    WHERE ctm.team_id = console_team_members.team_id AND ctm.admin_id = auth.uid()
  )
);

-- Only Owner or Admin can insert new members
CREATE POLICY "Owner or Admin can add team members" 
ON public.console_team_members 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.console_team_members ctm
    WHERE ctm.team_id = console_team_members.team_id 
    AND ctm.admin_id = auth.uid() 
    AND ctm.role IN ('Owner', 'Admin')
  )
);

-- Only Owner or Admin can update members
CREATE POLICY "Owner or Admin can update team members" 
ON public.console_team_members 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.console_team_members ctm
    WHERE ctm.team_id = console_team_members.team_id 
    AND ctm.admin_id = auth.uid() 
    AND ctm.role IN ('Owner', 'Admin')
  )
);

-- Only Owner or Admin can delete members
CREATE POLICY "Owner or Admin can remove team members" 
ON public.console_team_members 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.console_team_members ctm
    WHERE ctm.team_id = console_team_members.team_id 
    AND ctm.admin_id = auth.uid() 
    AND ctm.role IN ('Owner', 'Admin')
  )
);

-- Function to handle new admin user creation
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Trigger to create admin profile when auth user is created
CREATE TRIGGER on_auth_admin_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_admin_user();