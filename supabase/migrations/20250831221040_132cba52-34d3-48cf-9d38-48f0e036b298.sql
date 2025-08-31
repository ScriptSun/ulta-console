-- Create subscription_plans table if not exists
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add slug column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscription_plans' AND column_name='slug') THEN
    ALTER TABLE public.subscription_plans ADD COLUMN slug TEXT UNIQUE;
  END IF;
END $$;

-- Create user_subscriptions table if not exists
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

-- Enable RLS if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'subscription_plans' AND rowsecurity = true) THEN
    ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_subscriptions' AND rowsecurity = true) THEN
    ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create policies if they don't exist
DO $$
BEGIN
  -- subscription_plans policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_plans' AND policyname = 'subscription_plans_read_policy') THEN
    CREATE POLICY "subscription_plans_read_policy" ON public.subscription_plans FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_plans' AND policyname = 'subscription_plans_admin_policy') THEN
    CREATE POLICY "subscription_plans_admin_policy" ON public.subscription_plans FOR ALL USING (is_admin());
  END IF;
  
  -- user_subscriptions policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_subscriptions' AND policyname = 'user_subscriptions_read_own') THEN
    CREATE POLICY "user_subscriptions_read_own" ON public.user_subscriptions
    FOR SELECT USING (
      auth.uid() = user_id OR 
      is_admin() OR
      customer_id = ANY(get_user_customer_ids())
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_subscriptions' AND policyname = 'user_subscriptions_admin_all') THEN
    CREATE POLICY "user_subscriptions_admin_all" ON public.user_subscriptions FOR ALL USING (is_admin());
  END IF;
END $$;

-- Insert sample plans only if table is empty
INSERT INTO public.subscription_plans (name, slug, description, price_monthly, price_yearly) 
SELECT 'Free', 'free', 'Basic features for individuals', 0.00, 0.00
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE slug = 'free');

INSERT INTO public.subscription_plans (name, slug, description, price_monthly, price_yearly) 
SELECT 'Pro', 'pro', 'Advanced features for professionals', 29.99, 299.99
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE slug = 'pro');

INSERT INTO public.subscription_plans (name, slug, description, price_monthly, price_yearly) 
SELECT 'Enterprise', 'enterprise', 'Full features for large teams', 99.99, 999.99
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE slug = 'enterprise');

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_started_at ON public.user_subscriptions(started_at);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_cancelled_at ON public.user_subscriptions(cancelled_at);