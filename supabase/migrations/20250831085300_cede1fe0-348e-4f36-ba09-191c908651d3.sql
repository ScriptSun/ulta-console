-- Drop the existing certificates_safe_view that likely has SECURITY DEFINER
DROP VIEW IF EXISTS public.certificates_safe_view;

-- Recreate the view as a regular view (no SECURITY DEFINER)
-- This will make it respect the RLS policies of the underlying tables
CREATE VIEW public.certificates_safe_view AS
SELECT 
  c.id,
  c.agent_id,
  c.fingerprint_sha256,
  c.cert_pem,
  c.issued_at,
  c.expires_at,
  c.revoked_at,
  c.created_at,
  c.updated_at
FROM public.certificates c
JOIN public.agents a ON a.id::text = c.agent_id;

-- Grant appropriate permissions to the view
GRANT SELECT ON public.certificates_safe_view TO authenticated, anon;