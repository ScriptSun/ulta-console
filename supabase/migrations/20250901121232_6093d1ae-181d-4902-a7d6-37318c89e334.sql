-- Add missing Theme Settings tab permission

-- Add theme settings tab permission
INSERT INTO console_pages (key, label) VALUES 
('settings-theme', 'Theme Settings Tab')
ON CONFLICT (key) DO NOTHING;

-- Add role template permissions for theme settings tab
INSERT INTO console_role_templates (role, page_key, can_view, can_edit, can_delete) VALUES 
-- Owner permissions - full access to themes
('Owner', 'settings-theme', true, true, true),

-- Admin permissions - can edit themes but not delete
('Admin', 'settings-theme', true, true, false),

-- Developer permissions - can edit themes
('Developer', 'settings-theme', true, true, false),

-- Analyst permissions - view only
('Analyst', 'settings-theme', true, false, false),

-- ReadOnly permissions - view only
('ReadOnly', 'settings-theme', true, false, false)
ON CONFLICT (role, page_key) DO NOTHING;