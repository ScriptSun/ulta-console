-- Fix Security Policies exposure by restricting access to authenticated users only
-- This addresses the security vulnerability where command_policies were publicly readable

-- Drop the overly permissive policy that allows anyone to read system policies
DROP POLICY IF EXISTS "Anyone can read default system policies" ON public.command_policies;

-- Create a new restricted policy that requires authentication to read system policies
CREATE POLICY "Authenticated users can read default system policies"
ON public.command_policies
FOR SELECT
TO authenticated
USING (
  -- Only allow authenticated users to see system policies
  -- and only if they have some role in any customer organization
  customer_id = '00000000-0000-0000-0000-000000000001'::uuid 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid()
  )
);

-- Add audit logging for this security fix
INSERT INTO public.audit_logs (
  customer_id,
  actor,
  action,
  target,
  meta
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'system',
  'security_policy_fix',
  'command_policies_table',
  jsonb_build_object(
    'issue', 'Removed public access to system policies',
    'action', 'Restricted to authenticated users only',
    'timestamp', now()
  )
);