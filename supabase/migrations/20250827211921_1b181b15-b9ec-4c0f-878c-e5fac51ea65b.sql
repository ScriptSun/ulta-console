-- Create script_batches table
CREATE TABLE public.script_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  name TEXT NOT NULL,
  os_targets TEXT[] NOT NULL DEFAULT '{}',
  risk TEXT NOT NULL DEFAULT 'medium' CHECK (risk IN ('low', 'medium', 'high')),
  max_timeout_sec INTEGER NOT NULL DEFAULT 300,
  active_version INTEGER,
  auto_version BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL DEFAULT auth.uid(),
  updated_by UUID NOT NULL DEFAULT auth.uid(),
  UNIQUE(customer_id, name)
);

-- Create script_batch_versions table
CREATE TABLE public.script_batch_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.script_batches(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  source TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL DEFAULT auth.uid(),
  UNIQUE(batch_id, version)
);

-- Enable RLS on both tables
ALTER TABLE public.script_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_batch_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for script_batches
CREATE POLICY "Admins can manage all script_batches" 
ON public.script_batches FOR ALL 
USING (is_admin());

CREATE POLICY "Viewers can read script_batches in tenant" 
ON public.script_batches FOR SELECT 
USING ((customer_id = ANY (get_user_customer_ids())) OR is_admin());

CREATE POLICY "Editors can insert script_batches in tenant" 
ON public.script_batches FOR INSERT 
WITH CHECK (
  (get_user_role_in_customer(customer_id, 'editor'::app_role) OR 
   get_user_role_in_customer(customer_id, 'approver'::app_role) OR 
   is_admin()) AND 
  (customer_id = ANY (get_user_customer_ids())) AND 
  (created_by = auth.uid())
);

CREATE POLICY "Editors can update script_batches in tenant" 
ON public.script_batches FOR UPDATE 
USING (
  (customer_id = ANY (get_user_customer_ids())) AND 
  (get_user_role_in_customer(customer_id, 'editor'::app_role) OR 
   get_user_role_in_customer(customer_id, 'approver'::app_role) OR 
   is_admin())
) 
WITH CHECK (updated_by = auth.uid());

CREATE POLICY "Approvers can delete script_batches in tenant" 
ON public.script_batches FOR DELETE 
USING (
  (customer_id = ANY (get_user_customer_ids())) AND 
  (get_user_role_in_customer(customer_id, 'approver'::app_role) OR is_admin())
);

-- RLS Policies for script_batch_versions
CREATE POLICY "Admins can manage all script_batch_versions" 
ON public.script_batch_versions FOR ALL 
USING (is_admin());

CREATE POLICY "Viewers can read script_batch_versions in tenant" 
ON public.script_batch_versions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.script_batches sb 
    WHERE sb.id = script_batch_versions.batch_id AND 
    ((sb.customer_id = ANY (get_user_customer_ids())) OR is_admin())
  )
);

CREATE POLICY "Editors can insert script_batch_versions in tenant" 
ON public.script_batch_versions FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.script_batches sb 
    WHERE sb.id = script_batch_versions.batch_id AND 
    (get_user_role_in_customer(sb.customer_id, 'editor'::app_role) OR 
     get_user_role_in_customer(sb.customer_id, 'approver'::app_role) OR 
     is_admin())
  ) AND 
  (created_by = auth.uid())
);

CREATE POLICY "Approvers can update script_batch_versions for activation" 
ON public.script_batch_versions FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.script_batches sb 
    WHERE sb.id = script_batch_versions.batch_id AND 
    (get_user_role_in_customer(sb.customer_id, 'approver'::app_role) OR is_admin())
  )
);

-- Create indexes for performance
CREATE INDEX idx_script_batches_customer_id ON public.script_batches(customer_id);
CREATE INDEX idx_script_batches_name ON public.script_batches(customer_id, name);
CREATE INDEX idx_script_batch_versions_batch_id ON public.script_batch_versions(batch_id);
CREATE INDEX idx_script_batch_versions_version ON public.script_batch_versions(batch_id, version);
CREATE INDEX idx_script_batch_versions_sha256 ON public.script_batch_versions(sha256);

-- Create triggers for updated_at
CREATE TRIGGER update_script_batches_updated_at
  BEFORE UPDATE ON public.script_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get next version number
CREATE OR REPLACE FUNCTION public.get_next_batch_version(_batch_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(MAX(version), 0) + 1
  FROM public.script_batch_versions
  WHERE batch_id = _batch_id;
$$;

-- Create function to activate batch version
CREATE OR REPLACE FUNCTION public.activate_batch_version(
  _batch_id UUID,
  _version INTEGER,
  _user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _customer_id UUID;
  _batch_name TEXT;
  _old_version INTEGER;
  _old_sha TEXT;
  _new_sha TEXT;
BEGIN
  -- Get batch info and check permissions
  SELECT customer_id, name, active_version 
  INTO _customer_id, _batch_name, _old_version
  FROM public.script_batches 
  WHERE id = _batch_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user has permission
  IF NOT (get_user_role_in_customer(_customer_id, 'approver'::app_role) OR is_admin()) THEN
    RETURN FALSE;
  END IF;
  
  -- Get SHAs for audit
  SELECT sha256 INTO _old_sha
  FROM public.script_batch_versions 
  WHERE batch_id = _batch_id AND version = _old_version;
  
  SELECT sha256 INTO _new_sha
  FROM public.script_batch_versions 
  WHERE batch_id = _batch_id AND version = _version;
  
  IF _new_sha IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Deactivate all versions
  UPDATE public.script_batch_versions 
  SET status = 'archived'
  WHERE batch_id = _batch_id AND status = 'active';
  
  -- Activate the target version
  UPDATE public.script_batch_versions 
  SET status = 'active'
  WHERE batch_id = _batch_id AND version = _version;
  
  -- Update active_version in batch
  UPDATE public.script_batches 
  SET active_version = _version,
      updated_by = _user_id,
      updated_at = now()
  WHERE id = _batch_id;
  
  -- Log the activation
  INSERT INTO public.audit_logs (
    customer_id,
    actor,
    action,
    target,
    meta
  ) VALUES (
    _customer_id,
    (SELECT email FROM auth.users WHERE id = _user_id),
    'batch_activate',
    'script_batch:' || _batch_name,
    jsonb_build_object(
      'batch_id', _batch_id,
      'from_version', _old_version,
      'to_version', _version,
      'sha_before', _old_sha,
      'sha_after', _new_sha,
      'user_id', _user_id
    )
  );
  
  RETURN TRUE;
END;
$$;

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.script_batches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.script_batch_versions;

-- Set replica identity
ALTER TABLE public.script_batches REPLICA IDENTITY FULL;
ALTER TABLE public.script_batch_versions REPLICA IDENTITY FULL;