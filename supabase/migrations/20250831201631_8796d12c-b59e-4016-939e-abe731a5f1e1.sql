-- Remove team dependency from permissions - use user_id only

-- First, let's add the missing roles to user_roles if they don't exist
-- We need to ensure the enum supports all required roles
DO $$ 
BEGIN
    -- Add roles to the enum if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'developer' AND enumtypid = 'app_role'::regtype) THEN
        ALTER TYPE app_role ADD VALUE 'developer';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'analyst' AND enumtypid = 'app_role'::regtype) THEN
        ALTER TYPE app_role ADD VALUE 'analyst';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'readonly' AND enumtypid = 'app_role'::regtype) THEN
        ALTER TYPE app_role ADD VALUE 'readonly';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'owner' AND enumtypid = 'app_role'::regtype) THEN
        ALTER TYPE app_role ADD VALUE 'owner';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
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
        AND role = 'admin'
    )
);

-- Migrate data from console_member_page_perms to user_page_permissions if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'console_member_page_perms') THEN
        -- Migrate permissions by mapping member_id to admin_id
        INSERT INTO public.user_page_permissions (user_id, page_key, can_view, can_edit, can_delete, created_at, updated_at)
        SELECT 
            ctm.admin_id as user_id,
            cmpp.page_key,
            cmpp.can_view,
            cmpp.can_edit,
            cmpp.can_delete,
            cmpp.created_at,
            cmpp.updated_at
        FROM public.console_member_page_perms cmpp
        JOIN public.console_team_members ctm ON ctm.id = cmpp.member_id
        ON CONFLICT (user_id, page_key) 
        DO UPDATE SET
            can_view = EXCLUDED.can_view,
            can_edit = EXCLUDED.can_edit,
            can_delete = EXCLUDED.can_delete,
            updated_at = EXCLUDED.updated_at;
            
        -- Add a comment to mark the old table as deprecated
        COMMENT ON TABLE public.console_member_page_perms IS 'DEPRECATED: Replaced by user_page_permissions. Remove after migration complete.';
    END IF;
END $$;

-- Ensure elin@ultahost.com has owner role
INSERT INTO public.user_roles (user_id, role)
VALUES ('5bb0dbc1-471d-4ac6-9be8-f851a59ef3fc', 'owner')
ON CONFLICT (user_id, role) DO NOTHING;

-- Update role templates to include new roles
INSERT INTO console_role_templates (role, page_key, can_view, can_edit, can_delete) VALUES
  -- Developer role - can edit most things but limited delete
  ('Developer', 'dashboard', true, true, false),
  ('Developer', 'agents', true, true, false),
  ('Developer', 'agent-detail', true, true, false),
  ('Developer', 'agent-tasks', true, true, false),
  ('Developer', 'scripts', true, true, false),
  ('Developer', 'scripts-batches', true, true, false),
  ('Developer', 'scripts-settings', true, false, false),
  ('Developer', 'scripts-templates', true, true, false),
  ('Developer', 'users', true, false, false),
  ('Developer', 'user-detail', true, false, false),
  ('Developer', 'team-management', false, false, false),
  ('Developer', 'api-keys', true, false, false),
  ('Developer', 'security', false, false, false),
  ('Developer', 'security-dashboard', false, false, false),
  ('Developer', 'security-tests', true, false, false),
  ('Developer', 'command-policies', true, false, false),
  ('Developer', 'plans', false, false, false),
  ('Developer', 'quotas', true, false, false),
  ('Developer', 'integrations', true, false, false),
  ('Developer', 'audit', false, false, false),
  ('Developer', 'tasks', true, true, false),
  ('Developer', 'chat-inbox', true, true, false),
  ('Developer', 'widget-management', true, true, false),
  ('Developer', 'widget-edit', true, true, false),
  ('Developer', 'widget-test', true, true, false),
  ('Developer', 'widget-deployment-checklist', true, true, false),
  ('Developer', 'qa-checklist', true, true, false),
  ('Developer', 'assertion-check', true, true, false),
  ('Developer', 'render-templates-demo', true, true, false),
  
  -- Analyst role - mostly read-only with some task management
  ('Analyst', 'dashboard', true, false, false),
  ('Analyst', 'agents', true, false, false),
  ('Analyst', 'agent-detail', true, false, false),
  ('Analyst', 'agent-tasks', true, false, false),
  ('Analyst', 'scripts', true, false, false),
  ('Analyst', 'scripts-batches', true, false, false),
  ('Analyst', 'scripts-settings', false, false, false),
  ('Analyst', 'scripts-templates', true, false, false),
  ('Analyst', 'users', true, false, false),
  ('Analyst', 'user-detail', true, false, false),
  ('Analyst', 'team-management', false, false, false),
  ('Analyst', 'api-keys', false, false, false),
  ('Analyst', 'security', false, false, false),
  ('Analyst', 'security-dashboard', true, false, false),
  ('Analyst', 'security-tests', false, false, false),
  ('Analyst', 'command-policies', false, false, false),
  ('Analyst', 'plans', false, false, false),
  ('Analyst', 'quotas', true, false, false),
  ('Analyst', 'integrations', false, false, false),
  ('Analyst', 'audit', true, false, false),
  ('Analyst', 'tasks', true, false, false),
  ('Analyst', 'chat-inbox', true, false, false),
  ('Analyst', 'widget-management', false, false, false),
  ('Analyst', 'widget-edit', false, false, false),
  ('Analyst', 'widget-test', false, false, false),
  ('Analyst', 'widget-deployment-checklist', false, false, false),
  ('Analyst', 'qa-checklist', true, false, false),
  ('Analyst', 'assertion-check', true, false, false),
  ('Analyst', 'render-templates-demo', true, false, false),
  
  -- ReadOnly role - view access only
  ('ReadOnly', 'dashboard', true, false, false),
  ('ReadOnly', 'agents', true, false, false),
  ('ReadOnly', 'agent-detail', true, false, false),
  ('ReadOnly', 'agent-tasks', true, false, false),
  ('ReadOnly', 'scripts', true, false, false),
  ('ReadOnly', 'scripts-batches', true, false, false),
  ('ReadOnly', 'scripts-settings', false, false, false),
  ('ReadOnly', 'scripts-templates', true, false, false),
  ('ReadOnly', 'users', true, false, false),
  ('ReadOnly', 'user-detail', true, false, false),
  ('ReadOnly', 'team-management', false, false, false),
  ('ReadOnly', 'api-keys', false, false, false),
  ('ReadOnly', 'security', false, false, false),
  ('ReadOnly', 'security-dashboard', false, false, false),
  ('ReadOnly', 'security-tests', false, false, false),
  ('ReadOnly', 'command-policies', false, false, false),
  ('ReadOnly', 'plans', false, false, false),
  ('ReadOnly', 'quotas', true, false, false),
  ('ReadOnly', 'integrations', false, false, false),
  ('ReadOnly', 'audit', false, false, false),
  ('ReadOnly', 'tasks', true, false, false),
  ('ReadOnly', 'chat-inbox', true, false, false),
  ('ReadOnly', 'widget-management', false, false, false),
  ('ReadOnly', 'widget-edit', false, false, false),
  ('ReadOnly', 'widget-test', false, false, false),
  ('ReadOnly', 'widget-deployment-checklist', false, false, false),
  ('ReadOnly', 'qa-checklist', true, false, false),
  ('ReadOnly', 'assertion-check', true, false, false),
  ('ReadOnly', 'render-templates-demo', true, false, false)
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;