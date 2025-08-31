-- Add higher-tier plans
INSERT INTO subscription_plans (name, key, price_cents, monthly_ai_requests, monthly_server_events, description, active)
VALUES 
  ('Business', 'business_plan', 4900, 1000, 1000, '1000 AI requests and server events monthly', true),
  ('Enterprise', 'enterprise_plan', 9900, 2500, 2500, '2500 AI requests and server events monthly', true),
  ('Scale', 'scale_plan', 19900, 5000, 5000, '5000 AI requests and server events monthly', true),
  ('Ultimate', 'ultimate_plan', 39900, 10000, 10000, '10000 AI requests and server events monthly', true)
ON CONFLICT (key) DO NOTHING;

-- Create subscription records for existing agents and add premium ones
DO $$
DECLARE
    customer_ids uuid[] := ARRAY(SELECT DISTINCT customer_id FROM agents LIMIT 10);
    agent_rec RECORD;
    plan_rec RECORD;
    subscription_start_date timestamp with time zone;
    subscription_end_date timestamp with time zone;
    cancellation_date timestamp with time zone;
BEGIN
    -- Create subscriptions for existing agents based on their plan_key
    FOR agent_rec IN 
        SELECT a.*, ap.id as admin_profile_id 
        FROM agents a 
        LEFT JOIN admin_profiles ap ON ap.id = a.user_id
        WHERE a.customer_id = ANY(customer_ids)
    LOOP
        -- Get the plan details by key
        SELECT * INTO plan_rec FROM subscription_plans WHERE key = agent_rec.plan_key;
        
        IF plan_rec.id IS NOT NULL THEN
            -- Determine subscription dates based on agent status
            subscription_start_date := CURRENT_DATE - (RANDOM() * 90)::int * interval '1 day';
            subscription_end_date := subscription_start_date + interval '1 month';
            
            IF agent_rec.status = 'terminated' THEN
                cancellation_date := CURRENT_DATE - (RANDOM() * 30)::int * interval '1 day';
            ELSE
                cancellation_date := NULL;
            END IF;
            
            -- Create subscription record (only non-generated columns)
            INSERT INTO user_subscriptions (
                user_id, 
                customer_id, 
                plan_id, 
                status, 
                current_period_start,
                current_period_end,
                cancelled_at,
                created_at
            ) VALUES (
                COALESCE(agent_rec.admin_profile_id, agent_rec.user_id),
                agent_rec.customer_id,
                plan_rec.id,
                CASE 
                    WHEN agent_rec.status = 'active' THEN 'active'
                    WHEN agent_rec.status = 'suspended' THEN 'suspended'
                    ELSE 'cancelled'
                END,
                subscription_start_date,
                CASE 
                    WHEN cancellation_date IS NULL THEN subscription_end_date
                    ELSE cancellation_date
                END,
                cancellation_date,
                subscription_start_date
            ) ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
    
    -- Add 10 additional premium subscriptions as requested
    FOR i IN 1..10 LOOP
        DECLARE
            random_customer_id uuid := customer_ids[1 + (RANDOM() * (array_length(customer_ids, 1) - 1))::int];
            random_plan_key text;
            random_user_id uuid;
            plan_id uuid;
            sub_status text;
            start_date timestamp with time zone;
            end_date timestamp with time zone;
            cancel_date timestamp with time zone;
        BEGIN
            -- Pick a random premium plan (higher chance for premium plans)
            random_plan_key := (ARRAY['business_plan', 'enterprise_plan', 'scale_plan', 'ultimate_plan', 'premium_plan', 'pro_plan'])[1 + (RANDOM() * 5)::int];
            
            -- Get plan ID by key
            SELECT id INTO plan_id FROM subscription_plans WHERE key = random_plan_key;
            
            -- Create a synthetic user ID for this subscription
            random_user_id := gen_random_uuid();
            
            -- Random status (mostly active for revenue - 80% active)
            sub_status := CASE 
                WHEN RANDOM() < 0.8 THEN 'active'
                WHEN RANDOM() < 0.9 THEN 'suspended'
                ELSE 'cancelled'
            END;
            
            start_date := CURRENT_DATE - (RANDOM() * 180)::int * interval '1 day';
            end_date := start_date + interval '1 month';
            
            IF sub_status = 'cancelled' THEN
                cancel_date := start_date + (RANDOM() * 60)::int * interval '1 day';
            ELSE
                cancel_date := NULL;
            END IF;
            
            -- Insert the premium subscription (only non-generated columns)
            INSERT INTO user_subscriptions (
                user_id,
                customer_id,
                plan_id,
                status,
                current_period_start,
                current_period_end,
                cancelled_at,
                created_at
            ) VALUES (
                random_user_id,
                random_customer_id,
                plan_id,
                sub_status,
                start_date,
                CASE 
                    WHEN cancel_date IS NULL THEN end_date
                    ELSE cancel_date
                END,
                cancel_date,
                start_date
            );
        END;
    END LOOP;
END $$;