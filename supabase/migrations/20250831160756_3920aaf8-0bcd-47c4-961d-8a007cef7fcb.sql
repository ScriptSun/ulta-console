-- Function to automatically apply role template when a new member is added
CREATE OR REPLACE FUNCTION public.handle_new_console_team_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Apply role template permissions for the new member
  PERFORM apply_role_template_permissions(NEW.id, NEW.role);
  RETURN NEW;
END;
$$;

-- Trigger to call the function when a new team member is created
CREATE TRIGGER on_console_team_member_created
AFTER INSERT ON public.console_team_members
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_console_team_member();