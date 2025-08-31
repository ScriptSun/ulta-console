-- Create console_role_templates table
CREATE TABLE public.console_role_templates (
  role text NOT NULL CHECK (role IN ('Owner','Admin','Developer','Analyst','ReadOnly')),
  page_key text REFERENCES console_pages(key) ON DELETE CASCADE NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (role, page_key)
);

-- Enable RLS
ALTER TABLE public.console_role_templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read role templates
CREATE POLICY "All authenticated users can read role templates"
ON public.console_role_templates
FOR SELECT
TO authenticated
USING (true);

-- Seed role templates with sensible defaults
INSERT INTO public.console_role_templates (role, page_key, can_view, can_edit, can_delete) VALUES
  -- Owner: Full access to everything
  ('Owner', 'widgets', true, true, true),
  ('Owner', 'teams', true, true, true),
  ('Owner', 'webhooks', true, true, true),
  ('Owner', 'analytics', true, true, true),
  ('Owner', 'billing', true, true, true),
  ('Owner', 'settings', true, true, true),
  
  -- Admin: Full access except some restrictions on billing/settings
  ('Admin', 'widgets', true, true, true),
  ('Admin', 'teams', true, true, true),
  ('Admin', 'webhooks', true, true, true),
  ('Admin', 'analytics', true, true, false),
  ('Admin', 'billing', true, false, false),
  ('Admin', 'settings', true, true, false),
  
  -- Developer: Technical focus, limited admin access
  ('Developer', 'widgets', true, true, true),
  ('Developer', 'teams', true, false, false),
  ('Developer', 'webhooks', true, true, true),
  ('Developer', 'analytics', true, false, false),
  ('Developer', 'billing', false, false, false),
  ('Developer', 'settings', true, false, false),
  
  -- Analyst: Data focus, mainly view with edit on analytics
  ('Analyst', 'widgets', true, false, false),
  ('Analyst', 'teams', true, false, false),
  ('Analyst', 'webhooks', true, false, false),
  ('Analyst', 'analytics', true, true, false),
  ('Analyst', 'billing', true, false, false),
  ('Analyst', 'settings', false, false, false),
  
  -- ReadOnly: View access to selected pages only
  ('ReadOnly', 'widgets', true, false, false),
  ('ReadOnly', 'teams', false, false, false),
  ('ReadOnly', 'webhooks', true, false, false),
  ('ReadOnly', 'analytics', true, false, false),
  ('ReadOnly', 'billing', false, false, false),
  ('ReadOnly', 'settings', false, false, false);

-- Add helper function to apply role template permissions
CREATE OR REPLACE FUNCTION public.apply_role_template_permissions(_member_id uuid, _role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _template_record RECORD;
BEGIN
  -- Delete existing template-based permissions (keep explicit overrides)
  -- This is a simplified approach - in practice you might want to track which are overrides
  FOR _template_record IN 
    SELECT page_key, can_view, can_edit, can_delete 
    FROM console_role_templates 
    WHERE role = _role
  LOOP
    -- Insert or update permission based on template
    INSERT INTO console_member_page_perms (member_id, page_key, can_view, can_edit, can_delete)
    VALUES (_member_id, _template_record.page_key, _template_record.can_view, _template_record.can_edit, _template_record.can_delete)
    ON CONFLICT (member_id, page_key) 
    DO UPDATE SET
      can_view = _template_record.can_view,
      can_edit = _template_record.can_edit,
      can_delete = _template_record.can_delete,
      updated_at = now()
    WHERE 
      -- Only update if it's not explicitly overridden (this is simplified - you might want a flag)
      console_member_page_perms.updated_at < console_member_page_perms.created_at + interval '1 minute';
  END LOOP;
END;
$$;