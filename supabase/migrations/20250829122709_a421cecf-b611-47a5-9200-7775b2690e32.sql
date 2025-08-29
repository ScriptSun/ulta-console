-- Fix search path issues for the new functions
CREATE OR REPLACE FUNCTION get_user_current_plan(_user_id UUID, _customer_id UUID)
RETURNS TABLE(plan_name TEXT, monthly_ai_requests INTEGER, monthly_server_events INTEGER)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT sp.name, sp.monthly_ai_requests, sp.monthly_server_events
  FROM public.subscription_plans sp
  JOIN public.user_subscriptions us ON us.plan_id = sp.id
  WHERE us.user_id = _user_id AND us.customer_id = _customer_id AND us.status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION check_usage_limit(_user_id UUID, _customer_id UUID, _usage_type TEXT)
RETURNS TABLE(allowed BOOLEAN, current_usage INTEGER, limit_amount INTEGER)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _current_usage INTEGER := 0;
  _limit_amount INTEGER := 0;
BEGIN
  -- Get current usage for this month
  SELECT COALESCE(ut.count, 0) INTO _current_usage
  FROM public.usage_tracking ut
  WHERE ut.user_id = _user_id 
    AND ut.customer_id = _customer_id
    AND ut.usage_type = _usage_type 
    AND ut.usage_date = CURRENT_DATE;

  -- Get limit from user's plan
  IF _usage_type = 'ai_request' THEN
    SELECT sp.monthly_ai_requests INTO _limit_amount
    FROM public.user_subscriptions us
    JOIN public.subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = _user_id AND us.customer_id = _customer_id AND us.status = 'active';
  ELSIF _usage_type = 'server_event' THEN
    SELECT sp.monthly_server_events INTO _limit_amount
    FROM public.user_subscriptions us
    JOIN public.subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = _user_id AND us.customer_id = _customer_id AND us.status = 'active';
  END IF;

  -- Default to free plan limits if no subscription found
  IF _limit_amount IS NULL THEN
    _limit_amount := 25;
  END IF;

  RETURN QUERY SELECT (_current_usage < _limit_amount), _current_usage, _limit_amount;
END;
$$;

CREATE OR REPLACE FUNCTION increment_usage(_user_id UUID, _customer_id UUID, _usage_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.usage_tracking (user_id, customer_id, usage_type, usage_date, count)
  VALUES (_user_id, _customer_id, _usage_type, CURRENT_DATE, 1)
  ON CONFLICT (user_id, customer_id, usage_type, usage_date)
  DO UPDATE SET count = usage_tracking.count + 1;
  
  RETURN TRUE;
END;
$$;