-- Fix infinite recursion in console_team_members policies by using security definer functions
CREATE OR REPLACE FUNCTION public.get_user_team_memberships(_user_id uuid)
RETURNS TABLE(team_id uuid, role text, member_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT ctm.team_id, ctm.role, ctm.id as member_id
  FROM console_team_members ctm
  WHERE ctm.admin_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.is_team_owner_or_admin(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM console_team_members ctm
    WHERE ctm.admin_id = _user_id 
    AND ctm.team_id = _team_id
    AND ctm.role IN ('Owner', 'Admin')
  );
$$;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Team members can view their team" ON console_team_members;
DROP POLICY IF EXISTS "Owner or Admin can insert team members" ON console_team_members;
DROP POLICY IF EXISTS "Owner or Admin can update team members" ON console_team_members;
DROP POLICY IF EXISTS "Owner or Admin can delete team members" ON console_team_members;

-- Create new policies using security definer functions
CREATE POLICY "Team members can view their team memberships" ON console_team_members
FOR SELECT USING (
  admin_id = auth.uid() OR 
  team_id IN (SELECT t.team_id FROM get_user_team_memberships(auth.uid()) t)
);

CREATE POLICY "Owners and Admins can insert team members" ON console_team_members
FOR INSERT WITH CHECK (
  is_team_owner_or_admin(auth.uid(), team_id)
);

CREATE POLICY "Owners and Admins can update team members" ON console_team_members
FOR UPDATE USING (
  is_team_owner_or_admin(auth.uid(), team_id)
);

CREATE POLICY "Owners and Admins can delete team members" ON console_team_members
FOR DELETE USING (
  is_team_owner_or_admin(auth.uid(), team_id)
);

-- Create rate limiting tables
CREATE TABLE IF NOT EXISTS public.team_rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid NOT NULL,
  user_id uuid NOT NULL,
  limit_type text NOT NULL, -- 'invites' or 'role_changes'
  count integer NOT NULL DEFAULT 0,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(team_id, user_id, limit_type, window_start)
);

-- Enable RLS on rate limits table
ALTER TABLE public.team_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rate limits" ON team_rate_limits
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage rate limits" ON team_rate_limits
FOR ALL USING (true);

-- Function to check and increment rate limits
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  _team_id uuid,
  _user_id uuid,
  _limit_type text,
  _max_count integer,
  _window_hours integer DEFAULT 24
)
RETURNS TABLE(allowed boolean, current_count integer, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _window_start timestamp with time zone;
  _current_count integer := 0;
  _retry_after integer := 0;
BEGIN
  -- Calculate window start based on limit type
  IF _limit_type = 'invites' THEN
    _window_start := date_trunc('hour', now());
  ELSE
    _window_start := date_trunc('day', now());
  END IF;
  
  -- Get or create rate limit record
  INSERT INTO team_rate_limits (team_id, user_id, limit_type, window_start, count)
  VALUES (_team_id, _user_id, _limit_type, _window_start, 0)
  ON CONFLICT (team_id, user_id, limit_type, window_start)
  DO NOTHING;
  
  -- Get current count
  SELECT count INTO _current_count
  FROM team_rate_limits
  WHERE team_id = _team_id 
    AND user_id = _user_id 
    AND limit_type = _limit_type 
    AND window_start = _window_start;
    
  -- Check if limit exceeded
  IF _current_count >= _max_count THEN
    -- Calculate retry after
    IF _limit_type = 'invites' THEN
      _retry_after := EXTRACT(EPOCH FROM (_window_start + interval '1 hour' - now()))::integer;
    ELSE
      _retry_after := EXTRACT(EPOCH FROM (_window_start + interval '1 day' - now()))::integer;
    END IF;
    
    RETURN QUERY SELECT false, _current_count, _retry_after;
  ELSE
    -- Increment count
    UPDATE team_rate_limits 
    SET count = count + 1, updated_at = now()
    WHERE team_id = _team_id 
      AND user_id = _user_id 
      AND limit_type = _limit_type 
      AND window_start = _window_start;
      
    RETURN QUERY SELECT true, _current_count + 1, 0;
  END IF;
END;
$$;

-- Function to log team audit events
CREATE OR REPLACE FUNCTION public.log_team_audit_event(
  _team_id uuid,
  _actor_email text,
  _action text,
  _target text,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (customer_id, actor, action, target, meta)
  VALUES (_team_id, _actor_email, _action, _target, _details);
END;
$$;