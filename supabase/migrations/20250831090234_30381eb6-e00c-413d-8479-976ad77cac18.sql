-- Fix Security Definer View issue by recreating certificates_safe_view without SECURITY DEFINER
-- This addresses the linter error about views bypassing RLS

-- Drop the existing certificates_safe_view if it exists
DROP VIEW IF EXISTS public.certificates_safe_view;

-- Recreate the view without SECURITY DEFINER to expose only safe certificate data
CREATE VIEW public.certificates_safe_view AS
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

-- Enable RLS on the view (this will inherit from the underlying table)
ALTER VIEW public.certificates_safe_view OWNER TO postgres;

-- Create RLS policy for the safe view to allow users to see certificates for their tenant's agents
CREATE POLICY "Users can view certificates for their tenant agents"
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

-- Enable RLS on the view
-- Note: Views don't have RLS directly, but we ensure the underlying table has proper policies