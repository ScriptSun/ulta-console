-- Remove team dependency from permissions - use user_id only (fixed migration)

-- First, let's add the missing roles to user_roles if they don't exist
DO $$ 
BEGIN
    -- Add roles to the enum if they don't exist
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

-- Create user_page_permissions table
CREATE TABLE IF NOT EXISTS public.user_page_permissions (
    user_id uuid NOT NULL,
    page_key text NOT NULL,
    can_view boolean DEFAULT true,
    can_edit boolean DEFAULT false,
    can_delete boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (user_id, page_key),
    UNIQUE(user_id, page_key)
);

-- Enable RLS on user_page_permissions
ALTER TABLE public.user_page_permissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_page_permissions
CREATE POLICY "Users can view their own permissions"
ON public.user_page_permissions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own permissions"
ON public.user_page_permissions FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can manage all permissions
CREATE POLICY "Admins can manage all user permissions"
ON public.user_page_permissions FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'owner')
    )
);

-- Migrate data from console_member_page_perms to user_page_permissions if the table exists
-- Use DISTINCT ON to avoid duplicate violations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'console_member_page_perms') THEN
        INSERT INTO public.user_page_permissions (user_id, page_key, can_view, can_edit, can_delete, created_at, updated_at)
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
        ON CONFLICT (user_id, page_key) DO NOTHING;
            
        -- Mark old table as deprecated
        COMMENT ON TABLE public.console_member_page_perms IS 'DEPRECATED: Replaced by user_page_permissions. Remove after migration complete.';
    END IF;
END $$;

-- Ensure elin@ultahost.com has owner role
INSERT INTO public.user_roles (user_id, role)
VALUES ('5bb0dbc1-471d-4ac6-9be8-f851a59ef3fc', 'owner')
ON CONFLICT (user_id, role) DO NOTHING;