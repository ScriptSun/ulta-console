-- Create security_events table for tracking security incidents
CREATE TABLE public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  source TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  ticket_id TEXT,
  origin TEXT,
  details JSONB DEFAULT '{}',
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

CREATE POLICY "Viewers can read security_events in tenant" 
ON public.security_events 
FOR SELECT 
USING ((tenant_id = ANY (get_user_customer_ids())) OR is_admin());

-- Create indexes for performance
CREATE INDEX idx_security_events_tenant_id ON public.security_events(tenant_id);
CREATE INDEX idx_security_events_created_at ON public.security_events(created_at);
CREATE INDEX idx_security_events_type ON public.security_events(event_type);

-- Create widget_metrics table for dashboard analytics  
CREATE TABLE public.widget_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  date_bucket DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on widget_metrics
ALTER TABLE public.widget_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for widget_metrics
CREATE POLICY "Admins can manage all widget_metrics" 
ON public.widget_metrics 
FOR ALL 
USING (is_admin());

CREATE POLICY "System can insert widget_metrics" 
ON public.widget_metrics 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update widget_metrics" 
ON public.widget_metrics 
FOR UPDATE 
USING (true);

CREATE POLICY "Viewers can read widget_metrics in tenant" 
ON public.widget_metrics 
FOR SELECT 
USING ((tenant_id = ANY (get_user_customer_ids())) OR is_admin());

-- Create indexes for performance
CREATE INDEX idx_widget_metrics_tenant_date ON public.widget_metrics(tenant_id, date_bucket);
CREATE INDEX idx_widget_metrics_type ON public.widget_metrics(metric_type);

-- Create function to increment widget metrics
CREATE OR REPLACE FUNCTION public.increment_widget_metric(
  _tenant_id UUID,
  _metric_type TEXT,
  _increment INTEGER DEFAULT 1,
  _metadata JSONB DEFAULT '{}'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.widget_metrics (tenant_id, metric_type, metric_value, metadata, date_bucket)
  VALUES (_tenant_id, _metric_type, _increment, _metadata, CURRENT_DATE)
  ON CONFLICT (tenant_id, metric_type, date_bucket)
  DO UPDATE SET 
    metric_value = widget_metrics.metric_value + _increment,
    metadata = COALESCE(_metadata, widget_metrics.metadata),
    updated_at = now();
END;
$$;