-- Fix duplicate team memberships and ensure single owner
-- First, find duplicate team memberships for the same user
WITH duplicate_memberships AS (
  SELECT 
    admin_id,
    MIN(id) as keep_id,
    array_agg(id) as all_ids
  FROM console_team_members
  GROUP BY admin_id
  HAVING COUNT(*) > 1
),
teams_to_keep AS (
  SELECT MIN(team_id) as primary_team_id FROM console_teams
)
-- Delete duplicate team memberships, keeping only the first one
DELETE FROM console_team_members 
WHERE id IN (
  SELECT unnest(all_ids[2:]) 
  FROM duplicate_memberships
);

-- Update remaining team members to use the primary team
UPDATE console_team_members 
SET team_id = (SELECT primary_team_id FROM teams_to_keep)
WHERE team_id != (SELECT primary_team_id FROM teams_to_keep);

-- Delete extra teams, keeping only the primary one
DELETE FROM console_teams 
WHERE id != (SELECT MIN(id) FROM console_teams);

-- Ensure the main user is Owner with full permissions
UPDATE console_team_members 
SET role = 'Owner'
WHERE admin_id = '5bb0dbc1-471d-4ac6-9be8-f851a59ef3fc';

-- Add unique constraint on email in admin_profiles (should already be unique via user ID)
-- This ensures no duplicate emails can be created
ALTER TABLE admin_profiles ADD CONSTRAINT unique_admin_email UNIQUE (email);