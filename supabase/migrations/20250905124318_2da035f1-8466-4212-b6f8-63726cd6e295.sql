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
  created_by UUID NOT NULL DEFAULT auth.uid(),
  updated_by UUID NOT NULL DEFAULT auth.uid(),
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
WITH CHECK (customer_id = ANY(get_user_customer_ids()) AND created_by = auth.uid());

CREATE POLICY "Users can update policies in their customer" 
ON public.notification_policies
FOR UPDATE
USING (customer_id = ANY(get_user_customer_ids()))
WITH CHECK (updated_by = auth.uid());

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

-- Insert default notification policies for the system customer
INSERT INTO public.notification_policies (customer_id, event_key, event_name, category, severity, channels) VALUES
-- Security events
('00000000-0000-0000-0000-000000000001', 'security.bulk_delete.started', 'Bulk Delete Started', 'security', 'warning', '{"email": true, "telegram": false, "slack": false, "discord": false, "sms": false, "webhook": false, "inapp": true}'),
('00000000-0000-0000-0000-000000000001', 'security.bulk_delete.completed', 'Bulk Delete Completed', 'security', 'info', '{"email": true, "telegram": false, "slack": false, "discord": false, "sms": false, "webhook": false, "inapp": true}'),
('00000000-0000-0000-0000-000000000001', 'security.login.bans.threshold', 'Login Bans Threshold', 'security', 'critical', '{"email": true, "telegram": true, "slack": false, "discord": false, "sms": false, "webhook": false, "inapp": true}'),
('00000000-0000-0000-0000-000000000001', 'security.anomaly.detected', 'Security Anomaly Detected', 'security', 'critical', '{"email": true, "telegram": true, "slack": true, "discord": false, "sms": false, "webhook": false, "inapp": true}'),
-- Account events
('00000000-0000-0000-0000-000000000001', 'user.created', 'User Created', 'account', 'info', '{"email": false, "telegram": false, "slack": false, "discord": false, "sms": false, "webhook": false, "inapp": true}'),
('00000000-0000-0000-0000-000000000001', 'user.login.failed', 'User Login Failed', 'account', 'warning', '{"email": false, "telegram": false, "slack": false, "discord": false, "sms": false, "webhook": false, "inapp": true}'),
('00000000-0000-0000-0000-000000000001', 'user.login.blocked', 'User Login Blocked', 'account', 'critical', '{"email": true, "telegram": true, "slack": false, "discord": false, "sms": false, "webhook": false, "inapp": true}'),
('00000000-0000-0000-0000-000000000001', 'api.key.created', 'API Key Created', 'account', 'info', '{"email": true, "telegram": false, "slack": false, "discord": false, "sms": false, "webhook": false, "inapp": true}'),
-- Agent events
('00000000-0000-0000-0000-000000000001', 'agent.created', 'Agent Created', 'agents', 'info', '{"email": false, "telegram": false, "slack": false, "discord": false, "sms": false, "webhook": false, "inapp": true}'),
('00000000-0000-0000-0000-000000000001', 'agent.deleted', 'Agent Deleted', 'agents', 'warning', '{"email": true, "telegram": false, "slack": false, "discord": false, "sms": false, "webhook": false, "inapp": true}'),
('00000000-0000-0000-0000-000000000001', 'agent.error', 'Agent Error', 'agents', 'critical', '{"email": true, "telegram": true, "slack": false, "discord": false, "sms": false, "webhook": false, "inapp": true}'),
-- Billing events
('00000000-0000-0000-0000-000000000001', 'invoice.created', 'Invoice Created', 'billing', 'info', '{"email": true, "telegram": false, "slack": false, "discord": false, "sms": false, "webhook": false, "inapp": true}'),
('00000000-0000-0000-0000-000000000001', 'invoice.payment_failed', 'Invoice Payment Failed', 'billing', 'critical', '{"email": true, "telegram": false, "slack": false, "discord": false, "sms": false, "webhook": false, "inapp": true}'),
-- System events
('00000000-0000-0000-0000-000000000001', 'model.error', 'Model Error', 'system', 'critical', '{"email": true, "telegram": true, "slack": false, "discord": false, "sms": false, "webhook": false, "inapp": true}'),
('00000000-0000-0000-0000-000000000001', 'usage.limit.reached', 'Usage Limit Reached', 'system', 'warning', '{"email": true, "telegram": false, "slack": false, "discord": false, "sms": false, "webhook": false, "inapp": true}')
ON CONFLICT (customer_id, event_key, environment) DO NOTHING;