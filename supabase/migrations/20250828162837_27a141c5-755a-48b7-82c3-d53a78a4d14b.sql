-- Create widget_tickets table
CREATE TABLE public.widget_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID,
  agent_id UUID NOT NULL,
  origin TEXT NOT NULL,
  ua_hash TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '5 minutes'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create widget_sessions table
CREATE TABLE public.widget_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID,
  agent_id UUID NOT NULL,
  conversation_id UUID,
  csrf TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 hour'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_widget_tickets_expires_at ON public.widget_tickets (expires_at);
CREATE INDEX idx_widget_sessions_agent_expires ON public.widget_sessions (agent_id, expires_at);

-- Enable RLS
ALTER TABLE public.widget_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for widget_tickets
CREATE POLICY "Service role can manage widget_tickets" 
ON public.widget_tickets 
FOR ALL 
USING (current_setting('role') = 'service_role');

CREATE POLICY "Users can view tickets in their tenant" 
ON public.widget_tickets 
FOR SELECT 
USING (tenant_id = ANY (get_user_customer_ids()) OR is_admin());

-- RLS policies for widget_sessions  
CREATE POLICY "Service role can manage widget_sessions"
ON public.widget_sessions
FOR ALL
USING (current_setting('role') = 'service_role');

CREATE POLICY "Users can view sessions in their tenant"
ON public.widget_sessions
FOR SELECT
USING (tenant_id = ANY (get_user_customer_ids()) OR is_admin());