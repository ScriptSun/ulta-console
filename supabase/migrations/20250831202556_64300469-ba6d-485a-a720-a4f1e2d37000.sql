-- Update role templates to use correct role names for the new display mapping

-- Update existing role templates to use display names
UPDATE console_role_templates SET role = 'Owner' WHERE role = 'owner';
UPDATE console_role_templates SET role = 'Developer' WHERE role = 'Developer';
UPDATE console_role_templates SET role = 'Analyst' WHERE role = 'Analyst';
UPDATE console_role_templates SET role = 'ReadOnly' WHERE role = 'ReadOnly';

-- Add any missing role templates for new mappings
INSERT INTO console_role_templates (role, page_key, can_view, can_edit, can_delete) 
SELECT 
  'Developer' as role,
  rt.page_key,
  rt.can_view,
  rt.can_edit,
  false as can_delete  -- Developers get less delete access than Admins
FROM console_role_templates rt 
WHERE rt.role = 'Admin'
AND NOT EXISTS (
  SELECT 1 FROM console_role_templates existing 
  WHERE existing.role = 'Developer' AND existing.page_key = rt.page_key
);