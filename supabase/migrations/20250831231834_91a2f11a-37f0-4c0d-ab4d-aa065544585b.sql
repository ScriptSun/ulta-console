-- Create AI usage tracking table
CREATE TABLE public.ai_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  agent_id UUID,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd DECIMAL(10,6) NOT NULL DEFAULT 0,
  request_type TEXT NOT NULL, -- 'chat', 'advice', 'input_fill', etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view AI usage in their tenant" 
ON public.ai_usage_logs 
FOR SELECT 
USING (tenant_id = ANY (get_user_customer_ids()) OR is_admin());

CREATE POLICY "System can insert AI usage logs" 
ON public.ai_usage_logs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can manage all AI usage logs" 
ON public.ai_usage_logs 
FOR ALL 
USING (is_admin());

-- Create index for performance
CREATE INDEX idx_ai_usage_logs_tenant_date ON public.ai_usage_logs (tenant_id, created_at DESC);
CREATE INDEX idx_ai_usage_logs_model_date ON public.ai_usage_logs (model, created_at DESC);

-- Create function to log AI usage
CREATE OR REPLACE FUNCTION public.log_ai_usage(
  _tenant_id UUID,
  _agent_id UUID,
  _model TEXT,
  _prompt_tokens INTEGER,
  _completion_tokens INTEGER,
  _cost_usd DECIMAL,
  _request_type TEXT,
  _metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _log_id UUID;
BEGIN
  INSERT INTO public.ai_usage_logs (
    tenant_id,
    agent_id,
    model,
    prompt_tokens,
    completion_tokens,
    total_tokens,
    cost_usd,
    request_type,
    metadata
  ) VALUES (
    _tenant_id,
    _agent_id,
    _model,
    _prompt_tokens,
    _completion_tokens,
    _prompt_tokens + _completion_tokens,
    _cost_usd,
    _request_type,
    _metadata
  ) RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$function$;