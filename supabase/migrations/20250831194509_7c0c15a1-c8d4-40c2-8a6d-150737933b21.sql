-- Create enhanced function to handle role template permissions with override preservation
CREATE OR REPLACE FUNCTION public.handle_console_team_member_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Handle INSERT (new member)
  IF TG_OP = 'INSERT' THEN
    -- Apply role template permissions for new member
    PERFORM apply_role_template_permissions(NEW.id, NEW.role);
    RETURN NEW;
  END IF;
  
  -- Handle UPDATE (role change)
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    -- For role changes, apply new role template permissions
    -- but only for pages where no explicit permission override exists
    INSERT INTO console_member_page_perms (member_id, page_key, can_view, can_edit, can_delete)
    SELECT 
      NEW.id,
      rt.page_key,
      rt.can_view,
      rt.can_edit,
      rt.can_delete
    FROM console_role_templates rt
    WHERE rt.role = NEW.role
    AND NOT EXISTS (
      SELECT 1 
      FROM console_member_page_perms existing 
      WHERE existing.member_id = NEW.id 
      AND existing.page_key = rt.page_key
    )
    ON CONFLICT (member_id, page_key) DO NOTHING;
    
    -- For existing permissions, update them to match the new role template
    -- but only if they currently match the old role template exactly
    -- (meaning they haven't been explicitly overridden)
    UPDATE console_member_page_perms 
    SET 
      can_view = new_template.can_view,
      can_edit = new_template.can_edit,
      can_delete = new_template.can_delete,
      updated_at = now()
    FROM console_role_templates new_template
    WHERE console_member_page_perms.member_id = NEW.id
      AND console_member_page_perms.page_key = new_template.page_key
      AND new_template.role = NEW.role
      AND EXISTS (
        -- Only update if current permissions match old role template
        -- (indicating they haven't been explicitly overridden)
        SELECT 1 FROM console_role_templates old_template
        WHERE old_template.role = OLD.role
          AND old_template.page_key = console_member_page_perms.page_key
          AND console_member_page_perms.can_view = old_template.can_view
          AND console_member_page_perms.can_edit = old_template.can_edit
          AND console_member_page_perms.can_delete = old_template.can_delete
      );
      
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger and recreate with enhanced functionality
DROP TRIGGER IF EXISTS handle_new_console_team_member ON console_team_members;

-- Create trigger for both INSERT and UPDATE operations
CREATE TRIGGER handle_console_team_member_changes
  AFTER INSERT OR UPDATE ON console_team_members
  FOR EACH ROW
  EXECUTE FUNCTION handle_console_team_member_role_change();