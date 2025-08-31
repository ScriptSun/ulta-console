-- Drop the existing certificates_safe_view
DROP VIEW IF EXISTS public.certificates_safe_view;

-- Recreate the view without SECURITY DEFINER to respect user permissions
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

-- Enable Row Level Security on the view
ALTER VIEW public.certificates_safe_view SET (security_invoker = true);

-- Add RLS policies for the certificates_safe_view
-- Users can only see certificates for agents in their tenant
CREATE POLICY "Users can view certificates for agents in their tenant" 
ON public.certificates_safe_view
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.agents a 
    WHERE a.id::text = certificates_safe_view.agent_id 
    AND (a.customer_id = ANY (get_user_customer_ids()) OR is_admin())
  )
);

-- Admins can see all certificates
CREATE POLICY "Admins can view all certificates via safe view" 
ON public.certificates_safe_view
FOR SELECT 
USING (is_admin());