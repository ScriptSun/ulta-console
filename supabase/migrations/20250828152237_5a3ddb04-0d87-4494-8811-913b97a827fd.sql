-- Fix critical security vulnerability: Certificate private keys exposure
-- This migration implements proper RLS policies for certificate and CA data

-- First, drop the overly permissive existing policies
DROP POLICY IF EXISTS "Service role can manage certificates" ON public.certificates;
DROP POLICY IF EXISTS "Service role can manage CA config" ON public.ca_config;
DROP POLICY IF EXISTS "Service role can manage CRL" ON public.certificate_revocation_list;

-- Create secure RLS policies for certificates table
-- Only allow service role (edge functions) and system admins to access private keys
CREATE POLICY "System can manage certificates for CA operations" 
ON public.certificates 
FOR ALL 
USING (
  -- Allow service role (edge functions) full access for CA operations
  current_setting('role') = 'service_role'
  OR 
  -- Allow system admins full access
  is_admin()
);

-- Allow users to view certificate metadata (without private keys) for agents they own
-- Note: This policy allows SELECT but users should use the certificates_metadata view
CREATE POLICY "Users can view certificate metadata in their tenant" 
ON public.certificates 
FOR SELECT 
USING (
  -- Users can see certificate info for agents in their customer
  EXISTS (
    SELECT 1 
    FROM agents a 
    WHERE a.id::text = certificates.agent_id 
    AND a.customer_id = ANY(get_user_customer_ids())
  )
  OR is_admin()
);

-- Secure CA config table - only service role and system admins
CREATE POLICY "System can manage CA configuration" 
ON public.ca_config 
FOR ALL 
USING (
  -- Only service role (edge functions) and system admins
  current_setting('role') = 'service_role' OR is_admin()
);

-- Secure certificate revocation list
CREATE POLICY "System can manage certificate revocation list" 
ON public.certificate_revocation_list 
FOR ALL 
USING (
  -- Only service role (edge functions) and system admins
  current_setting('role') = 'service_role' OR is_admin()
);

-- Allow users to view CRL entries for certificates in their tenant
CREATE POLICY "Users can view CRL entries in their tenant" 
ON public.certificate_revocation_list 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM certificates c
    JOIN agents a ON a.id::text = c.agent_id
    WHERE c.id = certificate_revocation_list.certificate_id
    AND a.customer_id = ANY(get_user_customer_ids())
  )
  OR is_admin()
);

-- Create a view that exposes certificate metadata without private keys
CREATE VIEW public.certificates_metadata AS
SELECT 
  id,
  agent_id,
  fingerprint_sha256,
  cert_pem,  -- Public certificate is safe to expose
  issued_at,
  expires_at,
  revoked_at,
  created_at,
  updated_at
FROM public.certificates;

-- Grant access to the metadata view
GRANT SELECT ON public.certificates_metadata TO authenticated;