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

-- Add rate_limit_buckets table for rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket_key TEXT NOT NULL UNIQUE,
  bucket_type TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add content_sha256 column to chat_messages for deduplication
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS content_sha256 TEXT;