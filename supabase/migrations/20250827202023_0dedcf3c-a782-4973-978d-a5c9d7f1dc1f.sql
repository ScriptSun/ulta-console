-- Create command_policies table
CREATE TABLE public.command_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_name TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('auto', 'confirm', 'forbid')),
  match_type TEXT NOT NULL CHECK (match_type IN ('exact', 'regex', 'wildcard')),
  match_value TEXT NOT NULL,
  os_whitelist TEXT[],
  risk TEXT NOT NULL DEFAULT 'medium' CHECK (risk IN ('low', 'medium', 'high', 'critical')),
  timeout_sec INTEGER DEFAULT 300,
  param_schema JSONB,
  confirm_message TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  customer_id UUID NOT NULL,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  updated_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create policy_history table
CREATE TABLE public.policy_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id UUID NOT NULL REFERENCES public.command_policies(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'disabled', 'enabled')),
  changes JSONB,
  actor_id UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.command_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for command_policies
CREATE POLICY "Admins can manage all command_policies" 
ON public.command_policies 
FOR ALL 
USING (is_admin());

CREATE POLICY "Viewers can read command_policies in tenant" 
ON public.command_policies 
FOR SELECT 
USING (customer_id = ANY (get_user_customer_ids()) OR is_admin());

CREATE POLICY "Editors can insert command_policies in tenant" 
ON public.command_policies 
FOR INSERT 
WITH CHECK (
  (get_user_role_in_customer(customer_id, 'editor'::app_role) OR 
   get_user_role_in_customer(customer_id, 'approver'::app_role) OR 
   is_admin()) AND 
  customer_id = ANY (get_user_customer_ids()) AND 
  created_by = auth.uid()
);

CREATE POLICY "Editors can update command_policies in tenant" 
ON public.command_policies 
FOR UPDATE 
USING (
  customer_id = ANY (get_user_customer_ids()) AND 
  (get_user_role_in_customer(customer_id, 'editor'::app_role) OR 
   get_user_role_in_customer(customer_id, 'approver'::app_role) OR 
   is_admin())
)
WITH CHECK (updated_by = auth.uid());

CREATE POLICY "Default deny command_policies" 
ON public.command_policies 
FOR ALL 
USING (false);

-- RLS policies for policy_history
CREATE POLICY "Admins can manage all policy_history" 
ON public.policy_history 
FOR ALL 
USING (is_admin());

CREATE POLICY "Viewers can read policy_history in tenant" 
ON public.policy_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.command_policies cp 
    WHERE cp.id = policy_history.policy_id AND 
    (cp.customer_id = ANY (get_user_customer_ids()) OR is_admin())
  )
);

CREATE POLICY "System can insert policy_history" 
ON public.policy_history 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Default deny policy_history" 
ON public.policy_history 
FOR ALL 
USING (false);

-- Add updated_at trigger for command_policies
CREATE TRIGGER update_command_policies_updated_at
BEFORE UPDATE ON public.command_policies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_command_policies_customer_id ON public.command_policies(customer_id);
CREATE INDEX idx_command_policies_mode ON public.command_policies(mode);
CREATE INDEX idx_command_policies_active ON public.command_policies(active);
CREATE INDEX idx_policy_history_policy_id ON public.policy_history(policy_id);