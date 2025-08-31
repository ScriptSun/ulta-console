-- Fix all SECURITY DEFINER functions to include search_path for security
-- This prevents SQL injection through search_path manipulation

-- Update functions that are missing search_path configuration
ALTER FUNCTION public.activate_batch_version(uuid, integer, uuid)
SET search_path = 'public';

ALTER FUNCTION public.activate_variant_version(uuid, text, integer, uuid)
SET search_path = 'public';

ALTER FUNCTION public.can_activate_in_customer(uuid)
SET search_path = 'public';

ALTER FUNCTION public.get_next_batch_version(uuid)
SET search_path = 'public';

ALTER FUNCTION public.get_next_variant_version(uuid, text)
SET search_path = 'public';

ALTER FUNCTION public.get_user_customer_ids()
SET search_path = 'public';

ALTER FUNCTION public.get_user_role_in_customer(uuid, app_role)
SET search_path = 'public';

ALTER FUNCTION public.is_admin()
SET search_path = 'public';

ALTER FUNCTION public.validate_batch_dependencies(uuid)
SET search_path = 'public';

ALTER FUNCTION public.validate_variant_dependencies(uuid, text)
SET search_path = 'public';