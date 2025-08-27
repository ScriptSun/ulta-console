-- Create agents table
CREATE TABLE public.agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  name TEXT NOT NULL,
  agent_type TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('running', 'idle', 'error', 'offline')),
  version TEXT,
  os TEXT,
  region TEXT,
  ip_address INET,
  last_seen TIMESTAMP WITH TIME ZONE,
  uptime_seconds INTEGER DEFAULT 0,
  cpu_usage DECIMAL(5,2) DEFAULT 0.0,
  memory_usage DECIMAL(5,2) DEFAULT 0.0,
  tasks_completed INTEGER DEFAULT 0,
  auto_updates_enabled BOOLEAN DEFAULT true,
  certificate_fingerprint TEXT,
  signature_key_version INTEGER DEFAULT 1,
  last_cert_rotation TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL DEFAULT auth.uid(),
  updated_by UUID NOT NULL DEFAULT auth.uid()
);

-- Create agent_heartbeats table for real-time monitoring
CREATE TABLE public.agent_heartbeats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  cpu_usage DECIMAL(5,2) NOT NULL,
  memory_usage DECIMAL(5,2) NOT NULL,
  uptime_seconds INTEGER NOT NULL,
  open_ports INTEGER[] DEFAULT '{}',
  disk_usage DECIMAL(5,2) DEFAULT 0.0,
  network_io_in BIGINT DEFAULT 0,
  network_io_out BIGINT DEFAULT 0,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agent_logs table
CREATE TABLE public.agent_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agent_tasks table
CREATE TABLE public.agent_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agent_deployment_tokens table for secure deployment
CREATE TABLE public.agent_deployment_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '15 minutes'),
  used_at TIMESTAMP WITH TIME ZONE,
  agent_id UUID REFERENCES public.agents(id),
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_deployment_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agents table
CREATE POLICY "Admins can manage all agents" 
ON public.agents FOR ALL 
USING (is_admin());

CREATE POLICY "Viewers can read agents in tenant" 
ON public.agents FOR SELECT 
USING ((customer_id = ANY (get_user_customer_ids())) OR is_admin());

CREATE POLICY "Editors can insert agents in tenant" 
ON public.agents FOR INSERT 
WITH CHECK (
  (get_user_role_in_customer(customer_id, 'editor'::app_role) OR 
   get_user_role_in_customer(customer_id, 'approver'::app_role) OR 
   is_admin()) AND 
  (customer_id = ANY (get_user_customer_ids())) AND 
  (created_by = auth.uid())
);

CREATE POLICY "Approvers can update agents in tenant" 
ON public.agents FOR UPDATE 
USING (
  (customer_id = ANY (get_user_customer_ids())) AND 
  (get_user_role_in_customer(customer_id, 'approver'::app_role) OR is_admin())
) 
WITH CHECK (updated_by = auth.uid());

CREATE POLICY "Approvers can delete agents in tenant" 
ON public.agents FOR DELETE 
USING (
  (customer_id = ANY (get_user_customer_ids())) AND 
  (get_user_role_in_customer(customer_id, 'approver'::app_role) OR is_admin())
);

-- RLS Policies for agent_heartbeats table
CREATE POLICY "Admins can manage all agent_heartbeats" 
ON public.agent_heartbeats FOR ALL 
USING (is_admin());

CREATE POLICY "Viewers can read agent_heartbeats in tenant" 
ON public.agent_heartbeats FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.agents a 
    WHERE a.id = agent_heartbeats.agent_id AND 
    ((a.customer_id = ANY (get_user_customer_ids())) OR is_admin())
  )
);

CREATE POLICY "System can insert agent_heartbeats" 
ON public.agent_heartbeats FOR INSERT 
WITH CHECK (true);

-- RLS Policies for agent_logs table
CREATE POLICY "Admins can manage all agent_logs" 
ON public.agent_logs FOR ALL 
USING (is_admin());

CREATE POLICY "Viewers can read agent_logs in tenant" 
ON public.agent_logs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.agents a 
    WHERE a.id = agent_logs.agent_id AND 
    ((a.customer_id = ANY (get_user_customer_ids())) OR is_admin())
  )
);

CREATE POLICY "System can insert agent_logs" 
ON public.agent_logs FOR INSERT 
WITH CHECK (true);

-- RLS Policies for agent_tasks table
CREATE POLICY "Admins can manage all agent_tasks" 
ON public.agent_tasks FOR ALL 
USING (is_admin());

CREATE POLICY "Viewers can read agent_tasks in tenant" 
ON public.agent_tasks FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.agents a 
    WHERE a.id = agent_tasks.agent_id AND 
    ((a.customer_id = ANY (get_user_customer_ids())) OR is_admin())
  )
);

CREATE POLICY "System can insert agent_tasks" 
ON public.agent_tasks FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update agent_tasks" 
ON public.agent_tasks FOR UPDATE 
USING (true);

-- RLS Policies for agent_deployment_tokens table
CREATE POLICY "Admins can manage all agent_deployment_tokens" 
ON public.agent_deployment_tokens FOR ALL 
USING (is_admin());

CREATE POLICY "Editors can create deployment tokens in tenant" 
ON public.agent_deployment_tokens FOR INSERT 
WITH CHECK (
  (get_user_role_in_customer(customer_id, 'editor'::app_role) OR 
   get_user_role_in_customer(customer_id, 'approver'::app_role) OR 
   is_admin()) AND 
  (customer_id = ANY (get_user_customer_ids())) AND 
  (created_by = auth.uid())
);

CREATE POLICY "Users can read their deployment tokens" 
ON public.agent_deployment_tokens FOR SELECT 
USING (
  ((customer_id = ANY (get_user_customer_ids())) OR is_admin()) AND
  (created_by = auth.uid() OR is_admin())
);

-- Create indexes for performance
CREATE INDEX idx_agents_customer_id ON public.agents(customer_id);
CREATE INDEX idx_agents_status ON public.agents(status);
CREATE INDEX idx_agents_last_seen ON public.agents(last_seen);
CREATE INDEX idx_agent_heartbeats_agent_id ON public.agent_heartbeats(agent_id);
CREATE INDEX idx_agent_heartbeats_timestamp ON public.agent_heartbeats(timestamp);
CREATE INDEX idx_agent_logs_agent_id ON public.agent_logs(agent_id);
CREATE INDEX idx_agent_logs_timestamp ON public.agent_logs(timestamp);
CREATE INDEX idx_agent_tasks_agent_id ON public.agent_tasks(agent_id);
CREATE INDEX idx_agent_tasks_status ON public.agent_tasks(status);
CREATE INDEX idx_deployment_tokens_expires_at ON public.agent_deployment_tokens(expires_at);

-- Create triggers for updated_at
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_heartbeats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_tasks;

-- Set replica identity for realtime
ALTER TABLE public.agents REPLICA IDENTITY FULL;
ALTER TABLE public.agent_heartbeats REPLICA IDENTITY FULL;
ALTER TABLE public.agent_logs REPLICA IDENTITY FULL;
ALTER TABLE public.agent_tasks REPLICA IDENTITY FULL;