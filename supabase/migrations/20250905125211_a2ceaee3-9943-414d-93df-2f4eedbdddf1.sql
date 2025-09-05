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