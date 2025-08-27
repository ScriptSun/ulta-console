-- Create command_confirmations table
CREATE TABLE public.command_confirmations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  command_id UUID NOT NULL,
  policy_id UUID NOT NULL REFERENCES public.command_policies(id) ON DELETE CASCADE,
  command_text TEXT NOT NULL,
  params JSONB,
  agent_id TEXT NOT NULL,
  requested_by UUID NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  customer_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on command_confirmations
ALTER TABLE public.command_confirmations ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger for command_confirmations
CREATE TRIGGER update_command_confirmations_updated_at
BEFORE UPDATE ON public.command_confirmations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update RLS policies for command_policies with specific role permissions
DROP POLICY IF EXISTS "Editors can insert command_policies in tenant" ON public.command_policies;
DROP POLICY IF EXISTS "Editors can update command_policies in tenant" ON public.command_policies;

-- Viewers can read command_policies in tenant
CREATE POLICY "Viewers can read command_policies in tenant" 
ON public.command_policies 
FOR SELECT 
USING (customer_id = ANY (get_user_customer_ids()) OR is_admin());

-- Editors can insert command_policies in tenant
CREATE POLICY "Editors can insert command_policies in tenant" 
ON public.command_policies 
FOR INSERT 
WITH CHECK (
  (get_user_role_in_customer(customer_id, 'editor'::app_role) OR 
   get_user_role_in_customer(customer_id, 'approver'::app_role) OR 
   is_admin()) AND 
  customer_id = ANY (get_user_customer_ids()) AND 
  created_by = auth.uid() AND
  active = false  -- Only approvers and admins can create active policies
);

-- Editors can update command_policies in tenant (but cannot activate)
CREATE POLICY "Editors can update command_policies in tenant" 
ON public.command_policies 
FOR UPDATE 
USING (
  customer_id = ANY (get_user_customer_ids()) AND 
  (get_user_role_in_customer(customer_id, 'editor'::app_role) OR 
   get_user_role_in_customer(customer_id, 'approver'::app_role) OR 
   is_admin())
)
WITH CHECK (
  updated_by = auth.uid() AND
  (
    -- Editors can update but not activate
    (get_user_role_in_customer(customer_id, 'editor'::app_role) AND active = false) OR
    -- Approvers and admins can activate
    (get_user_role_in_customer(customer_id, 'approver'::app_role) OR is_admin())
  )
);

-- Approvers can activate policies
CREATE POLICY "Approvers can activate command_policies in tenant" 
ON public.command_policies 
FOR UPDATE 
USING (
  customer_id = ANY (get_user_customer_ids()) AND 
  (get_user_role_in_customer(customer_id, 'approver'::app_role) OR is_admin())
)
WITH CHECK (
  updated_by = auth.uid()
);

-- RLS policies for command_confirmations
CREATE POLICY "Admins can manage all command_confirmations" 
ON public.command_confirmations 
FOR ALL 
USING (is_admin());

CREATE POLICY "Viewers can read command_confirmations in tenant" 
ON public.command_confirmations 
FOR SELECT 
USING (customer_id = ANY (get_user_customer_ids()) OR is_admin());

CREATE POLICY "Users can insert command_confirmations in tenant" 
ON public.command_confirmations 
FOR INSERT 
WITH CHECK (
  customer_id = ANY (get_user_customer_ids()) AND
  requested_by = auth.uid()
);

CREATE POLICY "Approvers can update command_confirmations in tenant" 
ON public.command_confirmations 
FOR UPDATE 
USING (
  customer_id = ANY (get_user_customer_ids()) AND 
  (get_user_role_in_customer(customer_id, 'approver'::app_role) OR is_admin())
)
WITH CHECK (
  approved_by = auth.uid() OR is_admin()
);

CREATE POLICY "Default deny command_confirmations" 
ON public.command_confirmations 
FOR ALL 
USING (false);

-- Additional indexes for performance
CREATE INDEX idx_command_confirmations_customer_id ON public.command_confirmations(customer_id);
CREATE INDEX idx_command_confirmations_policy_id ON public.command_confirmations(policy_id);
CREATE INDEX idx_command_confirmations_status ON public.command_confirmations(status);
CREATE INDEX idx_command_confirmations_requested_by ON public.command_confirmations(requested_by);
CREATE INDEX idx_command_confirmations_approved_by ON public.command_confirmations(approved_by);
CREATE INDEX idx_command_confirmations_expires_at ON public.command_confirmations(expires_at);
CREATE INDEX idx_command_confirmations_agent_id ON public.command_confirmations(agent_id);

-- Additional indexes for command_policies
CREATE INDEX idx_command_policies_match_type ON public.command_policies(match_type);
CREATE INDEX idx_command_policies_risk ON public.command_policies(risk);
CREATE INDEX idx_command_policies_created_by ON public.command_policies(created_by);
CREATE INDEX idx_command_policies_updated_by ON public.command_policies(updated_by);

-- Additional indexes for policy_history
CREATE INDEX idx_policy_history_action ON public.policy_history(action);
CREATE INDEX idx_policy_history_actor_id ON public.policy_history(actor_id);
CREATE INDEX idx_policy_history_created_at ON public.policy_history(created_at);