-- Create users table for user management
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Add user_id foreign key to agents table
ALTER TABLE public.agents ADD COLUMN user_id UUID REFERENCES public.users(id);

-- Add plan_key to agents table for subscription plan integration
ALTER TABLE public.agents ADD COLUMN plan_key TEXT;

-- Create policies for users table
CREATE POLICY "Admins can manage all users" 
ON public.users 
FOR ALL 
USING (is_admin());

CREATE POLICY "Users in tenant can view users" 
ON public.users 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.agents a 
    WHERE a.user_id = users.id 
    AND (a.customer_id = ANY (get_user_customer_ids()) OR is_admin())
  )
);

CREATE POLICY "Editors can insert users in tenant" 
ON public.users 
FOR INSERT 
WITH CHECK (
  get_user_role_in_customer(
    (SELECT customer_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1), 
    'editor'::app_role
  ) OR is_admin()
);

CREATE POLICY "Editors can update users in tenant" 
ON public.users 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.agents a 
    WHERE a.user_id = users.id 
    AND (get_user_role_in_customer(a.customer_id, 'editor'::app_role) OR is_admin())
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create usage tracking table for plan enforcement
CREATE TABLE public.agent_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  usage_type TEXT NOT NULL, -- 'ai_request' or 'server_event'
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agent_id, usage_type, usage_date)
);

-- Enable RLS for agent_usage
ALTER TABLE public.agent_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for agent_usage
CREATE POLICY "Admins can manage all agent_usage" 
ON public.agent_usage 
FOR ALL 
USING (is_admin());

CREATE POLICY "System can insert agent_usage" 
ON public.agent_usage 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update agent_usage" 
ON public.agent_usage 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can view agent_usage in tenant" 
ON public.agent_usage 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.agents a 
    WHERE a.id = agent_usage.agent_id 
    AND (a.customer_id = ANY (get_user_customer_ids()) OR is_admin())
  )
);

-- Create function to increment agent usage
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

-- Create function to check agent usage limits
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