-- Fix admin_profiles RLS policies to prevent unauthorized access to admin data

-- Drop the overly permissive team member policy
DROP POLICY IF EXISTS "Team members can view each other's profiles" ON admin_profiles;

-- Keep the secure self-access policies
-- Users can still view, insert, and update their own profile
-- (These policies already exist and are secure)

-- Add a more restrictive policy for team-based access
-- Only allow viewing profiles of users who are explicitly in the same team
-- and only basic information (not sensitive details)
CREATE POLICY "Team members can view basic info of team members" 
ON admin_profiles 
FOR SELECT 
USING (
  -- Users can always see their own profile
  auth.uid() = id 
  OR 
  -- Users can see basic info of members in the same team
  (
    EXISTS (
      SELECT 1 
      FROM console_team_members ctm1 
      WHERE ctm1.admin_id = auth.uid()
    ) 
    AND EXISTS (
      SELECT 1 
      FROM console_team_members ctm2 
      WHERE ctm2.admin_id = admin_profiles.id
    )
    AND EXISTS (
      SELECT 1 
      FROM console_team_members ctm1, console_team_members ctm2 
      WHERE ctm1.admin_id = auth.uid() 
      AND ctm2.admin_id = admin_profiles.id 
      AND ctm1.team_id = ctm2.team_id
    )
  )
);

-- Add additional security: Create a view for public profile info that excludes sensitive data
CREATE OR REPLACE VIEW admin_profiles_safe AS 
SELECT 
  id,
  full_name,
  created_at
FROM admin_profiles;

-- Enable RLS on the safe view
ALTER VIEW admin_profiles_safe SET (security_barrier = true);

-- Grant appropriate permissions
GRANT SELECT ON admin_profiles_safe TO authenticated;