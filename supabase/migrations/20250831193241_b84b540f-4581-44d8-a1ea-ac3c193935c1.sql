-- Fix the security definer view issue introduced in previous migration

-- Drop the problematic view
DROP VIEW IF EXISTS admin_profiles_safe;

-- Recreate the view without security definer properties
CREATE VIEW admin_profiles_safe AS 
SELECT 
  id,
  full_name,
  created_at
FROM admin_profiles;

-- Apply RLS policies to the view through standard mechanisms
ALTER VIEW admin_profiles_safe ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for the safe view
CREATE POLICY "Team members can view safe profile info" 
ON admin_profiles_safe 
FOR SELECT 
USING (
  -- Users can see their own basic info
  auth.uid() = id 
  OR 
  -- Team members can see basic info of other team members
  EXISTS (
    SELECT 1 
    FROM console_team_members ctm1, console_team_members ctm2 
    WHERE ctm1.admin_id = auth.uid() 
    AND ctm2.admin_id = admin_profiles_safe.id 
    AND ctm1.team_id = ctm2.team_id
  )
);

-- Grant select permissions to authenticated users
GRANT SELECT ON admin_profiles_safe TO authenticated;