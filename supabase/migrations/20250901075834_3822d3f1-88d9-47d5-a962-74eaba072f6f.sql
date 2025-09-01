-- Create email change requests table
CREATE TABLE email_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_email TEXT NOT NULL,
  new_email TEXT NOT NULL,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reason TEXT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_change_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for email change requests
CREATE POLICY "Users can view email change requests for their team"
ON email_change_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM console_team_members ctm1
    JOIN console_team_members ctm2 ON ctm1.team_id = ctm2.team_id
    WHERE ctm1.admin_id = auth.uid() 
    AND (ctm2.admin_id = email_change_requests.user_id OR ctm2.admin_id = email_change_requests.requested_by)
  )
);

CREATE POLICY "Owners and admins can create email change requests"
ON email_change_requests
FOR INSERT
WITH CHECK (
  requested_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM console_team_members ctm1
    JOIN console_team_members ctm2 ON ctm1.team_id = ctm2.team_id
    WHERE ctm1.admin_id = auth.uid() 
    AND ctm1.role IN ('Owner', 'Admin')
    AND ctm2.admin_id = email_change_requests.user_id
  )
);

CREATE POLICY "Owners and admins can update email change requests"
ON email_change_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM console_team_members ctm1
    JOIN console_team_members ctm2 ON ctm1.team_id = ctm2.team_id
    WHERE ctm1.admin_id = auth.uid() 
    AND ctm1.role IN ('Owner', 'Admin')
    AND (ctm2.admin_id = email_change_requests.user_id OR ctm2.admin_id = email_change_requests.requested_by)
  )
)
WITH CHECK (
  approved_by = auth.uid() OR requested_by = auth.uid()
);

-- Create indexes for performance
CREATE INDEX idx_email_change_requests_user_id ON email_change_requests(user_id);
CREATE INDEX idx_email_change_requests_status ON email_change_requests(status);
CREATE INDEX idx_email_change_requests_requested_by ON email_change_requests(requested_by);