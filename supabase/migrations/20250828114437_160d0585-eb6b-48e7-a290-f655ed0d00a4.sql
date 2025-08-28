-- Fix Security Definer Views vulnerability
-- These views were using SECURITY DEFINER which bypasses RLS policies
-- Converting them to SECURITY INVOKER (default) to respect user permissions

-- Drop and recreate v_batch_variants_active with SECURITY INVOKER
DROP VIEW IF EXISTS public.v_batch_variants_active;
CREATE VIEW public.v_batch_variants_active 
WITH (security_invoker = true) AS
SELECT 
    batch_id,
    os,
    version,
    sha256,
    source,
    notes,
    min_os_version,
    created_at,
    created_by
FROM script_batch_variants sbv
WHERE active = true;

-- Drop and recreate view_active_commands with SECURITY INVOKER  
DROP VIEW IF EXISTS public.view_active_commands;
CREATE VIEW public.view_active_commands
WITH (security_invoker = true) AS
SELECT count(*) AS count
FROM allowlist_commands
WHERE active = true;

-- Drop and recreate view_high_risk_commands with SECURITY INVOKER
DROP VIEW IF EXISTS public.view_high_risk_commands;
CREATE VIEW public.view_high_risk_commands
WITH (security_invoker = true) AS
SELECT count(*) AS count
FROM allowlist_commands
WHERE active = true AND risk = 'high';

-- Drop and recreate view_success_rate_30d with SECURITY INVOKER
DROP VIEW IF EXISTS public.view_success_rate_30d;
CREATE VIEW public.view_success_rate_30d
WITH (security_invoker = true) AS
SELECT
    CASE
        WHEN count(*) = 0 THEN 0::numeric
        ELSE round(
            (count(*) FILTER (WHERE (meta ->> 'status') = 'success'))::numeric / 
            count(*)::numeric * 100::numeric, 
            1
        )
    END AS percentage
FROM audit_logs
WHERE created_at >= (now() - interval '30 days') 
AND action = 'task_execution';

-- Drop and recreate view_total_scripts with SECURITY INVOKER
DROP VIEW IF EXISTS public.view_total_scripts;
CREATE VIEW public.view_total_scripts
WITH (security_invoker = true) AS
SELECT count(DISTINCT id) AS count
FROM scripts;