-- Fix search_path for the new functions to address security warnings

-- Update increment_agent_usage function with proper search_path
CREATE OR REPLACE FUNCTION public.increment_agent_usage(_agent_id UUID, _usage_type TEXT, _increment INTEGER DEFAULT 1)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.agent_usage (agent_id, usage_type, usage_date, count)
  VALUES (_agent_id, _usage_type, CURRENT_DATE, _increment)
  ON CONFLICT (agent_id, usage_type, usage_date)
  DO UPDATE SET 
    count = agent_usage.count + _increment,
    updated_at = now();
END;
$$;

-- Update check_agent_usage_limit function with proper search_path
CREATE OR REPLACE FUNCTION public.check_agent_usage_limit(_agent_id UUID, _usage_type TEXT)
RETURNS TABLE(allowed BOOLEAN, current_usage INTEGER, limit_amount INTEGER, plan_name TEXT)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _current_usage INTEGER := 0;
  _limit_amount INTEGER := 0;
  _plan_name TEXT := 'Unknown';
  _plan_key TEXT;
BEGIN
  -- Get agent's plan key
  SELECT plan_key INTO _plan_key
  FROM public.agents 
  WHERE id = _agent_id;
  
  -- Get current usage for this month
  SELECT COALESCE(au.count, 0) INTO _current_usage
  FROM public.agent_usage au
  WHERE au.agent_id = _agent_id 
    AND au.usage_type = _usage_type 
    AND au.usage_date = CURRENT_DATE;

  -- Get limit from plan (using the subscription_plans table structure)
  IF _usage_type = 'ai_request' THEN
    SELECT sp.monthly_ai_requests, sp.name INTO _limit_amount, _plan_name
    FROM public.subscription_plans sp
    WHERE sp.slug = _plan_key;
  ELSIF _usage_type = 'server_event' THEN
    SELECT sp.monthly_server_events, sp.name INTO _limit_amount, _plan_name
    FROM public.subscription_plans sp
    WHERE sp.slug = _plan_key;
  END IF;

  -- Default to free plan limits if no plan found
  IF _limit_amount IS NULL THEN
    _limit_amount := 25;
    _plan_name := 'Free';
  END IF;

  RETURN QUERY SELECT (_current_usage < _limit_amount), _current_usage, _limit_amount, _plan_name;
END;
$$;