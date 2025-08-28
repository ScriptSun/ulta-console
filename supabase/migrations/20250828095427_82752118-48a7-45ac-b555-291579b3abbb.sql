-- Create batch_dependencies table
CREATE TABLE public.batch_dependencies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id UUID NOT NULL,
    depends_on_batch_id UUID NOT NULL,
    min_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID NOT NULL DEFAULT auth.uid(),
    updated_by UUID NOT NULL DEFAULT auth.uid(),
    
    -- Foreign key constraints
    CONSTRAINT fk_batch_dependencies_batch_id 
        FOREIGN KEY (batch_id) REFERENCES public.script_batches(id) ON DELETE CASCADE,
    CONSTRAINT fk_batch_dependencies_depends_on_batch_id 
        FOREIGN KEY (depends_on_batch_id) REFERENCES public.script_batches(id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate dependencies
    CONSTRAINT uk_batch_dependencies_batch_depends 
        UNIQUE (batch_id, depends_on_batch_id),
    
    -- Prevent self-dependency
    CONSTRAINT ck_batch_dependencies_no_self_dependency 
        CHECK (batch_id != depends_on_batch_id)
);

-- Enable Row Level Security
ALTER TABLE public.batch_dependencies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for batch_dependencies
CREATE POLICY "Admins can manage all batch_dependencies" 
ON public.batch_dependencies 
FOR ALL 
USING (is_admin());

CREATE POLICY "Viewers can read batch_dependencies in tenant" 
ON public.batch_dependencies 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.script_batches sb 
        WHERE sb.id = batch_dependencies.batch_id 
        AND (sb.customer_id = ANY (get_user_customer_ids()) OR is_admin())
    )
);

CREATE POLICY "Editors can insert batch_dependencies in tenant" 
ON public.batch_dependencies 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.script_batches sb 
        WHERE sb.id = batch_dependencies.batch_id 
        AND (get_user_role_in_customer(sb.customer_id, 'editor'::app_role) 
             OR get_user_role_in_customer(sb.customer_id, 'approver'::app_role) 
             OR is_admin())
    ) AND created_by = auth.uid()
);

CREATE POLICY "Editors can update batch_dependencies in tenant" 
ON public.batch_dependencies 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.script_batches sb 
        WHERE sb.id = batch_dependencies.batch_id 
        AND (get_user_role_in_customer(sb.customer_id, 'editor'::app_role) 
             OR get_user_role_in_customer(sb.customer_id, 'approver'::app_role) 
             OR is_admin())
    )
) WITH CHECK (updated_by = auth.uid());

CREATE POLICY "Editors can delete batch_dependencies in tenant" 
ON public.batch_dependencies 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.script_batches sb 
        WHERE sb.id = batch_dependencies.batch_id 
        AND (get_user_role_in_customer(sb.customer_id, 'editor'::app_role) 
             OR get_user_role_in_customer(sb.customer_id, 'approver'::app_role) 
             OR is_admin())
    )
);

-- Create trigger for updated_at
CREATE TRIGGER update_batch_dependencies_updated_at
    BEFORE UPDATE ON public.batch_dependencies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to validate batch dependencies
CREATE OR REPLACE FUNCTION public.validate_batch_dependencies(
    _batch_id UUID
) RETURNS TABLE (
    is_valid BOOLEAN,
    missing_dependencies TEXT[],
    outdated_dependencies TEXT[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _dependency RECORD;
    _dependency_batch RECORD;
    _missing TEXT[] := '{}';
    _outdated TEXT[] := '{}';
    _is_valid BOOLEAN := TRUE;
BEGIN
    -- Check all dependencies for the batch
    FOR _dependency IN 
        SELECT bd.depends_on_batch_id, bd.min_version, sb.name as dependency_name
        FROM public.batch_dependencies bd
        JOIN public.script_batches sb ON sb.id = bd.depends_on_batch_id
        WHERE bd.batch_id = _batch_id
    LOOP
        -- Check if the dependency batch exists and has an active version
        SELECT sb.name, sb.active_version 
        INTO _dependency_batch
        FROM public.script_batches sb 
        WHERE sb.id = _dependency.depends_on_batch_id;
        
        IF NOT FOUND THEN
            _is_valid := FALSE;
            _missing := array_append(_missing, _dependency.dependency_name || ' (deleted)');
        ELSIF _dependency_batch.active_version IS NULL THEN
            _is_valid := FALSE;
            _missing := array_append(_missing, _dependency.dependency_name || ' (no active version)');
        ELSIF _dependency_batch.active_version < _dependency.min_version THEN
            _is_valid := FALSE;
            _outdated := array_append(_outdated, 
                _dependency.dependency_name || ' v' || _dependency_batch.active_version || 
                ' (requires v' || _dependency.min_version || '+)'
            );
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT _is_valid, _missing, _outdated;
END;
$$;