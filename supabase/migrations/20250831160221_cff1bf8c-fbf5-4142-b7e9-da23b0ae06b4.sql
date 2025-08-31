-- Create console_pages table
CREATE TABLE public.console_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create console_member_page_perms table
CREATE TABLE public.console_member_page_perms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES console_team_members(id) ON DELETE CASCADE NOT NULL,
  page_key text REFERENCES console_pages(key) ON DELETE CASCADE NOT NULL,
  can_view boolean DEFAULT true,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(member_id, page_key)
);

-- Enable RLS on both tables
ALTER TABLE public.console_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.console_member_page_perms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for console_pages
-- All authenticated users can read pages (they are system-wide)
CREATE POLICY "All authenticated users can read console_pages"
ON public.console_pages
FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for console_member_page_perms
-- Team members can view permissions for their team members
CREATE POLICY "Team members can view page permissions for their team"
ON public.console_member_page_perms
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM console_team_members ctm1
    JOIN console_team_members ctm2 ON ctm1.team_id = ctm2.team_id
    WHERE ctm1.admin_id = auth.uid()
    AND ctm2.id = console_member_page_perms.member_id
  )
);

-- Owner or Admin can manage page permissions for their team members
CREATE POLICY "Owner or Admin can manage page permissions for their team"
ON public.console_member_page_perms
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM console_team_members ctm1
    JOIN console_team_members ctm2 ON ctm1.team_id = ctm2.team_id
    WHERE ctm1.admin_id = auth.uid()
    AND ctm1.role IN ('Owner', 'Admin')
    AND ctm2.id = console_member_page_perms.member_id
  )
);

-- Seed console_pages table with predefined pages
INSERT INTO public.console_pages (key, label) VALUES
  ('widgets', 'Widget Manager'),
  ('teams', 'Team Manager'),
  ('webhooks', 'Webhooks'),
  ('analytics', 'Analytics'),
  ('billing', 'Billing'),
  ('settings', 'Settings');

-- Create trigger for updating updated_at
CREATE TRIGGER update_console_member_page_perms_updated_at
BEFORE UPDATE ON public.console_member_page_perms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();