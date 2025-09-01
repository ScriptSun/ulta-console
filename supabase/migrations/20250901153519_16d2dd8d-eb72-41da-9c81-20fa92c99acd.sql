-- Fix customer ID mismatch and create missing tables for permission system
-- Update the user_roles to use the correct default customer ID that matches the permission system
DELETE FROM public.user_roles WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'elin@ultahost.com'
);

-- Assign admin role with the correct default customer ID
INSERT INTO public.user_roles (user_id, customer_id, role)
SELECT 
  u.id,
  '00000000-0000-0000-0000-000000000001'::uuid, -- Default customer ID that matches usePagePermissions
  'admin'::app_role
FROM auth.users u
WHERE u.email = 'elin@ultahost.com'
ON CONFLICT (user_id, customer_id, role) DO NOTHING;

-- Create console_pages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.console_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create console_role_templates table if it doesn't exist  
CREATE TABLE IF NOT EXISTS public.console_role_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  page_key text NOT NULL,
  can_view boolean DEFAULT true,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(role, page_key)
);

-- Create user_page_permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_page_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  page_key text NOT NULL,
  can_view boolean DEFAULT true,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, page_key)
);

-- Insert basic pages
INSERT INTO public.console_pages (key, label) VALUES
  ('dashboard', 'Dashboard'),
  ('users', 'Users'),
  ('agents', 'Agents'),
  ('chat', 'Chat'),
  ('scripts', 'Scripts'),
  ('tasks', 'Tasks'),
  ('security', 'Security'),
  ('policies', 'Policies'),
  ('api_keys', 'API Keys'),
  ('plans', 'Plans'),
  ('widgets', 'Widgets'),
  ('deployment', 'Deployment'),
  ('integrations', 'Integrations'),
  ('teams', 'Teams'),
  ('ai-settings', 'AI Settings'),
  ('qa', 'QA'),
  ('dashboard-revenue', 'Dashboard Revenue'),
  ('dashboard-ai-costs', 'Dashboard AI Costs'),
  ('dashboard-top-agents', 'Dashboard Top Agents'),
  ('dashboard-error-rates', 'Dashboard Error Rates'),
  ('dashboard-recent-logins', 'Dashboard Recent Logins')
ON CONFLICT (key) DO NOTHING;

-- Create admin role template with full permissions
INSERT INTO public.console_role_templates (role, page_key, can_view, can_edit, can_delete)
SELECT 'Admin', key, true, true, true
FROM public.console_pages
ON CONFLICT (role, page_key) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.console_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.console_role_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_page_permissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for the new tables
CREATE POLICY "Users can view console pages" ON public.console_pages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view role templates" ON public.console_role_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view their page permissions" ON public.user_page_permissions FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Also create the default customer record
INSERT INTO public.customers (id, name, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Default Organization',
  now()
) ON CONFLICT (id) DO NOTHING;