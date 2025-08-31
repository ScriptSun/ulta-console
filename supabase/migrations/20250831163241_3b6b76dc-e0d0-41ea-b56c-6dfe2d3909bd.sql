-- Create a function to bulk invite team members from emails
CREATE OR REPLACE FUNCTION public.bulk_invite_team_members(
  _team_id uuid,
  _invites jsonb -- Array of {email: string, role: string}
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _invite jsonb;
  _email text;
  _role text;
  _user_id uuid;
  _existing_member_id uuid;
  _results jsonb := '[]'::jsonb;
  _result jsonb;
BEGIN
  -- Iterate through each invite
  FOR _invite IN SELECT * FROM jsonb_array_elements(_invites)
  LOOP
    _email := _invite->>'email';
    _role := _invite->>'role';
    
    -- Find user by email in auth.users
    SELECT id INTO _user_id
    FROM auth.users
    WHERE email = _email;
    
    IF _user_id IS NULL THEN
      _result := jsonb_build_object(
        'email', _email,
        'status', 'skipped',
        'message', 'User not found in auth.users'
      );
      _results := _results || _result;
      CONTINUE;
    END IF;
    
    -- Upsert admin_profiles
    INSERT INTO public.admin_profiles (id, email, full_name)
    VALUES (_user_id, _email, _email)
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(admin_profiles.full_name, EXCLUDED.full_name);
    
    -- Check if team member already exists
    SELECT id INTO _existing_member_id
    FROM public.console_team_members
    WHERE team_id = _team_id AND admin_id = _user_id;
    
    IF _existing_member_id IS NOT NULL THEN
      -- Update role if different
      UPDATE public.console_team_members
      SET role = _role
      WHERE id = _existing_member_id
      AND role != _role;
      
      IF FOUND THEN
        _result := jsonb_build_object(
          'email', _email,
          'status', 'updated',
          'message', 'Role updated to ' || _role
        );
      ELSE
        _result := jsonb_build_object(
          'email', _email,
          'status', 'exists',
          'message', 'Already a member with correct role'
        );
      END IF;
    ELSE
      -- Insert new team member
      INSERT INTO public.console_team_members (team_id, admin_id, role)
      VALUES (_team_id, _user_id, _role);
      
      _result := jsonb_build_object(
        'email', _email,
        'status', 'added',
        'message', 'Added as ' || _role
      );
    END IF;
    
    _results := _results || _result;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'results', _results,
    'summary', jsonb_build_object(
      'total', jsonb_array_length(_invites),
      'added', (SELECT COUNT(*) FROM jsonb_array_elements(_results) WHERE value->>'status' = 'added'),
      'updated', (SELECT COUNT(*) FROM jsonb_array_elements(_results) WHERE value->>'status' = 'updated'),
      'exists', (SELECT COUNT(*) FROM jsonb_array_elements(_results) WHERE value->>'status' = 'exists'),
      'skipped', (SELECT COUNT(*) FROM jsonb_array_elements(_results) WHERE value->>'status' = 'skipped')
    )
  );
END;
$$;