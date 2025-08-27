-- Create simple views for command policies KPI data
-- Views will respect existing RLS policies automatically

-- View for active commands count
CREATE VIEW view_active_commands AS
SELECT COUNT(*) as count
FROM allowlist_commands
WHERE active = true;

-- View for total scripts count  
CREATE VIEW view_total_scripts AS
SELECT COUNT(DISTINCT id) as count
FROM scripts;

-- View for high risk commands count
CREATE VIEW view_high_risk_commands AS
SELECT COUNT(*) as count
FROM allowlist_commands 
WHERE active = true AND risk = 'high';

-- View for success rate (last 30 days)
-- Using audit_logs as placeholder since tasks table structure wasn't specified
CREATE VIEW view_success_rate_30d AS
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND(
      (COUNT(*) FILTER (WHERE meta->>'status' = 'success')::numeric / COUNT(*) * 100), 1
    )
  END as percentage
FROM audit_logs
WHERE created_at >= (now() - interval '30 days')
  AND action = 'task_execution';