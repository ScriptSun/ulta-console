-- Remove team dependency from permissions - use user_id only (corrected)

-- First, add the missing roles to the enum
DO $$ 
BEGIN
    BEGIN
        ALTER TYPE app_role ADD VALUE 'developer';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER TYPE app_role ADD VALUE 'analyst';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER TYPE app_role ADD VALUE 'readonly';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER TYPE app_role ADD VALUE 'owner';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
END $$;

-- Create user_page_permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_page_permissions (
    user_id uuid NOT NULL,
    page_key text NOT NULL,
    can_view boolean DEFAULT true,
    can_edit boolean DEFAULT false,
    can_delete boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add primary key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'user_page_permissions' 
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE public.user_page_permissions 
        ADD CONSTRAINT user_page_permissions_pkey PRIMARY KEY (user_id, page_key);
    END IF;
END $$;

-- Enable RLS on user_page_permissions
ALTER TABLE public.user_page_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_page_permissions;
DROP POLICY IF EXISTS "Users can manage their own permissions" ON public.user_page_permissions;
DROP POLICY IF EXISTS "Admins can manage all user permissions" ON public.user_page_permissions;

-- Create RLS policies
CREATE POLICY "Users can view their own permissions"
ON public.user_page_permissions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own permissions"
ON public.user_page_permissions FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all user permissions"
ON public.user_page_permissions FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'owner')
    )
);

-- Migrate data from console_member_page_perms if table exists
DO $$
DECLARE
    rec RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'console_member_page_perms') THEN
        -- Insert migrated data one by one to handle duplicates gracefully
        FOR rec IN
            SELECT DISTINCT ON (ctm.admin_id, cmpp.page_key)
                ctm.admin_id as user_id,
                cmpp.page_key,
                cmpp.can_view,
                cmpp.can_edit,
                cmpp.can_delete,
                cmpp.created_at,
                cmpp.updated_at
            FROM public.console_member_page_perms cmpp
            JOIN public.console_team_members ctm ON ctm.id = cmpp.member_id
            ORDER BY ctm.admin_id, cmpp.page_key, cmpp.updated_at DESC
        LOOP
            BEGIN
                INSERT INTO public.user_page_permissions (user_id, page_key, can_view, can_edit, can_delete, created_at, updated_at)
                VALUES (rec.user_id, rec.page_key, rec.can_view, rec.can_edit, rec.can_delete, rec.created_at, rec.updated_at);
            EXCEPTION
                WHEN unique_violation THEN
                    -- Skip duplicates
                    NULL;
            END;
        END LOOP;
            
        -- Mark old table as deprecated
        COMMENT ON TABLE public.console_member_page_perms IS 'DEPRECATED: Replaced by user_page_permissions. Remove after migration complete.';
    END IF;
END $$;

-- Ensure elin has owner role
INSERT INTO public.user_roles (user_id, role)
VALUES ('5bb0dbc1-471d-4ac6-9be8-f851a59ef3fc', 'owner')
ON CONFLICT (user_id, role) DO NOTHING;