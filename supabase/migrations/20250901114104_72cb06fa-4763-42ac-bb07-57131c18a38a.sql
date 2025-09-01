-- Fix duplicate team memberships and ensure single owner
-- First, get the primary team ID (oldest team)
DO $$
DECLARE
    primary_team_id UUID;
    duplicate_member_id UUID;
BEGIN
    -- Get the oldest team as primary
    SELECT id INTO primary_team_id FROM console_teams ORDER BY created_at LIMIT 1;
    
    -- Remove duplicate team memberships for the same user, keeping the first one created
    FOR duplicate_member_id IN 
        SELECT id FROM console_team_members ctm1
        WHERE EXISTS (
            SELECT 1 FROM console_team_members ctm2 
            WHERE ctm1.admin_id = ctm2.admin_id 
            AND ctm1.id > ctm2.id
        )
    LOOP
        DELETE FROM console_team_members WHERE id = duplicate_member_id;
    END LOOP;
    
    -- Update all remaining members to use the primary team
    UPDATE console_team_members SET team_id = primary_team_id WHERE team_id != primary_team_id;
    
    -- Delete extra teams
    DELETE FROM console_teams WHERE id != primary_team_id;
    
    -- Ensure the main user is Owner
    UPDATE console_team_members 
    SET role = 'Owner'
    WHERE admin_id = '5bb0dbc1-471d-4ac6-9be8-f851a59ef3fc';
END $$;

-- Add unique constraint on email to prevent future duplicates
-- Check if constraint exists first
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_admin_email'
    ) THEN
        ALTER TABLE admin_profiles ADD CONSTRAINT unique_admin_email UNIQUE (email);
    END IF;
END $$;