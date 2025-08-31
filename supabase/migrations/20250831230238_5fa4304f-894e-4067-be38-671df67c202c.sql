-- First, let's add some higher-tier plans for more revenue diversity
INSERT INTO subscription_plans (name, slug, price_monthly, price_cents, monthly_ai_requests, monthly_server_events, description, key, active)
VALUES 
  ('Business', 'business_plan', 49.00, 4900, 1000, 1000, '1000 AI requests and server events monthly', 'business_plan', true),
  ('Enterprise', 'enterprise_plan', 99.00, 9900, 2500, 2500, '2500 AI requests and server events monthly', 'enterprise_plan', true),
  ('Scale', 'scale_plan', 199.00, 19900, 5000, 5000, '5000 AI requests and server events monthly', 'scale_plan', true),
  ('Ultimate', 'ultimate_plan', 399.00, 39900, 10000, 10000, '10000 AI requests and server events monthly', 'ultimate_plan', true)
ON CONFLICT (slug) DO NOTHING;

-- Create subscription records for existing agents based on their plan_key
-- First, get some customer IDs for our sample data
DO $$
DECLARE
    customer_ids uuid[] := ARRAY(SELECT DISTINCT customer_id FROM agents LIMIT 10);
    agent_rec RECORD;
    plan_rec RECORD;
    subscription_start_date date;
    churn_date date;
BEGIN
    -- Create subscriptions for existing agents
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
    
    -- Now add 10 additional premium subscriptions as requested
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
            -- Pick a random premium plan
            random_plan_slug := (ARRAY['business_plan', 'enterprise_plan', 'scale_plan', 'ultimate_plan', 'premium_plan', 'pro_plan'])[1 + (RANDOM() * 5)::int];
            
            -- Get plan ID
            SELECT id INTO plan_id FROM subscription_plans WHERE slug = random_plan_slug;
            
            -- Create a synthetic user ID for this subscription
            random_user_id := gen_random_uuid();
            
            -- Random status (mostly active for revenue)
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

-- Create a view for easy revenue analytics
CREATE OR REPLACE VIEW revenue_analytics AS
WITH subscription_revenue AS (
  SELECT 
    us.customer_id,
    us.user_id,
    sp.price_monthly,
    sp.name as plan_name,
    us.status,
    us.started_at,
    us.ended_at,
    us.created_at
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.status IN ('active', 'suspended')
),
ai_costs AS (
  SELECT 
    a.customer_id,
    DATE_TRUNC('month', au.usage_date) as month,
    SUM(
      CASE au.model
        -- GPT models
        WHEN 'gpt-4o-mini' THEN (au.prompt_tokens * 0.000150 / 1000) + (au.completion_tokens * 0.000600 / 1000)
        WHEN 'gpt-4o' THEN (au.prompt_tokens * 0.005000 / 1000) + (au.completion_tokens * 0.015000 / 1000)
        WHEN 'gpt-5-mini-2025-08-07' THEN (au.prompt_tokens * 0.000200 / 1000) + (au.completion_tokens * 0.000800 / 1000)
        WHEN 'gpt-5-2025-08-07' THEN (au.prompt_tokens * 0.010000 / 1000) + (au.completion_tokens * 0.030000 / 1000)
        -- Claude models
        WHEN 'claude-3-5-sonnet-20241022' THEN (au.prompt_tokens * 0.003000 / 1000) + (au.completion_tokens * 0.015000 / 1000)
        WHEN 'claude-3-5-haiku-20241022' THEN (au.prompt_tokens * 0.000250 / 1000) + (au.completion_tokens * 0.001250 / 1000)
        WHEN 'claude-sonnet-4-20250514' THEN (au.prompt_tokens * 0.005000 / 1000) + (au.completion_tokens * 0.025000 / 1000)
        -- Gemini models
        WHEN 'gemini-1.5-pro' THEN (au.prompt_tokens * 0.003500 / 1000) + (au.completion_tokens * 0.010500 / 1000)
        WHEN 'gemini-2.0-flash-exp' THEN (au.prompt_tokens * 0.000075 / 1000) + (au.completion_tokens * 0.000300 / 1000)
        ELSE 0.0
      END
    ) as monthly_ai_cost
  FROM agent_usage au
  JOIN agents a ON au.agent_id = a.id
  WHERE au.usage_type = 'ai_request'
  GROUP BY a.customer_id, DATE_TRUNC('month', au.usage_date)
)
SELECT 
  sr.*,
  COALESCE(ac.monthly_ai_cost, 0) as ai_costs,
  (sr.price_monthly - COALESCE(ac.monthly_ai_cost, 0)) as net_revenue
FROM subscription_revenue sr
LEFT JOIN ai_costs ac ON sr.customer_id = ac.customer_id 
  AND DATE_TRUNC('month', CURRENT_DATE) = ac.month;