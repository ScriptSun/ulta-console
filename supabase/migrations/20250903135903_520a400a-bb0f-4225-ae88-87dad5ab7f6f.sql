-- Fix the check_agent_usage_limit function to handle null/empty usage data properly
CREATE OR REPLACE FUNCTION check_agent_usage_limit(_agent_id UUID, _usage_type TEXT)
RETURNS TABLE(
    allowed BOOLEAN,
    current_usage INTEGER,
    limit_amount INTEGER,
    plan_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH agent_plan AS (
        SELECT 
            a.id as agent_id,
            CASE 
                WHEN _usage_type = 'ai_request' THEN sp.monthly_ai_requests
                WHEN _usage_type = 'server_event' THEN sp.monthly_server_events
                ELSE 999999 -- Default high limit for unknown types
            END as plan_limit,
            sp.name as plan_name
        FROM agents a
        JOIN subscription_plans sp ON sp.key = a.plan_key
        WHERE a.id = _agent_id
    ),
    current_usage_data AS (
        SELECT 
            COALESCE(SUM(au.count), 0) as total_usage
        FROM agent_usage au
        WHERE au.agent_id = _agent_id
        AND au.usage_type = _usage_type
        AND au.usage_date >= date_trunc('month', CURRENT_DATE)
    )
    SELECT 
        CASE 
            WHEN ap.plan_limit IS NULL THEN true -- Allow if no plan limit found (shouldn't happen but fail gracefully)
            WHEN ap.plan_limit = 0 THEN false -- Block if limit is 0
            WHEN cud.total_usage < ap.plan_limit THEN true
            ELSE false
        END as allowed,
        cud.total_usage::INTEGER as current_usage,
        COALESCE(ap.plan_limit, 0)::INTEGER as limit_amount,
        ap.plan_name::TEXT as plan_name
    FROM agent_plan ap
    CROSS JOIN current_usage_data cud;
END;
$$ LANGUAGE plpgsql;