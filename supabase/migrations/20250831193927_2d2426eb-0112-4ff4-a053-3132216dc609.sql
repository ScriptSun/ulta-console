-- Insert default pages and role templates for console navigation

-- Insert default console pages
INSERT INTO console_pages(key, label) VALUES
('widgets', 'Widget Manager'),
('teams', 'Team Manager'),
('webhooks', 'Webhooks'),
('analytics', 'Analytics'),
('billing', 'Billing'),
('settings', 'Settings')
ON CONFLICT (key) DO NOTHING;

-- Give Owner and Admin full permissions on all pages
INSERT INTO console_role_templates(role, page_key, can_view, can_edit, can_delete)
SELECT r.role, p.key, true, true, true
FROM (VALUES ('Owner'), ('Admin')) AS r(role), console_pages p
ON CONFLICT (role, page_key) DO NOTHING;

-- Set up minimal defaults for other roles
INSERT INTO console_role_templates(role, page_key, can_view, can_edit, can_delete)
SELECT r.role, p.key,
    CASE WHEN p.key IN ('widgets', 'teams', 'settings') THEN true ELSE true END,
    CASE WHEN p.key IN ('widgets') THEN true ELSE false END,
    false
FROM (VALUES ('Developer'), ('Analyst'), ('ReadOnly')) AS r(role), console_pages p
ON CONFLICT (role, page_key) DO NOTHING;