-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, expired, trialing
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  customer_id UUID, -- Reference to customer/tenant
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscription_plans (readable by all authenticated users)
CREATE POLICY "subscription_plans_read_policy" ON public.subscription_plans
FOR SELECT USING (true);

-- Admin can manage subscription plans
CREATE POLICY "subscription_plans_admin_policy" ON public.subscription_plans
FOR ALL USING (is_admin());

-- RLS policies for user_subscriptions
CREATE POLICY "user_subscriptions_read_own" ON public.user_subscriptions
FOR SELECT USING (
  auth.uid() = user_id OR 
  is_admin() OR
  customer_id = ANY(get_user_customer_ids())
);

CREATE POLICY "user_subscriptions_admin_all" ON public.user_subscriptions
FOR ALL USING (is_admin());

-- Insert sample subscription plans
INSERT INTO public.subscription_plans (name, slug, description, price_monthly, price_yearly) VALUES
('Free', 'free', 'Basic features for individuals', 0.00, 0.00),
('Pro', 'pro', 'Advanced features for professionals', 29.99, 299.99),
('Enterprise', 'enterprise', 'Full features for large teams', 99.99, 999.99)
ON CONFLICT (slug) DO NOTHING;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_started_at ON public.user_subscriptions(started_at);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_cancelled_at ON public.user_subscriptions(cancelled_at);