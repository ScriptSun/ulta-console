-- Add concurrency controls and exit contracts to batches system

-- Add concurrency fields to script_batches table
ALTER TABLE public.script_batches 
ADD COLUMN IF NOT EXISTS per_agent_concurrency INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS per_tenant_concurrency INTEGER NOT NULL DEFAULT 10;

-- Create batch_runs table for tracking batch executions
CREATE TABLE IF NOT EXISTS public.batch_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.script_batches(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL, -- Derived from agent for faster queries
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','success','failed','canceled','timeout')),
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  duration_sec INTEGER,
  contract JSONB, -- Parsed exit contract
  raw_stdout TEXT,
  raw_stderr TEXT,
  parser_warning BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL DEFAULT auth.uid(),
  updated_by UUID NOT NULL DEFAULT auth.uid()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_batch_runs_batch_tenant_status ON public.batch_runs(batch_id, tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_batch_runs_batch_agent_status ON public.batch_runs(batch_id, agent_id, status);
CREATE INDEX IF NOT EXISTS idx_batch_runs_status_started ON public.batch_runs(status, started_at);
CREATE INDEX IF NOT EXISTS idx_batch_runs_tenant_created ON public.batch_runs(tenant_id, created_at);

-- Enable RLS
ALTER TABLE public.batch_runs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for batch_runs
CREATE POLICY "Admins can manage all batch_runs" 
ON public.batch_runs 
FOR ALL 
USING (is_admin());

CREATE POLICY "Users can view batch_runs in their tenant" 
ON public.batch_runs 
FOR SELECT 
USING (tenant_id = ANY(get_user_customer_ids()) OR is_admin());

CREATE POLICY "System can insert batch_runs" 
ON public.batch_runs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update batch_runs" 
ON public.batch_runs 
FOR UPDATE 
USING (true);

-- Create function to get tenant from agent
CREATE OR REPLACE FUNCTION public.get_agent_tenant_id(agent_uuid UUID)
RETURNS UUID 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT customer_id FROM agents WHERE id = agent_uuid;
$$;

-- Create function to check concurrency limits
CREATE OR REPLACE FUNCTION public.check_batch_concurrency(
  _batch_id UUID,
  _agent_id UUID
)
RETURNS TABLE(
  can_run BOOLEAN,
  block_reason TEXT,
  block_scope TEXT,
  current_agent_runs INTEGER,
  current_tenant_runs INTEGER,
  agent_limit INTEGER,
  tenant_limit INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id UUID;
  _agent_limit INTEGER;
  _tenant_limit INTEGER;
  _agent_count INTEGER;
  _tenant_count INTEGER;
BEGIN
  -- Get tenant ID and limits
  SELECT 
    get_agent_tenant_id(_agent_id),
    sb.per_agent_concurrency,
    sb.per_tenant_concurrency
  INTO _tenant_id, _agent_limit, _tenant_limit
  FROM script_batches sb
  WHERE sb.id = _batch_id;

  IF _tenant_id IS NULL THEN
    RETURN QUERY SELECT false, 'Agent not found', 'system', 0, 0, 0, 0;
    RETURN;
  END IF;

  -- Get current running counts
  SELECT COUNT(*)
  INTO _agent_count
  FROM batch_runs
  WHERE batch_id = _batch_id 
    AND agent_id = _agent_id 
    AND status = 'running';

  SELECT COUNT(*)
  INTO _tenant_count
  FROM batch_runs
  WHERE batch_id = _batch_id 
    AND tenant_id = _tenant_id 
    AND status = 'running';

  -- Check limits
  IF _agent_count >= _agent_limit THEN
    RETURN QUERY SELECT false, 'Agent concurrency limit reached', 'agent', _agent_count, _tenant_count, _agent_limit, _tenant_limit;
  ELSIF _tenant_count >= _tenant_limit THEN
    RETURN QUERY SELECT false, 'Tenant concurrency limit reached', 'tenant', _agent_count, _tenant_count, _agent_limit, _tenant_limit;
  ELSE
    RETURN QUERY SELECT true, NULL, NULL, _agent_count, _tenant_count, _agent_limit, _tenant_limit;
  END IF;
END;
$$;

-- Create function to start a batch run with concurrency check
CREATE OR REPLACE FUNCTION public.start_batch_run(
  _batch_id UUID,
  _agent_id UUID
)
RETURNS TABLE(
  run_id UUID,
  status TEXT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id UUID;
  _can_run BOOLEAN;
  _block_reason TEXT;
  _block_scope TEXT;
  _run_id UUID;
BEGIN
  -- Get tenant ID
  SELECT get_agent_tenant_id(_agent_id) INTO _tenant_id;
  
  -- Use advisory lock to prevent race conditions
  PERFORM pg_advisory_xact_lock(hashtext(_batch_id::text || ':' || _tenant_id::text));
  
  -- Check concurrency limits
  SELECT cc.can_run, cc.block_reason, cc.block_scope
  INTO _can_run, _block_reason, _block_scope
  FROM check_batch_concurrency(_batch_id, _agent_id) cc;
  
  IF NOT _can_run THEN
    -- Log the block event
    INSERT INTO audit_logs (customer_id, actor, action, target, meta)
    VALUES (
      _tenant_id,
      'system',
      'batch_run_blocked_concurrency',
      'batch:' || _batch_id::text,
      jsonb_build_object(
        'batch_id', _batch_id,
        'agent_id', _agent_id,
        'reason', _block_reason,
        'scope', _block_scope
      )
    );
    
    RETURN QUERY SELECT NULL::UUID, 'blocked', _block_reason || ' (' || _block_scope || ')';
    RETURN;
  END IF;
  
  -- Create the batch run
  INSERT INTO batch_runs (batch_id, agent_id, tenant_id, status, started_at)
  VALUES (_batch_id, _agent_id, _tenant_id, 'running', now())
  RETURNING id INTO _run_id;
  
  -- Log the start event
  INSERT INTO audit_logs (customer_id, actor, action, target, meta)
  VALUES (
    _tenant_id,
    'system',
    'batch_run_started',
    'batch:' || _batch_id::text,
    jsonb_build_object(
      'batch_id', _batch_id,
      'agent_id', _agent_id,
      'run_id', _run_id
    )
  );
  
  RETURN QUERY SELECT _run_id, 'started', 'Batch run started successfully';
END;
$$;

-- Create function to complete a batch run
CREATE OR REPLACE FUNCTION public.complete_batch_run(
  _run_id UUID,
  _status TEXT,
  _raw_stdout TEXT DEFAULT NULL,
  _raw_stderr TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _batch_id UUID;
  _agent_id UUID;
  _tenant_id UUID;
  _started_at TIMESTAMP WITH TIME ZONE;
  _contract JSONB;
  _parser_warning BOOLEAN := FALSE;
  _duration INTEGER;
BEGIN
  -- Get run details
  SELECT batch_id, agent_id, tenant_id, started_at
  INTO _batch_id, _agent_id, _tenant_id, _started_at
  FROM batch_runs
  WHERE id = _run_id;
  
  IF _batch_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate duration
  _duration := EXTRACT(EPOCH FROM (now() - _started_at))::INTEGER;
  
  -- Try to parse exit contract from stdout
  IF _raw_stdout IS NOT NULL THEN
    BEGIN
      -- Look for the first JSON object containing 'ultaai_contract'
      -- This is a simplified extraction - in practice you might need more robust parsing
      _contract := (
        SELECT jsonb_extract_path(line_json, 'ultaai_contract')
        FROM (
          SELECT jsonb_parse_text(line) as line_json
          FROM unnest(string_to_array(_raw_stdout, E'\n')) as line
          WHERE line ~ '^\s*\{.*ultaai_contract.*\}\s*$'
        ) parsed
        WHERE line_json ? 'ultaai_contract'
        LIMIT 1
      );
    EXCEPTION WHEN OTHERS THEN
      _parser_warning := TRUE;
    END;
  END IF;
  
  -- Update the batch run
  UPDATE batch_runs
  SET 
    status = _status,
    finished_at = now(),
    duration_sec = _duration,
    contract = _contract,
    raw_stdout = _raw_stdout,
    raw_stderr = _raw_stderr,
    parser_warning = _parser_warning,
    updated_at = now()
  WHERE id = _run_id;
  
  -- Log completion
  INSERT INTO audit_logs (customer_id, actor, action, target, meta)
  VALUES (
    _tenant_id,
    'system',
    'batch_run_finished',
    'batch:' || _batch_id::text,
    jsonb_build_object(
      'batch_id', _batch_id,
      'agent_id', _agent_id,
      'run_id', _run_id,
      'status', _status,
      'duration_sec', _duration,
      'has_contract', _contract IS NOT NULL,
      'parser_warning', _parser_warning
    )
  );
  
  RETURN TRUE;
END;
$$;

-- Add trigger for updated_at
CREATE OR REPLACE TRIGGER update_batch_runs_updated_at
  BEFORE UPDATE ON public.batch_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();