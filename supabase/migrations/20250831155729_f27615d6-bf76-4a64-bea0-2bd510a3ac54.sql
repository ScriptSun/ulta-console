-- Create console_invites table
CREATE TABLE public.console_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES console_teams(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('Owner','Admin','Developer','Analyst','ReadOnly')),
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  status text CHECK (status IN ('pending','accepted','canceled')) NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES admin_profiles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.console_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for console_invites
-- Team members can view invites for their team
CREATE POLICY "Team members can view invites for their team"
ON public.console_invites
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM console_team_members ctm
    WHERE ctm.team_id = console_invites.team_id
    AND ctm.admin_id = auth.uid()
  )
);

-- Owner or Admin can create invites for their team
CREATE POLICY "Owner or Admin can create invites for their team"
ON public.console_invites
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM console_team_members ctm
    WHERE ctm.team_id = console_invites.team_id
    AND ctm.admin_id = auth.uid()
    AND ctm.role IN ('Owner', 'Admin')
  )
  AND created_by = auth.uid()
);

-- Owner or Admin can update invites for their team (for canceling)
CREATE POLICY "Owner or Admin can update invites for their team"
ON public.console_invites
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM console_team_members ctm
    WHERE ctm.team_id = console_invites.team_id
    AND ctm.admin_id = auth.uid()
    AND ctm.role IN ('Owner', 'Admin')
  )
);

-- System can update invites for acceptance
CREATE POLICY "System can update invites for acceptance"
ON public.console_invites
FOR UPDATE
USING (true);