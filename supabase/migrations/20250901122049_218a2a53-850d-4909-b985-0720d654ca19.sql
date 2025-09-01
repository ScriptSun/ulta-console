-- Add AI Settings page permission
INSERT INTO console_pages (key, label) VALUES 
('ai-settings', 'AI Settings')
ON CONFLICT (key) DO NOTHING;

-- Add role template permissions for AI Settings page
INSERT INTO console_role_templates (role, page_key, can_view, can_edit, can_delete) VALUES 
('Owner', 'ai-settings', true, true, true),
('Admin', 'ai-settings', true, true, false)
ON CONFLICT (role, page_key) DO NOTHING;