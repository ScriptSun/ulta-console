-- Create console_member_widget_scopes table
CREATE TABLE public.console_member_widget_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES console_team_members(id) ON DELETE CASCADE NOT NULL,
  widget_id uuid REFERENCES widgets(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(member_id, widget_id)
);

-- Enable RLS
ALTER TABLE public.console_member_widget_scopes ENABLE ROW LEVEL SECURITY;

-- Team members can view widget scopes for their team members
CREATE POLICY "Team members can view widget scopes for their team"
ON public.console_member_widget_scopes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM console_team_members ctm1
    JOIN console_team_members ctm2 ON ctm1.team_id = ctm2.team_id
    WHERE ctm1.admin_id = auth.uid()
    AND ctm2.id = console_member_widget_scopes.member_id
  )
);

-- Owner or Admin can manage widget scopes for their team members
CREATE POLICY "Owner or Admin can manage widget scopes for their team"
ON public.console_member_widget_scopes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM console_team_members ctm1
    JOIN console_team_members ctm2 ON ctm1.team_id = ctm2.team_id
    WHERE ctm1.admin_id = auth.uid()
    AND ctm1.role IN ('Owner', 'Admin')
    AND ctm2.id = console_member_widget_scopes.member_id
  )
);

-- Create trigger for updating updated_at
CREATE TRIGGER update_console_member_widget_scopes_updated_at
BEFORE UPDATE ON public.console_member_widget_scopes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();