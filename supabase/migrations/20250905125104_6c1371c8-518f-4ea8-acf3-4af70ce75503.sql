-- Create notification policies table for event routing
CREATE TABLE IF NOT EXISTS public.notification_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  event_key TEXT NOT NULL,
  event_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'system',
  severity TEXT NOT NULL DEFAULT 'info',
  channels JSONB NOT NULL DEFAULT '{"email": false, "telegram": false, "slack": false, "discord": false, "sms": false, "webhook": false, "inapp": false}',
  escalation JSONB NULL,
  failover JSONB NULL,
  environment TEXT NOT NULL DEFAULT 'prod',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_id, event_key, environment)
);

-- Enable RLS
ALTER TABLE public.notification_policies ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view policies in their customer"
ON public.notification_policies
FOR SELECT
USING (customer_id = ANY(get_user_customer_ids()) OR is_admin());

CREATE POLICY "Users can insert policies in their customer"
ON public.notification_policies
FOR INSERT
WITH CHECK (customer_id = ANY(get_user_customer_ids()));

CREATE POLICY "Users can update policies in their customer" 
ON public.notification_policies
FOR UPDATE
USING (customer_id = ANY(get_user_customer_ids()));

CREATE POLICY "Users can delete policies in their customer"
ON public.notification_policies
FOR DELETE
USING (customer_id = ANY(get_user_customer_ids()));

-- Create event logs table for escalation threshold tracking
CREATE TABLE IF NOT EXISTS public.notification_event_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  event_key TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'prod',
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payload JSONB NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on event logs
ALTER TABLE public.notification_event_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for event logs
CREATE POLICY "Users can view event logs in their customer"
ON public.notification_event_logs
FOR SELECT
USING (customer_id = ANY(get_user_customer_ids()) OR is_admin());

CREATE POLICY "System can insert event logs"
ON public.notification_event_logs
FOR INSERT
WITH CHECK (true);