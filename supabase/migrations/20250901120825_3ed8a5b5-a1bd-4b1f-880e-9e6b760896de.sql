-- Remove duplicate entries and add missing tab permissions

-- Remove duplicate console_pages entries
DELETE FROM console_pages WHERE key IN ('chat', 'api_keys', 'policies');

-- Remove any related permissions for the deleted keys
DELETE FROM console_role_templates WHERE page_key IN ('chat', 'api_keys', 'policies');
DELETE FROM console_member_page_perms WHERE page_key IN ('chat', 'api_keys', 'policies');

-- Add missing tab permissions for major page sections
INSERT INTO console_pages (key, label) VALUES 
('dashboard-overview', 'Dashboard Overview Tab'),
('dashboard-analytics', 'Dashboard Analytics Tab'),
('dashboard-monitoring', 'Dashboard Monitoring Tab'),
('scripts-main', 'Scripts Main Tab'),
('scripts-batches-tab', 'Scripts Batches Tab'),
('scripts-templates-tab', 'Scripts Templates Tab'),
('settings-system', 'System Settings Tab'),
('settings-security', 'Security Settings Tab'),
('settings-company', 'Company Settings Tab'),
('users-main', 'Users Main Tab'),
('users-permissions', 'User Permissions Tab'),
('team-members', 'Team Members Tab'),
('team-roles', 'Team Roles Tab'),
('widgets-config', 'Widget Configuration Tab'),
('widgets-analytics', 'Widget Analytics Tab')
ON CONFLICT (key) DO NOTHING;

-- Add role template permissions for new tab permissions
INSERT INTO console_role_templates (role, page_key, can_view, can_edit, can_delete) VALUES 
-- Owner permissions
('Owner', 'dashboard-overview', true, true, true),
('Owner', 'dashboard-analytics', true, true, true),
('Owner', 'dashboard-monitoring', true, true, true),
('Owner', 'scripts-main', true, true, true),
('Owner', 'scripts-batches-tab', true, true, true),
('Owner', 'scripts-templates-tab', true, true, true),
('Owner', 'settings-system', true, true, true),
('Owner', 'settings-security', true, true, true),
('Owner', 'settings-company', true, true, true),
('Owner', 'users-main', true, true, true),
('Owner', 'users-permissions', true, true, true),
('Owner', 'team-members', true, true, true),
('Owner', 'team-roles', true, true, true),
('Owner', 'widgets-config', true, true, true),
('Owner', 'widgets-analytics', true, true, true),

-- Admin permissions
('Admin', 'dashboard-overview', true, true, false),
('Admin', 'dashboard-analytics', true, false, false),
('Admin', 'dashboard-monitoring', true, false, false),
('Admin', 'scripts-main', true, true, false),
('Admin', 'scripts-batches-tab', true, true, false),
('Admin', 'scripts-templates-tab', true, true, false),
('Admin', 'settings-system', true, true, false),
('Admin', 'settings-security', true, false, false),
('Admin', 'settings-company', true, true, false),
('Admin', 'users-main', true, true, false),
('Admin', 'users-permissions', true, true, false),
('Admin', 'team-members', true, true, false),
('Admin', 'team-roles', true, false, false),
('Admin', 'widgets-config', true, true, false),
('Admin', 'widgets-analytics', true, false, false),

-- Editor permissions  
('Editor', 'dashboard-overview', true, false, false),
('Editor', 'dashboard-analytics', true, false, false),
('Editor', 'dashboard-monitoring', true, false, false),
('Editor', 'scripts-main', true, true, false),
('Editor', 'scripts-batches-tab', true, true, false),
('Editor', 'scripts-templates-tab', true, false, false),
('Editor', 'settings-system', false, false, false),
('Editor', 'settings-security', false, false, false),
('Editor', 'settings-company', false, false, false),
('Editor', 'users-main', true, false, false),
('Editor', 'users-permissions', false, false, false),
('Editor', 'team-members', true, false, false),
('Editor', 'team-roles', false, false, false),
('Editor', 'widgets-config', true, true, false),
('Editor', 'widgets-analytics', true, false, false),

-- Viewer permissions
('Viewer', 'dashboard-overview', true, false, false),
('Viewer', 'dashboard-analytics', true, false, false),
('Viewer', 'dashboard-monitoring', true, false, false),
('Viewer', 'scripts-main', true, false, false),
('Viewer', 'scripts-batches-tab', true, false, false),
('Viewer', 'scripts-templates-tab', true, false, false),
('Viewer', 'settings-system', false, false, false),
('Viewer', 'settings-security', false, false, false),
('Viewer', 'settings-company', false, false, false),
('Viewer', 'users-main', true, false, false),
('Viewer', 'users-permissions', false, false, false),
('Viewer', 'team-members', true, false, false),
('Viewer', 'team-roles', false, false, false),
('Viewer', 'widgets-config', true, false, false),
('Viewer', 'widgets-analytics', true, false, false)
ON CONFLICT (role, page_key) DO NOTHING;