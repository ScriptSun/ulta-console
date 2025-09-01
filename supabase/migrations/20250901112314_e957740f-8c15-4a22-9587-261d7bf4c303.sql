-- First, let's ensure you have Owner role in console_team_members
-- Get the current user's ID and set them as Owner

DO $$
DECLARE
    current_user_id UUID;
    team_record RECORD;
BEGIN
    -- Get current authenticated user ID
    current_user_id := auth.uid();
    
    IF current_user_id IS NOT NULL THEN
        -- Check if user has any team membership
        SELECT * INTO team_record 
        FROM console_team_members 
        WHERE admin_id = current_user_id 
        LIMIT 1;
        
        IF team_record.id IS NOT NULL THEN
            -- Update existing membership to Owner
            UPDATE console_team_members 
            SET role = 'Owner',
                updated_at = now()
            WHERE admin_id = current_user_id;
        ELSE
            -- Create new team and membership for user
            -- First create a team if none exists
            INSERT INTO console_teams (name, created_by)
            VALUES ('Default Team', current_user_id)
            ON CONFLICT DO NOTHING;
            
            -- Then add user as Owner to the first/default team
            INSERT INTO console_team_members (
                team_id, 
                admin_id, 
                role, 
                joined_at
            )
            SELECT 
                (SELECT id FROM console_teams LIMIT 1), 
                current_user_id, 
                'Owner', 
                now()
            ON CONFLICT (team_id, admin_id) 
            DO UPDATE SET 
                role = 'Owner',
                updated_at = now();
        END IF;
        
        -- Also ensure admin role in user_roles table if it exists
        INSERT INTO user_roles (user_id, role, customer_id)
        SELECT 
            current_user_id, 
            'admin'::app_role,
            (SELECT id FROM console_teams LIMIT 1)
        ON CONFLICT (user_id, role, customer_id) 
        DO NOTHING;
        
        -- Ensure admin profile exists
        INSERT INTO admin_profiles (id, email, full_name)
        SELECT 
            current_user_id,
            email,
            COALESCE(raw_user_meta_data->>'full_name', email)
        FROM auth.users 
        WHERE id = current_user_id
        ON CONFLICT (id) 
        DO UPDATE SET
            email = EXCLUDED.email,
            full_name = COALESCE(admin_profiles.full_name, EXCLUDED.full_name);
            
    END IF;
END $$;