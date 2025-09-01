-- Create subscription_plans table to replace localStorage implementation
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT true,
  allowed_billing_periods TEXT[] NOT NULL DEFAULT ARRAY['monthly'],
  monthly_ai_requests INTEGER NOT NULL DEFAULT 25,
  monthly_server_events INTEGER NOT NULL DEFAULT 25,
  features TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  support_level TEXT NOT NULL DEFAULT 'community',
  analytics_level TEXT NOT NULL DEFAULT 'basic',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for subscription plans
CREATE POLICY "Authenticated users can view subscription plans" 
ON public.subscription_plans 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage subscription plans" 
ON public.subscription_plans 
FOR ALL
USING (is_admin());

-- Insert seed plans data
INSERT INTO public.subscription_plans (name, key, slug, description, allowed_billing_periods, monthly_ai_requests, monthly_server_events, features, support_level, analytics_level) VALUES
('Free', 'free_plan', 'free', 'Perfect for getting started with basic features', ARRAY['monthly'], 25, 25, ARRAY['Community access'], 'community', 'basic'),
('Basic', 'basic_plan', 'basic', 'Ideal for small teams and growing projects', ARRAY['monthly', '1year'], 70, 70, ARRAY['Email support'], 'basic', 'basic'),
('Pro', 'pro_plan', 'pro', 'Best for professional teams and advanced workflows', ARRAY['monthly', '3months', '1year'], 125, 125, ARRAY['Priority support', 'Custom integrations'], 'priority', 'advanced'),
('Premium', 'premium_plan', 'premium', 'For enterprise-level requirements and maximum flexibility', ARRAY['monthly', '6months', '1year', '2years', '3years'], 200, 200, ARRAY['Dedicated support', 'Advanced analytics'], 'dedicated', 'advanced');

-- Add trigger for updating updated_at timestamp
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create user_subscriptions table to track actual subscriptions
CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_subscriptions
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for user_subscriptions
CREATE POLICY "Users can view their own subscriptions" 
ON public.user_subscriptions 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all subscriptions" 
ON public.user_subscriptions 
FOR ALL
USING (is_admin());

CREATE POLICY "Users in same customer can view subscriptions" 
ON public.user_subscriptions 
FOR SELECT 
USING (customer_id = ANY (get_user_customer_ids()));

-- Add trigger for updating updated_at timestamp
CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();