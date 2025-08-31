-- Update RLS policies to remove team dependency where it affects UI
-- This allows the UI to work identically with or without team data

-- Update admin_profiles RLS to remove team dependency
DROP POLICY IF EXISTS "Team members can view profiles in same team" ON admin_profiles;

-- Create a simpler policy that allows users to view profiles they interact with
CREATE POLICY "Users can view profiles they need to access"
ON admin_profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR 
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('owner', 'admin')
  )
);

-- Update user_page_permissions RLS to be purely user-based (no team dependency)
-- The existing policies are already user-based, so no changes needed there

-- Console invites, member permissions, and widget scopes can keep their team policies
-- since they're not actively used when readFromTeams=false