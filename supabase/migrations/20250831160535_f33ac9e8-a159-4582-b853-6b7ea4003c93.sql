-- Fix search path for security
CREATE OR REPLACE FUNCTION public.apply_role_template_permissions(_member_id uuid, _role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _template_record RECORD;
BEGIN
  -- Apply template permissions for the role
  FOR _template_record IN 
    SELECT page_key, can_view, can_edit, can_delete 
    FROM console_role_templates 
    WHERE role = _role
  LOOP
    -- Insert or update permission based on template
    INSERT INTO console_member_page_perms (member_id, page_key, can_view, can_edit, can_delete)
    VALUES (_member_id, _template_record.page_key, _template_record.can_view, _template_record.can_edit, _template_record.can_delete)
    ON CONFLICT (member_id, page_key) 
    DO NOTHING; -- Don't override existing explicit permissions
  END LOOP;
END;
$$;