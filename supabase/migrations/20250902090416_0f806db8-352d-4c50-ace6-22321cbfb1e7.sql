-- Create router_events table for persisting router decisions
CREATE TABLE IF NOT EXISTS public.router_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  agent_id UUID,
  conversation_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exec_events table for execution tracking
CREATE TABLE IF NOT EXISTS public.exec_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  source TEXT DEFAULT 'batch',
  agent_id UUID,
  batch_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.router_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exec_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for router_events
CREATE POLICY "Admins can manage all router_events" 
ON public.router_events 
FOR ALL 
USING (is_admin());

CREATE POLICY "System can insert router_events" 
ON public.router_events 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view router_events in their tenant" 
ON public.router_events 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM agents a 
    WHERE a.id = router_events.agent_id 
    AND (a.customer_id = ANY(get_user_customer_ids()) OR is_admin())
  )
);

-- RLS policies for exec_events  
CREATE POLICY "Admins can manage all exec_events" 
ON public.exec_events 
FOR ALL 
USING (is_admin());

CREATE POLICY "System can insert exec_events" 
ON public.exec_events 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view exec_events in their tenant" 
ON public.exec_events 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM agents a 
    WHERE a.id = exec_events.agent_id 
    AND (a.customer_id = ANY(get_user_customer_ids()) OR is_admin())
  )
);

-- Add source column to batch_runs if it doesn't exist
ALTER TABLE public.batch_runs 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'batch';

-- Add metadata column to batch_runs if it doesn't exist  
ALTER TABLE public.batch_runs 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_router_events_run_id ON public.router_events(run_id);
CREATE INDEX IF NOT EXISTS idx_router_events_agent_id ON public.router_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_exec_events_run_id ON public.exec_events(run_id);
CREATE INDEX IF NOT EXISTS idx_exec_events_agent_id ON public.exec_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_exec_events_source ON public.exec_events(source);
CREATE INDEX IF NOT EXISTS idx_batch_runs_source ON public.batch_runs(source);