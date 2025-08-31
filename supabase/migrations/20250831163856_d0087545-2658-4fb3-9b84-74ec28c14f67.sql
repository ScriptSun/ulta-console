-- Add missing pages to console_pages
INSERT INTO public.console_pages (key, label) VALUES
  ('dashboard', 'Dashboard'),
  ('users', 'Users'),
  ('agents', 'Agents'),
  ('chat', 'Chat Inbox'),
  ('scripts', 'Scripts & Templates'),
  ('tasks', 'Tasks'),
  ('quotas', 'Quotas & Usage'),
  ('plans', 'Plans'),
  ('security', 'Security'),
  ('policies', 'Command Policies'),
  ('api_keys', 'API Keys'),
  ('deployment', 'Deployment'),
  ('integrations', 'Integrations'),
  ('qa', 'QA & Testing')
ON CONFLICT (key) DO NOTHING;

-- Add role templates for all missing page keys for Owner role (full access)
INSERT INTO public.console_role_templates (role, page_key, can_view, can_edit, can_delete) VALUES
  ('Owner', 'dashboard', true, true, true),
  ('Owner', 'users', true, true, true),
  ('Owner', 'agents', true, true, true),
  ('Owner', 'chat', true, true, true),
  ('Owner', 'scripts', true, true, true),
  ('Owner', 'tasks', true, true, true),
  ('Owner', 'quotas', true, true, true),
  ('Owner', 'plans', true, true, true),
  ('Owner', 'security', true, true, true),
  ('Owner', 'policies', true, true, true),
  ('Owner', 'api_keys', true, true, true),
  ('Owner', 'deployment', true, true, true),
  ('Owner', 'integrations', true, true, true),
  ('Owner', 'qa', true, true, true)
ON CONFLICT (role, page_key) DO NOTHING;

-- Add role templates for Admin role
INSERT INTO public.console_role_templates (role, page_key, can_view, can_edit, can_delete) VALUES
  ('Admin', 'dashboard', true, true, false),
  ('Admin', 'users', true, true, false),
  ('Admin', 'agents', true, true, false),
  ('Admin', 'chat', true, true, false),
  ('Admin', 'scripts', true, true, false),
  ('Admin', 'tasks', true, true, false),
  ('Admin', 'quotas', true, false, false),
  ('Admin', 'plans', true, false, false),
  ('Admin', 'security', true, true, false),
  ('Admin', 'policies', true, true, false),
  ('Admin', 'api_keys', true, true, false),
  ('Admin', 'deployment', true, true, false),
  ('Admin', 'integrations', true, true, false),
  ('Admin', 'qa', true, true, false)
ON CONFLICT (role, page_key) DO NOTHING;