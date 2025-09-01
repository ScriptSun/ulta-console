-- Remove duplicate entries and add missing tab permissions (using correct roles)

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

-- Add role template permissions using correct existing roles: Admin, Analyst, Developer, Owner, ReadOnly
INSERT INTO console_role_templates (role, page_key, can_view, can_edit, can_delete) VALUES 
-- Owner permissions - full access
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

-- Admin permissions - can edit most things but not delete critical items
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

-- Developer permissions - focused on scripts and widgets
('Developer', 'dashboard-overview', true, false, false),
('Developer', 'dashboard-analytics', true, false, false),
('Developer', 'dashboard-monitoring', true, false, false),
('Developer', 'scripts-main', true, true, false),
('Developer', 'scripts-batches-tab', true, true, false),
('Developer', 'scripts-templates-tab', true, true, false),
('Developer', 'settings-system', false, false, false),
('Developer', 'settings-security', false, false, false),
('Developer', 'settings-company', false, false, false),
('Developer', 'users-main', true, false, false),
('Developer', 'users-permissions', false, false, false),
('Developer', 'team-members', true, false, false),
('Developer', 'team-roles', false, false, false),
('Developer', 'widgets-config', true, true, false),
('Developer', 'widgets-analytics', true, false, false),

-- Analyst permissions - focused on viewing analytics and data
('Analyst', 'dashboard-overview', true, false, false),
('Analyst', 'dashboard-analytics', true, false, false),
('Analyst', 'dashboard-monitoring', true, false, false),
('Analyst', 'scripts-main', true, false, false),
('Analyst', 'scripts-batches-tab', true, false, false),
('Analyst', 'scripts-templates-tab', true, false, false),
('Analyst', 'settings-system', false, false, false),
('Analyst', 'settings-security', false, false, false),
('Analyst', 'settings-company', false, false, false),
('Analyst', 'users-main', true, false, false),
('Analyst', 'users-permissions', false, false, false),
('Analyst', 'team-members', true, false, false),
('Analyst', 'team-roles', false, false, false),
('Analyst', 'widgets-config', true, false, false),
('Analyst', 'widgets-analytics', true, false, false),

-- ReadOnly permissions - view only
('ReadOnly', 'dashboard-overview', true, false, false),
('ReadOnly', 'dashboard-analytics', true, false, false),
('ReadOnly', 'dashboard-monitoring', true, false, false),
('ReadOnly', 'scripts-main', true, false, false),
('ReadOnly', 'scripts-batches-tab', true, false, false),
('ReadOnly', 'scripts-templates-tab', true, false, false),
('ReadOnly', 'settings-system', false, false, false),
('ReadOnly', 'settings-security', false, false, false),
('ReadOnly', 'settings-company', false, false, false),
('ReadOnly', 'users-main', true, false, false),
('ReadOnly', 'users-permissions', false, false, false),
('ReadOnly', 'team-members', true, false, false),
('ReadOnly', 'team-roles', false, false, false),
('ReadOnly', 'widgets-config', true, false, false),
('ReadOnly', 'widgets-analytics', true, false, false)
ON CONFLICT (role, page_key) DO NOTHING;