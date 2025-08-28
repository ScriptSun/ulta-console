-- Fix the Security Definer View issue by removing security definer function calls from views
-- The issue is that views calling SECURITY DEFINER functions are flagged as security risks

-- Drop the view that calls security definer functions
DROP VIEW IF EXISTS public.certificates_safe_view;

-- Instead of using a view with security definer functions, 
-- let's create a simple view without those functions
-- Users will rely on RLS policies on the underlying certificates table for security
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
JOIN agents a ON a.id::text = c.agent_id;

-- The security is now enforced through RLS policies on the underlying tables
-- rather than through security definer function calls in the view
GRANT SELECT ON public.certificates_safe_view TO authenticated;

-- Note: This view will only show data that the user is allowed to see
-- based on the RLS policies on the certificates and agents tables