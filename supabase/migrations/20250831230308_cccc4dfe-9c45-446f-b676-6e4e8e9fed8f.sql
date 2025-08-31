-- Add higher-tier plans (only using price_cents, price_monthly will be calculated automatically)
INSERT INTO subscription_plans (name, slug, price_cents, monthly_ai_requests, monthly_server_events, description, key, active)
VALUES 
  ('Business', 'business_plan', 4900, 1000, 1000, '1000 AI requests and server events monthly', 'business_plan', true),
  ('Enterprise', 'enterprise_plan', 9900, 2500, 2500, '2500 AI requests and server events monthly', 'enterprise_plan', true),
  ('Scale', 'scale_plan', 19900, 5000, 5000, '5000 AI requests and server events monthly', 'scale_plan', true),
  ('Ultimate', 'ultimate_plan', 39900, 10000, 10000, '10000 AI requests and server events monthly', 'ultimate_plan', true)
ON CONFLICT (slug) DO NOTHING;

-- Create subscription records for existing agents and add premium ones
DO $$
DECLARE
    customer_ids uuid[] := ARRAY(SELECT DISTINCT customer_id FROM agents LIMIT 10);
    agent_rec RECORD;
    plan_rec RECORD;
    subscription_start_date date;
    churn_date date;
BEGIN
    -- Create subscriptions for existing agents based on their plan_key
    FOR agent_rec IN 
        SELECT a.*, ap.id as admin_profile_id 
        FROM agents a 
        LEFT JOIN admin_profiles ap ON ap.id = a.user_id
        WHERE a.customer_id = ANY(customer_ids)
    LOOP
        -- Get the plan details
        SELECT * INTO plan_rec FROM subscription_plans WHERE slug = agent_rec.plan_key;
        
        IF plan_rec.id IS NOT NULL THEN
            -- Determine subscription dates based on agent status
            subscription_start_date := CURRENT_DATE - (RANDOM() * 90)::int;
            
            IF agent_rec.status = 'terminated' THEN
                churn_date := CURRENT_DATE - (RANDOM() * 30)::int;
            ELSE
                churn_date := NULL;
            END IF;
            
            -- Create subscription record
            INSERT INTO user_subscriptions (
                user_id, 
                customer_id, 
                plan_id, 
                status, 
                started_at, 
                ended_at,
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
                churn_date,
                subscription_start_date
            ) ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
    
    -- Add 10 additional premium subscriptions as requested
    FOR i IN 1..10 LOOP
        DECLARE
            random_customer_id uuid := customer_ids[1 + (RANDOM() * (array_length(customer_ids, 1) - 1))::int];
            random_plan_slug text;
            random_user_id uuid;
            plan_id uuid;
            sub_status text;
            start_date date;
            end_date date;
        BEGIN
            -- Pick a random premium plan (higher chance for premium plans)
            random_plan_slug := (ARRAY['business_plan', 'enterprise_plan', 'scale_plan', 'ultimate_plan', 'premium_plan', 'pro_plan'])[1 + (RANDOM() * 5)::int];
            
            -- Get plan ID
            SELECT id INTO plan_id FROM subscription_plans WHERE slug = random_plan_slug;
            
            -- Create a synthetic user ID for this subscription
            random_user_id := gen_random_uuid();
            
            -- Random status (mostly active for revenue - 80% active)
            sub_status := CASE 
                WHEN RANDOM() < 0.8 THEN 'active'
                WHEN RANDOM() < 0.9 THEN 'suspended'
                ELSE 'cancelled'
            END;
            
            start_date := CURRENT_DATE - (RANDOM() * 180)::int;
            
            IF sub_status = 'cancelled' THEN
                end_date := start_date + (RANDOM() * 60)::int;
            ELSE
                end_date := NULL;
            END IF;
            
            -- Insert the premium subscription
            INSERT INTO user_subscriptions (
                user_id,
                customer_id,
                plan_id,
                status,
                started_at,
                ended_at,
                created_at
            ) VALUES (
                random_user_id,
                random_customer_id,
                plan_id,
                sub_status,
                start_date,
                end_date,
                start_date
            );
        END;
    END LOOP;
END $$;