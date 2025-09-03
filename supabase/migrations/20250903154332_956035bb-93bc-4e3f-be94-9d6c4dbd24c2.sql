-- First check if subscription_plans table needs RLS policies
-- Enable RLS on subscription_plans if not already enabled
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscription_plans table
-- Allow authenticated users to read all subscription plans
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'subscription_plans' 
        AND policyname = 'Anyone can read subscription plans'
    ) THEN
        CREATE POLICY "Anyone can read subscription plans" 
        ON public.subscription_plans 
        FOR SELECT 
        USING (true);
    END IF;
END $$;

-- Allow authenticated users to insert subscription plans
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'subscription_plans' 
        AND policyname = 'Authenticated users can create subscription plans'
    ) THEN
        CREATE POLICY "Authenticated users can create subscription plans" 
        ON public.subscription_plans 
        FOR INSERT 
        WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- Allow authenticated users to update subscription plans
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'subscription_plans' 
        AND policyname = 'Authenticated users can update subscription plans'
    ) THEN
        CREATE POLICY "Authenticated users can update subscription plans" 
        ON public.subscription_plans 
        FOR UPDATE 
        USING (auth.uid() IS NOT NULL)
        WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- Allow authenticated users to delete subscription plans
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'subscription_plans' 
        AND policyname = 'Authenticated users can delete subscription plans'
    ) THEN
        CREATE POLICY "Authenticated users can delete subscription plans" 
        ON public.subscription_plans 
        FOR DELETE 
        USING (auth.uid() IS NOT NULL);
    END IF;
END $$;