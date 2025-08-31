-- Add missing columns to subscription_plans if they don't exist
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS price_monthly DECIMAL(10,2) GENERATED ALWAYS AS (price_cents / 100.0) STORED;

ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS slug TEXT GENERATED ALWAYS AS (LOWER(key)) STORED;

-- Add missing columns to user_subscriptions if they don't exist  
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE GENERATED ALWAYS AS (current_period_start) STORED;

ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE GENERATED ALWAYS AS (current_period_end) STORED;

-- Ensure RLS is enabled
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$
BEGIN
  -- subscription_plans policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_plans' AND policyname = 'subscription_plans_read_policy') THEN
    CREATE POLICY "subscription_plans_read_policy" ON public.subscription_plans FOR SELECT USING (true);
  END IF;
  
  -- user_subscriptions policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_subscriptions' AND policyname = 'user_subscriptions_read_tenant') THEN
    CREATE POLICY "user_subscriptions_read_tenant" ON public.user_subscriptions
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

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_started_at ON public.user_subscriptions(current_period_start);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_cancelled_at ON public.user_subscriptions(cancelled_at);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_customer_id ON public.user_subscriptions(customer_id);