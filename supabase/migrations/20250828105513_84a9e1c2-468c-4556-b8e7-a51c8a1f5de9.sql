-- Create script_batch_variants table for per-OS variants
CREATE TABLE public.script_batch_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL,
  os TEXT NOT NULL,
  version INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  source TEXT NOT NULL,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT false,
  min_os_version TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL DEFAULT auth.uid(),
  UNIQUE(batch_id, os, version)
);

-- Enable RLS
ALTER TABLE public.script_batch_variants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for script_batch_variants
CREATE POLICY "Admins can manage all script_batch_variants" 
ON public.script_batch_variants 
FOR ALL
USING (is_admin());

CREATE POLICY "Viewers can read script_batch_variants in tenant" 
ON public.script_batch_variants 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM script_batches sb 
    WHERE sb.id = script_batch_variants.batch_id 
    AND (sb.customer_id = ANY(get_user_customer_ids()) OR is_admin())
  )
);

CREATE POLICY "Editors can insert script_batch_variants in tenant" 
ON public.script_batch_variants 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM script_batches sb 
    WHERE sb.id = script_batch_variants.batch_id 
    AND (get_user_role_in_customer(sb.customer_id, 'editor'::app_role) OR get_user_role_in_customer(sb.customer_id, 'approver'::app_role) OR is_admin())
  ) 
  AND created_by = auth.uid()
);

CREATE POLICY "Editors can update script_batch_variants in tenant" 
ON public.script_batch_variants 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM script_batches sb 
    WHERE sb.id = script_batch_variants.batch_id 
    AND (get_user_role_in_customer(sb.customer_id, 'editor'::app_role) OR get_user_role_in_customer(sb.customer_id, 'approver'::app_role) OR is_admin())
  )
);

CREATE POLICY "Approvers can activate script_batch_variants" 
ON public.script_batch_variants 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM script_batches sb 
    WHERE sb.id = script_batch_variants.batch_id 
    AND (get_user_role_in_customer(sb.customer_id, 'approver'::app_role) OR is_admin())
  )
);

-- Create view for active variants per OS
CREATE VIEW public.v_batch_variants_active AS
SELECT 
  sbv.batch_id,
  sbv.os,
  sbv.version,
  sbv.sha256,
  sbv.source,
  sbv.notes,
  sbv.min_os_version,
  sbv.created_at,
  sbv.created_by
FROM public.script_batch_variants sbv
WHERE sbv.active = true;

-- Create function to get next variant version for a batch/OS combination
CREATE OR REPLACE FUNCTION public.get_next_variant_version(_batch_id uuid, _os text)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT COALESCE(MAX(version), 0) + 1
  FROM public.script_batch_variants
  WHERE batch_id = _batch_id AND os = _os;
$function$;

-- Create function to activate a variant version
CREATE OR REPLACE FUNCTION public.activate_variant_version(_batch_id uuid, _os text, _version integer, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  _customer_id UUID;
  _batch_name TEXT;
  _old_version INTEGER;
  _old_sha TEXT;
  _new_sha TEXT;
BEGIN
  -- Get batch info and check permissions
  SELECT customer_id, name 
  INTO _customer_id, _batch_name
  FROM public.script_batches 
  WHERE id = _batch_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user has permission
  IF NOT (get_user_role_in_customer(_customer_id, 'approver'::app_role) OR is_admin()) THEN
    RETURN FALSE;
  END IF;
  
  -- Get current active version and SHA
  SELECT version, sha256 INTO _old_version, _old_sha
  FROM public.script_batch_variants 
  WHERE batch_id = _batch_id AND os = _os AND active = true;
  
  -- Get new SHA
  SELECT sha256 INTO _new_sha
  FROM public.script_batch_variants 
  WHERE batch_id = _batch_id AND os = _os AND version = _version;
  
  IF _new_sha IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Deactivate all versions for this OS
  UPDATE public.script_batch_variants 
  SET active = false
  WHERE batch_id = _batch_id AND os = _os AND active = true;
  
  -- Activate the target version
  UPDATE public.script_batch_variants 
  SET active = true
  WHERE batch_id = _batch_id AND os = _os AND version = _version;
  
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
    'variant_activate',
    'script_batch:' || _batch_name,
    jsonb_build_object(
      'batch_id', _batch_id,
      'os', _os,
      'from_version', _old_version,
      'to_version', _version,
      'sha_before', _old_sha,
      'sha_after', _new_sha,
      'user_id', _user_id
    )
  );
  
  RETURN TRUE;
END;
$function$;

-- Create function to validate variant dependencies
CREATE OR REPLACE FUNCTION public.validate_variant_dependencies(_batch_id uuid, _os text)
RETURNS TABLE(is_valid boolean, missing_variants text[], incompatible_variants text[])
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    _dependency RECORD;
    _dependency_variant RECORD;
    _missing TEXT[] := '{}';
    _incompatible TEXT[] := '{}';
    _is_valid BOOLEAN := TRUE;
BEGIN
    -- Check all dependencies for the batch
    FOR _dependency IN 
        SELECT bd.depends_on_batch_id, bd.min_version, sb.name as dependency_name
        FROM public.batch_dependencies bd
        JOIN public.script_batches sb ON sb.id = bd.depends_on_batch_id
        WHERE bd.batch_id = _batch_id
    LOOP
        -- Check if the dependency batch has an active variant for this OS
        SELECT sbv.version, sb.name 
        INTO _dependency_variant
        FROM public.script_batch_variants sbv
        JOIN public.script_batches sb ON sb.id = sbv.batch_id
        WHERE sbv.batch_id = _dependency.depends_on_batch_id 
        AND sbv.os = _os 
        AND sbv.active = true;
        
        IF NOT FOUND THEN
            _is_valid := FALSE;
            _missing := array_append(_missing, _dependency.dependency_name || ' (' || _os || ' variant missing)');
        ELSIF _dependency_variant.version < _dependency.min_version THEN
            _is_valid := FALSE;
            _incompatible := array_append(_incompatible, 
                _dependency.dependency_name || ' ' || _os || ' v' || _dependency_variant.version || 
                ' (requires v' || _dependency.min_version || '+)'
            );
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT _is_valid, _missing, _incompatible;
END;
$function$;