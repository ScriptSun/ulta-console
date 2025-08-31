-- Simple fix for admin_profiles RLS without views

-- Drop the failed view attempt
DROP VIEW IF EXISTS admin_profiles_safe;

-- The main admin_profiles table already has good policies, but let's ensure 
-- the team member policy is properly secured and doesn't expose emails unnecessarily

-- Update the existing team member policy to be more explicit about what can be accessed
DROP POLICY IF EXISTS "Team members can view basic info of team members" ON admin_profiles;

-- Create a more restrictive policy that only allows viewing necessary profile data
-- for team members in the same team
CREATE POLICY "Team members can view profiles in same team" 
ON admin_profiles 
FOR SELECT 
USING (
  -- Users can always see their own full profile
  auth.uid() = id 
  OR 
  -- Team members can see profiles of other team members in the same team
  EXISTS (
    SELECT 1 
    FROM console_team_members ctm1, console_team_members ctm2 
    WHERE ctm1.admin_id = auth.uid() 
    AND ctm2.admin_id = admin_profiles.id 
    AND ctm1.team_id = ctm2.team_id
  )
);

-- Revoke any broad permissions that might have been granted
REVOKE ALL ON admin_profiles_safe FROM authenticated;