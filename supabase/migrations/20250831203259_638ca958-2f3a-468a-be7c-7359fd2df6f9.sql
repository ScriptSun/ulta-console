-- Seed console_pages with actual app pages
INSERT INTO console_pages (key, label) VALUES
  ('dashboard', 'Dashboard'),
  ('users', 'Users'),
  ('agents', 'Agents'),
  ('chat', 'Chat Inbox'),
  ('scripts', 'Templates & Scripts'),
  ('tasks', 'Tasks'),
  ('quotas', 'Quotas & Usage'),
  ('plans', 'Plans'),
  ('security', 'Security'),
  ('policies', 'Command Policies'),
  ('api_keys', 'API Keys'),
  ('widgets', 'Widget Management'),
  ('integrations', 'Integrations'),
  ('teams', 'Team Management')
ON CONFLICT (key) DO NOTHING;

-- Seed role templates
-- Owner: Full access to everything
INSERT INTO console_role_templates (role, page_key, can_view, can_edit, can_delete) VALUES
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
  ('Owner', 'widgets', true, true, true),
  ('Owner', 'integrations', true, true, true),
  ('Owner', 'teams', true, true, true)
ON CONFLICT (role, page_key) DO NOTHING;

-- Admin: Full access but limited delete on sensitive areas
INSERT INTO console_role_templates (role, page_key, can_view, can_edit, can_delete) VALUES
  ('Admin', 'dashboard', true, true, true),
  ('Admin', 'users', true, true, false), -- Can't delete users
  ('Admin', 'agents', true, true, true),
  ('Admin', 'chat', true, true, true),
  ('Admin', 'scripts', true, true, true),
  ('Admin', 'tasks', true, true, true),
  ('Admin', 'quotas', true, true, false), -- Can't delete quotas
  ('Admin', 'plans', true, true, false), -- Can't delete plans
  ('Admin', 'security', true, true, false), -- Can't delete security configs
  ('Admin', 'policies', true, true, false), -- Can't delete policies
  ('Admin', 'api_keys', true, true, true),
  ('Admin', 'widgets', true, true, true),
  ('Admin', 'integrations', true, true, true),
  ('Admin', 'teams', true, true, false) -- Can't delete teams
ON CONFLICT (role, page_key) DO NOTHING;

-- Developer: View and edit widgets and scripts only
INSERT INTO console_role_templates (role, page_key, can_view, can_edit, can_delete) VALUES
  ('Developer', 'dashboard', true, false, false),
  ('Developer', 'users', false, false, false),
  ('Developer', 'agents', true, false, false),
  ('Developer', 'chat', true, false, false),
  ('Developer', 'scripts', true, true, false), -- Can edit scripts
  ('Developer', 'tasks', true, false, false),
  ('Developer', 'quotas', true, false, false),
  ('Developer', 'plans', false, false, false),
  ('Developer', 'security', false, false, false),
  ('Developer', 'policies', false, false, false),
  ('Developer', 'api_keys', true, false, false),
  ('Developer', 'widgets', true, true, false), -- Can edit widgets
  ('Developer', 'integrations', true, false, false),
  ('Developer', 'teams', false, false, false)
ON CONFLICT (role, page_key) DO NOTHING;

-- Analyst: View only on analytics/quotas
INSERT INTO console_role_templates (role, page_key, can_view, can_edit, can_delete) VALUES
  ('Analyst', 'dashboard', true, false, false),
  ('Analyst', 'users', false, false, false),
  ('Analyst', 'agents', false, false, false),
  ('Analyst', 'chat', false, false, false),
  ('Analyst', 'scripts', false, false, false),
  ('Analyst', 'tasks', false, false, false),
  ('Analyst', 'quotas', true, false, false), -- Can view analytics/quotas
  ('Analyst', 'plans', false, false, false),
  ('Analyst', 'security', false, false, false),
  ('Analyst', 'policies', false, false, false),
  ('Analyst', 'api_keys', false, false, false),
  ('Analyst', 'widgets', false, false, false),
  ('Analyst', 'integrations', false, false, false),
  ('Analyst', 'teams', false, false, false)
ON CONFLICT (role, page_key) DO NOTHING;

-- ReadOnly: View only on basic pages
INSERT INTO console_role_templates (role, page_key, can_view, can_edit, can_delete) VALUES
  ('ReadOnly', 'dashboard', true, false, false),
  ('ReadOnly', 'users', false, false, false),
  ('ReadOnly', 'agents', true, false, false),
  ('ReadOnly', 'chat', true, false, false),
  ('ReadOnly', 'scripts', true, false, false),
  ('ReadOnly', 'tasks', true, false, false),
  ('ReadOnly', 'quotas', true, false, false),
  ('ReadOnly', 'plans', false, false, false),
  ('ReadOnly', 'security', false, false, false),
  ('ReadOnly', 'policies', false, false, false),
  ('ReadOnly', 'api_keys', false, false, false),
  ('ReadOnly', 'widgets', true, false, false),
  ('ReadOnly', 'integrations', true, false, false),
  ('ReadOnly', 'teams', false, false, false)
ON CONFLICT (role, page_key) DO NOTHING;