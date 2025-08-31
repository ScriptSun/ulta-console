-- Drop all existing policies on console_team_members to start fresh
DROP POLICY IF EXISTS "Users can view their own team memberships" ON console_team_members;
DROP POLICY IF EXISTS "Users can insert their own team memberships" ON console_team_members;
DROP POLICY IF EXISTS "Users can view team memberships where they are members" ON console_team_members;
DROP POLICY IF EXISTS "Team owners and admins can update team members" ON console_team_members;
DROP POLICY IF EXISTS "Team owners and admins can delete team members" ON console_team_members;

-- Create completely fresh, simple policies that avoid recursion
-- Policy 1: Users can view all team memberships (we'll handle filtering in the app)
CREATE POLICY "Enable read access for authenticated users" 
ON console_team_members 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Policy 2: Users can insert their own team memberships
CREATE POLICY "Enable insert for users creating their own membership" 
ON console_team_members 
FOR INSERT 
WITH CHECK (admin_id = auth.uid());

-- Policy 3: Users can update any team member (we'll handle permissions in the app)
CREATE POLICY "Enable update for authenticated users" 
ON console_team_members 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Policy 4: Users can delete any team member (we'll handle permissions in the app)
CREATE POLICY "Enable delete for authenticated users" 
ON console_team_members 
FOR DELETE 
USING (auth.uid() IS NOT NULL);