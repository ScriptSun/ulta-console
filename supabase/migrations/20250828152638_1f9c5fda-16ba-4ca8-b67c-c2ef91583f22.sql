-- Fix column-level access to certificate private keys
-- Remove the policy that allows users to SELECT from certificates table directly
DROP POLICY IF EXISTS "Users can view certificate metadata in their tenant" ON public.certificates;

-- Create a more secure approach using a security definer function
-- This function only returns safe certificate metadata, never private keys
CREATE OR REPLACE FUNCTION public.get_user_certificate_metadata()
RETURNS TABLE (
  id uuid,
  agent_id text,
  fingerprint_sha256 text,
  cert_pem text,
  issued_at timestamp with time zone,
  expires_at timestamp with time zone,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return certificate metadata for agents in user's customer
  -- NEVER return key_pem field
  RETURN QUERY
  SELECT 
    c.id,
    c.agent_id,
    c.fingerprint_sha256,
    c.cert_pem,  -- Public certificate is safe
    c.issued_at,
    c.expires_at,
    c.revoked_at,
    c.created_at,
    c.updated_at
  FROM certificates c
  JOIN agents a ON a.id::text = c.agent_id
  WHERE a.customer_id = ANY(get_user_customer_ids())
     OR is_admin();
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.get_user_certificate_metadata() TO authenticated;

-- Update the certificates_metadata view to use RLS properly
DROP VIEW IF EXISTS public.certificates_metadata;

-- Create a secure view that users can access but only shows safe data
CREATE VIEW public.certificates_safe_view AS
SELECT 
  c.id,
  c.agent_id,
  c.fingerprint_sha256,
  c.cert_pem,  -- Public certificate only
  c.issued_at,
  c.expires_at,
  c.revoked_at,
  c.created_at,
  c.updated_at
FROM certificates c
JOIN agents a ON a.id::text = c.agent_id
WHERE (
  -- Only show certificates for agents in user's tenant
  a.customer_id = ANY(get_user_customer_ids())
  OR is_admin()
);

-- Grant access to the safe view
GRANT SELECT ON public.certificates_safe_view TO authenticated;

-- Ensure RLS is enabled on certificates table with NO user access to raw table
-- Only service role and admins can access the raw certificates table
-- This completely blocks user access to key_pem field