-- Enable RLS on new tables
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- Create policies for security_events
CREATE POLICY "Admins can manage all security_events" 
ON public.security_events 
FOR ALL 
USING (is_admin());

CREATE POLICY "System can insert security_events" 
ON public.security_events 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view security_events in their tenant" 
ON public.security_events 
FOR SELECT 
USING ((tenant_id = ANY (get_user_customer_ids())) OR is_admin());

-- Create policies for widget_sessions
CREATE POLICY "System can manage widget_sessions" 
ON public.widget_sessions 
FOR ALL 
USING (true);

-- Create policies for rate_limit_buckets
CREATE POLICY "System can manage rate_limit_buckets" 
ON public.rate_limit_buckets 
FOR ALL 
USING (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_events_tenant_id ON public.security_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_widget_sessions_session_id ON public.widget_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_widget_sessions_expires_at ON public.widget_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_key ON public.rate_limit_buckets(bucket_key);
CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_window_start ON public.rate_limit_buckets(window_start);
CREATE INDEX IF NOT EXISTS idx_chat_messages_content_sha256 ON public.chat_messages(content_sha256);

-- Add function to clean up expired sessions and rate limit buckets
CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Clean up expired widget sessions
  DELETE FROM public.widget_sessions 
  WHERE expires_at < now() OR (is_active = false AND created_at < now() - interval '1 hour');
  
  -- Clean up old rate limit buckets (older than 1 hour)
  DELETE FROM public.rate_limit_buckets 
  WHERE window_start < now() - interval '1 hour';
  
  -- Clean up old security events (older than 30 days)
  DELETE FROM public.security_events 
  WHERE created_at < now() - interval '30 days';
END;
$$;