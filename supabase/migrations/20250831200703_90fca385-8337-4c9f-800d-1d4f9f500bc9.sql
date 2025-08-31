-- Seed console pages
INSERT INTO console_pages (key, label) VALUES
  ('dashboard', 'Dashboard'),
  ('agents', 'Agents'),
  ('agent-detail', 'Agent Details'),
  ('agent-tasks', 'Agent Tasks'),
  ('scripts', 'Scripts'),
  ('scripts-batches', 'Script Batches'),
  ('scripts-settings', 'Script Settings'),
  ('scripts-templates', 'Script Templates'),
  ('users', 'Users'),
  ('user-detail', 'User Details'),
  ('team-management', 'Team Management'),
  ('api-keys', 'API Keys'),
  ('security', 'Security'),
  ('security-dashboard', 'Security Dashboard'),
  ('security-tests', 'Security Tests'),
  ('command-policies', 'Command Policies'),
  ('plans', 'Plans'),
  ('quotas', 'Quotas'),
  ('integrations', 'Integrations'),
  ('audit', 'Audit Logs'),
  ('tasks', 'Tasks'),
  ('chat-inbox', 'Chat Inbox'),
  ('widget-management', 'Widget Management'),
  ('widget-edit', 'Widget Editor'),
  ('widget-test', 'Widget Testing'),
  ('widget-deployment-checklist', 'Widget Deployment'),
  ('qa-checklist', 'QA Checklist'),
  ('assertion-check', 'Assertion Check'),
  ('render-templates-demo', 'Render Templates Demo')
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label;

-- Create role templates for Owner (full access)
INSERT INTO console_role_templates (role, page_key, can_view, can_edit, can_delete) VALUES
  ('Owner', 'dashboard', true, true, true),
  ('Owner', 'agents', true, true, true),
  ('Owner', 'agent-detail', true, true, true),
  ('Owner', 'agent-tasks', true, true, true),
  ('Owner', 'scripts', true, true, true),
  ('Owner', 'scripts-batches', true, true, true),
  ('Owner', 'scripts-settings', true, true, true),
  ('Owner', 'scripts-templates', true, true, true),
  ('Owner', 'users', true, true, true),
  ('Owner', 'user-detail', true, true, true),
  ('Owner', 'team-management', true, true, true),
  ('Owner', 'api-keys', true, true, true),
  ('Owner', 'security', true, true, true),
  ('Owner', 'security-dashboard', true, true, true),
  ('Owner', 'security-tests', true, true, true),
  ('Owner', 'command-policies', true, true, true),
  ('Owner', 'plans', true, true, true),
  ('Owner', 'quotas', true, true, true),
  ('Owner', 'integrations', true, true, true),
  ('Owner', 'audit', true, true, true),
  ('Owner', 'tasks', true, true, true),
  ('Owner', 'chat-inbox', true, true, true),
  ('Owner', 'widget-management', true, true, true),
  ('Owner', 'widget-edit', true, true, true),
  ('Owner', 'widget-test', true, true, true),
  ('Owner', 'widget-deployment-checklist', true, true, true),
  ('Owner', 'qa-checklist', true, true, true),
  ('Owner', 'assertion-check', true, true, true),
  ('Owner', 'render-templates-demo', true, true, true)
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;

-- Create role templates for Admin (limited delete access on sensitive pages)
INSERT INTO console_role_templates (role, page_key, can_view, can_edit, can_delete) VALUES
  ('Admin', 'dashboard', true, true, false),
  ('Admin', 'agents', true, true, true),
  ('Admin', 'agent-detail', true, true, true),
  ('Admin', 'agent-tasks', true, true, false),
  ('Admin', 'scripts', true, true, true),
  ('Admin', 'scripts-batches', true, true, true),
  ('Admin', 'scripts-settings', true, true, false),
  ('Admin', 'scripts-templates', true, true, true),
  ('Admin', 'users', true, true, false),
  ('Admin', 'user-detail', true, true, false),
  ('Admin', 'team-management', true, true, false),
  ('Admin', 'api-keys', true, true, false),
  ('Admin', 'security', true, false, false),
  ('Admin', 'security-dashboard', true, false, false),
  ('Admin', 'security-tests', true, true, false),
  ('Admin', 'command-policies', true, true, false),
  ('Admin', 'plans', true, false, false),
  ('Admin', 'quotas', true, false, false),
  ('Admin', 'integrations', true, true, false),
  ('Admin', 'audit', true, false, false),
  ('Admin', 'tasks', true, true, false),
  ('Admin', 'chat-inbox', true, true, false),
  ('Admin', 'widget-management', true, true, false),
  ('Admin', 'widget-edit', true, true, false),
  ('Admin', 'widget-test', true, true, false),
  ('Admin', 'widget-deployment-checklist', true, true, false),
  ('Admin', 'qa-checklist', true, true, false),
  ('Admin', 'assertion-check', true, true, false),
  ('Admin', 'render-templates-demo', true, true, false)
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;

-- Ensure admin profile exists for elin@ultahost.com
INSERT INTO admin_profiles (id, email, full_name)
VALUES ('5bb0dbc1-471d-4ac6-9be8-f851a59ef3fc', 'elin@ultahost.com', 'Elin')
ON CONFLICT (id) DO NOTHING;