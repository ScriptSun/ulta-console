-- Add security_events table for logging WSS connections and security events
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  session_id TEXT,
  agent_id UUID,
  tenant_id UUID,
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on security_events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

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

-- Add widget_sessions table for session management
CREATE TABLE IF NOT EXISTS public.widget_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  agent_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  user_id UUID,
  conversation_id UUID,
  csrf_token TEXT NOT NULL,
  user_agent_hash TEXT,
  origin TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 minutes'),
  last_rotated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on widget_sessions
ALTER TABLE public.widget_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for widget_sessions
CREATE POLICY "System can manage widget_sessions" 
ON public.widget_sessions 
FOR ALL 
USING (true);

-- Add rate_limit_buckets table for rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket_key TEXT NOT NULL UNIQUE,
  bucket_type TEXT NOT NULL, -- 'session', 'agent', 'tenant'
  count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on rate_limit_buckets
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

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

-- Add content_sha256 column to chat_messages for deduplication
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS content_sha256 TEXT;

-- Create index on content_sha256 for dedup checking
CREATE INDEX IF NOT EXISTS idx_chat_messages_content_sha256 ON public.chat_messages(content_sha256);

-- Add function to clean up expired sessions and rate limit buckets
CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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