-- Fix the overly permissive profiles RLS policy
-- The current policy allows anyone to view all profiles, which is a security risk

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a more restrictive policy that allows:
-- 1. Users to view their own profile
-- 2. Users to view profiles of other users in their organization (same customer_id)
CREATE POLICY "Users can view own profile and org members" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can see their own profile
  auth.uid() = id 
  OR 
  -- Users can see profiles of others in their organization
  EXISTS (
    SELECT 1 
    FROM public.user_roles ur1, public.user_roles ur2
    WHERE ur1.user_id = auth.uid()
    AND ur2.user_id = profiles.id
    AND ur1.customer_id = ur2.customer_id
  )
);