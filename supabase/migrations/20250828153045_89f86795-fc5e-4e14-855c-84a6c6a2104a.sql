-- Remove the security definer function that's causing the linter warning
-- We can rely on the standard view instead which provides the same functionality

-- Drop the security definer function since we have the certificates_safe_view
DROP FUNCTION IF EXISTS public.get_user_certificate_metadata();

-- The certificates_safe_view provides the same functionality without security definer
-- Users can query: SELECT * FROM certificates_safe_view;
-- This eliminates the Security Definer View/Function warning