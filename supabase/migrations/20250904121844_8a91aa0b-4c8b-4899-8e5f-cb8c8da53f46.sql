-- Create function to get failed attempts count since a specific time
CREATE OR REPLACE FUNCTION public.get_failed_attempts_count_since(
  email_address text,
  since_time timestamp with time zone
)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM public.login_attempts
  WHERE email = email_address
    AND success = false
    AND created_at >= since_time;
$$;