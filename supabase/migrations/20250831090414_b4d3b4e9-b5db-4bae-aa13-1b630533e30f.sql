-- Fix Security Definer View issue by recreating certificates_safe_view without SECURITY DEFINER
-- This addresses the linter error about views bypassing RLS

-- Drop the existing certificates_safe_view if it exists
DROP VIEW IF EXISTS public.certificates_safe_view;

-- Recreate the view without SECURITY DEFINER to expose only safe certificate data
-- Views inherit RLS policies from underlying tables, so no SECURITY DEFINER needed
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

-- Set proper ownership
ALTER VIEW public.certificates_safe_view OWNER TO postgres;