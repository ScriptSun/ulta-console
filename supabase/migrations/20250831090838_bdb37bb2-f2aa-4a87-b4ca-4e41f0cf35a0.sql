-- Fix Security Definer View issue by ensuring certificates_safe_view uses security_invoker
-- This makes the view respect RLS policies of the underlying table

-- Drop any existing certificates_safe_view
DROP VIEW IF EXISTS public.certificates_safe_view;

-- Create a secure view with security_invoker = true 
-- This ensures the view respects RLS policies of the underlying certificates table
CREATE VIEW public.certificates_safe_view 
WITH (security_invoker = true) AS
SELECT 
    id,
    agent_id,
    fingerprint_sha256,
    cert_pem,
    issued_at,
    expires_at,
    revoked_at,
    created_at,
    updated_at
FROM public.certificates;

-- Set proper ownership
ALTER VIEW public.certificates_safe_view OWNER TO postgres;

-- Add comment explaining the security configuration
COMMENT ON VIEW public.certificates_safe_view IS 
'Safe view for certificates that respects RLS policies from the underlying certificates table via security_invoker=true';