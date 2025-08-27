-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'approver', 'viewer');

-- Create user_roles table to avoid RLS recursion issues
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, customer_id, role)
);

-- Create scripts table
CREATE TABLE public.scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    customer_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create script_versions table
CREATE TABLE public.script_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    script_id UUID REFERENCES public.scripts(id) ON DELETE CASCADE NOT NULL,
    version INTEGER NOT NULL,
    sha256 TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    UNIQUE (script_id, version)
);

-- Create index on sha256 for script_versions
CREATE INDEX idx_script_versions_sha256 ON public.script_versions(sha256);

-- Create allowlist_commands table
CREATE TABLE public.allowlist_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    command_name TEXT UNIQUE NOT NULL,
    script_id UUID REFERENCES public.scripts(id) ON DELETE CASCADE NOT NULL,
    script_version INTEGER NOT NULL,
    expected_sha256 TEXT NOT NULL,
    os_whitelist TEXT[],
    min_agent_version TEXT,
    timeout_sec INTEGER DEFAULT 300,
    risk TEXT NOT NULL DEFAULT 'medium',
    active BOOLEAN NOT NULL DEFAULT false,
    customer_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id) NOT NULL
);

-- Create allowlist_command_params table
CREATE TABLE public.allowlist_command_params (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    command_id UUID REFERENCES public.allowlist_commands(id) ON DELETE CASCADE NOT NULL,
    json_schema JSONB,
    defaults JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create allowlist_batches table
CREATE TABLE public.allowlist_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_name TEXT UNIQUE NOT NULL,
    inputs_schema JSONB,
    preflight JSONB,
    active BOOLEAN NOT NULL DEFAULT false,
    customer_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id) NOT NULL
);

-- Create allowlist_batch_steps table
CREATE TABLE public.allowlist_batch_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES public.allowlist_batches(id) ON DELETE CASCADE NOT NULL,
    step_index INTEGER NOT NULL,
    command_id UUID REFERENCES public.allowlist_commands(id) ON DELETE CASCADE NOT NULL,
    params_template JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (batch_id, step_index)
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    meta JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowlist_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowlist_command_params ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowlist_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowlist_batch_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.get_user_role_in_customer(_customer_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND customer_id = _customer_id
      AND role = _role
  );
$$;

-- Create security definer function to get user's customer_ids
CREATE OR REPLACE FUNCTION public.get_user_customer_ids()
RETURNS UUID[]
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT ARRAY_AGG(DISTINCT customer_id)
  FROM public.user_roles
  WHERE user_id = auth.uid();
$$;

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;

-- Create security definer function to check if user can activate items
CREATE OR REPLACE FUNCTION public.can_activate_in_customer(_customer_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND customer_id = _customer_id
      AND role IN ('approver', 'admin')
  );
$$;

-- RLS Policies for user_roles (admins only)
CREATE POLICY "Admins can manage user roles" ON public.user_roles
FOR ALL USING (public.is_admin());

-- RLS Policies for scripts
CREATE POLICY "Default deny scripts" ON public.scripts
FOR ALL USING (false);

CREATE POLICY "Viewers can read scripts in tenant" ON public.scripts
FOR SELECT USING (
  customer_id = ANY(public.get_user_customer_ids()) OR public.is_admin()
);

CREATE POLICY "Editors can insert scripts in tenant" ON public.scripts
FOR INSERT WITH CHECK (
  (public.get_user_role_in_customer(customer_id, 'editor') OR 
   public.get_user_role_in_customer(customer_id, 'approver') OR 
   public.is_admin()) AND
  customer_id = ANY(public.get_user_customer_ids())
);

CREATE POLICY "Editors can update scripts in tenant" ON public.scripts
FOR UPDATE USING (
  (public.get_user_role_in_customer(customer_id, 'editor') OR 
   public.get_user_role_in_customer(customer_id, 'approver') OR 
   public.is_admin()) AND
  customer_id = ANY(public.get_user_customer_ids())
);

CREATE POLICY "Admins can manage all scripts" ON public.scripts
FOR ALL USING (public.is_admin());

-- RLS Policies for script_versions
CREATE POLICY "Default deny script_versions" ON public.script_versions
FOR ALL USING (false);

CREATE POLICY "Viewers can read script_versions in tenant" ON public.script_versions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.scripts s 
    WHERE s.id = script_id 
    AND (s.customer_id = ANY(public.get_user_customer_ids()) OR public.is_admin())
  )
);

CREATE POLICY "Editors can insert script_versions in tenant" ON public.script_versions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.scripts s 
    WHERE s.id = script_id 
    AND (public.get_user_role_in_customer(s.customer_id, 'editor') OR 
         public.get_user_role_in_customer(s.customer_id, 'approver') OR 
         public.is_admin())
  ) AND created_by = auth.uid()
);

CREATE POLICY "Admins can manage all script_versions" ON public.script_versions
FOR ALL USING (public.is_admin());

-- RLS Policies for allowlist_commands
CREATE POLICY "Default deny allowlist_commands" ON public.allowlist_commands
FOR ALL USING (false);

CREATE POLICY "Viewers can read allowlist_commands in tenant" ON public.allowlist_commands
FOR SELECT USING (
  customer_id = ANY(public.get_user_customer_ids()) OR public.is_admin()
);

CREATE POLICY "Editors can insert allowlist_commands in tenant" ON public.allowlist_commands
FOR INSERT WITH CHECK (
  (public.get_user_role_in_customer(customer_id, 'editor') OR 
   public.get_user_role_in_customer(customer_id, 'approver') OR 
   public.is_admin()) AND
  customer_id = ANY(public.get_user_customer_ids()) AND
  updated_by = auth.uid() AND
  (active = false OR public.can_activate_in_customer(customer_id))
);

CREATE POLICY "Editors can update allowlist_commands in tenant" ON public.allowlist_commands
FOR UPDATE USING (
  customer_id = ANY(public.get_user_customer_ids()) AND
  (public.get_user_role_in_customer(customer_id, 'editor') OR 
   public.get_user_role_in_customer(customer_id, 'approver') OR 
   public.is_admin())
) WITH CHECK (
  updated_by = auth.uid() AND
  (active = false OR public.can_activate_in_customer(customer_id))
);

CREATE POLICY "Admins can manage all allowlist_commands" ON public.allowlist_commands
FOR ALL USING (public.is_admin());

-- RLS Policies for allowlist_command_params
CREATE POLICY "Default deny allowlist_command_params" ON public.allowlist_command_params
FOR ALL USING (false);

CREATE POLICY "Viewers can read allowlist_command_params in tenant" ON public.allowlist_command_params
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.allowlist_commands ac 
    WHERE ac.id = command_id 
    AND (ac.customer_id = ANY(public.get_user_customer_ids()) OR public.is_admin())
  )
);

CREATE POLICY "Editors can manage allowlist_command_params in tenant" ON public.allowlist_command_params
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.allowlist_commands ac 
    WHERE ac.id = command_id 
    AND (public.get_user_role_in_customer(ac.customer_id, 'editor') OR 
         public.get_user_role_in_customer(ac.customer_id, 'approver') OR 
         public.is_admin())
  )
);

CREATE POLICY "Admins can manage all allowlist_command_params" ON public.allowlist_command_params
FOR ALL USING (public.is_admin());

-- RLS Policies for allowlist_batches
CREATE POLICY "Default deny allowlist_batches" ON public.allowlist_batches
FOR ALL USING (false);

CREATE POLICY "Viewers can read allowlist_batches in tenant" ON public.allowlist_batches
FOR SELECT USING (
  customer_id = ANY(public.get_user_customer_ids()) OR public.is_admin()
);

CREATE POLICY "Editors can insert allowlist_batches in tenant" ON public.allowlist_batches
FOR INSERT WITH CHECK (
  (public.get_user_role_in_customer(customer_id, 'editor') OR 
   public.get_user_role_in_customer(customer_id, 'approver') OR 
   public.is_admin()) AND
  customer_id = ANY(public.get_user_customer_ids()) AND
  updated_by = auth.uid() AND
  (active = false OR public.can_activate_in_customer(customer_id))
);

CREATE POLICY "Editors can update allowlist_batches in tenant" ON public.allowlist_batches
FOR UPDATE USING (
  customer_id = ANY(public.get_user_customer_ids()) AND
  (public.get_user_role_in_customer(customer_id, 'editor') OR 
   public.get_user_role_in_customer(customer_id, 'approver') OR 
   public.is_admin())
) WITH CHECK (
  updated_by = auth.uid() AND
  (active = false OR public.can_activate_in_customer(customer_id))
);

CREATE POLICY "Admins can manage all allowlist_batches" ON public.allowlist_batches
FOR ALL USING (public.is_admin());

-- RLS Policies for allowlist_batch_steps
CREATE POLICY "Default deny allowlist_batch_steps" ON public.allowlist_batch_steps
FOR ALL USING (false);

CREATE POLICY "Viewers can read allowlist_batch_steps in tenant" ON public.allowlist_batch_steps
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.allowlist_batches ab 
    WHERE ab.id = batch_id 
    AND (ab.customer_id = ANY(public.get_user_customer_ids()) OR public.is_admin())
  )
);

CREATE POLICY "Editors can manage allowlist_batch_steps in tenant" ON public.allowlist_batch_steps
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.allowlist_batches ab 
    WHERE ab.id = batch_id 
    AND (public.get_user_role_in_customer(ab.customer_id, 'editor') OR 
         public.get_user_role_in_customer(ab.customer_id, 'approver') OR 
         public.is_admin())
  )
);

CREATE POLICY "Admins can manage all allowlist_batch_steps" ON public.allowlist_batch_steps
FOR ALL USING (public.is_admin());

-- RLS Policies for audit_logs
CREATE POLICY "Default deny audit_logs" ON public.audit_logs
FOR ALL USING (false);

CREATE POLICY "Viewers can read audit_logs in tenant" ON public.audit_logs
FOR SELECT USING (
  customer_id = ANY(public.get_user_customer_ids()) OR public.is_admin()
);

CREATE POLICY "System can insert audit_logs" ON public.audit_logs
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage all audit_logs" ON public.audit_logs
FOR ALL USING (public.is_admin());

-- Create triggers for updated_at
CREATE TRIGGER update_scripts_updated_at
    BEFORE UPDATE ON public.scripts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_allowlist_commands_updated_at
    BEFORE UPDATE ON public.allowlist_commands
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_allowlist_command_params_updated_at
    BEFORE UPDATE ON public.allowlist_command_params
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_allowlist_batches_updated_at
    BEFORE UPDATE ON public.allowlist_batches
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_allowlist_batch_steps_updated_at
    BEFORE UPDATE ON public.allowlist_batch_steps
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();