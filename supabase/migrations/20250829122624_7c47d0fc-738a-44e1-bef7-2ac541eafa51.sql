-- Create subscription plans table
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  monthly_ai_requests INTEGER NOT NULL DEFAULT 0,
  monthly_server_events INTEGER NOT NULL DEFAULT 0,
  stripe_price_id TEXT UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert the 4 plans
INSERT INTO public.subscription_plans (name, description, price_cents, monthly_ai_requests, monthly_server_events, stripe_price_id) VALUES
('Free', 'Free plan with 25 AI requests monthly', 0, 25, 25, null),
('Starter', '70 AI requests and server events monthly', 1000, 70, 70, 'price_starter'), 
('Pro', '125 AI requests and server events monthly', 1600, 125, 125, 'price_pro'),
('Premium', '200 AI requests and server events monthly', 1900, 200, 200, 'price_premium');

-- Create user subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id) NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, customer_id)
);

-- Create usage tracking table
CREATE TABLE public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  usage_type TEXT NOT NULL, -- 'ai_request' or 'server_event'
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, customer_id, usage_type, usage_date)
);

-- Enable Row Level Security
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans
CREATE POLICY "Anyone can read subscription_plans" ON public.subscription_plans
FOR SELECT USING (true);

-- RLS Policies for user_subscriptions  
CREATE POLICY "Users can read their own subscriptions" ON public.user_subscriptions
FOR SELECT USING (user_id = auth.uid() OR customer_id = ANY(get_user_customer_ids()));

CREATE POLICY "Users can insert their own subscriptions" ON public.user_subscriptions
FOR INSERT WITH CHECK (user_id = auth.uid() AND customer_id = ANY(get_user_customer_ids()));

CREATE POLICY "Users can update their own subscriptions" ON public.user_subscriptions
FOR UPDATE USING (user_id = auth.uid() OR customer_id = ANY(get_user_customer_ids()));

-- RLS Policies for usage_tracking
CREATE POLICY "Users can read their own usage" ON public.usage_tracking
FOR SELECT USING (user_id = auth.uid() OR customer_id = ANY(get_user_customer_ids()));

CREATE POLICY "System can insert usage tracking" ON public.usage_tracking
FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update usage tracking" ON public.usage_tracking  
FOR UPDATE USING (true);

-- Create function to get user's current plan
CREATE OR REPLACE FUNCTION get_user_current_plan(_user_id UUID, _customer_id UUID)
RETURNS TABLE(plan_name TEXT, monthly_ai_requests INTEGER, monthly_server_events INTEGER)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT sp.name, sp.monthly_ai_requests, sp.monthly_server_events
  FROM public.user_subscriptions us
  JOIN public.subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = _user_id AND us.customer_id = _customer_id AND us.status = 'active'
  LIMIT 1;
$$;

-- Create function to check usage limits
CREATE OR REPLACE FUNCTION check_usage_limit(_user_id UUID, _customer_id UUID, _usage_type TEXT)
RETURNS TABLE(allowed BOOLEAN, current_usage INTEGER, limit_amount INTEGER)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
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

-- Create function to increment usage
CREATE OR REPLACE FUNCTION increment_usage(_user_id UUID, _customer_id UUID, _usage_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.usage_tracking (user_id, customer_id, usage_type, usage_date, count)
  VALUES (_user_id, _customer_id, _usage_type, CURRENT_DATE, 1)
  ON CONFLICT (user_id, customer_id, usage_type, usage_date)
  DO UPDATE SET count = usage_tracking.count + 1;
  
  RETURN TRUE;
END;
$$;