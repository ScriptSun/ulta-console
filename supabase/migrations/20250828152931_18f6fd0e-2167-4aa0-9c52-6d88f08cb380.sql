-- Fix Security Definer View issue
-- The problem is that views should not bypass user-level RLS policies

-- Drop and recreate the certificates_safe_view without security definer properties
DROP VIEW IF EXISTS public.certificates_safe_view;

-- Create a standard view that respects user permissions without security definer
CREATE VIEW public.certificates_safe_view AS
SELECT 
  c.id,
  c.agent_id,
  c.fingerprint_sha256,
  c.cert_pem,  -- Public certificate is safe to expose
  c.issued_at,
  c.expires_at,
  c.revoked_at,
  c.created_at,
  c.updated_at
FROM certificates c
JOIN agents a ON a.id::text = c.agent_id
WHERE (
  -- This WHERE clause provides the security filter
  -- Users can only see certificates for agents in their customer
  a.customer_id = ANY(get_user_customer_ids())
  OR is_admin()
);

-- Ensure normal permissions without security definer properties
GRANT SELECT ON public.certificates_safe_view TO authenticated;

-- The view now properly enforces user-level permissions rather than creator permissions
-- This eliminates the Security Definer View security risk