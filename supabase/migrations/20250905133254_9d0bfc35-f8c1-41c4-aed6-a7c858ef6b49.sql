-- Insert expert notification policies (without ON CONFLICT since we don't know the unique constraints)
INSERT INTO notification_policies (
  customer_id, 
  event_key, 
  event_name,
  category,
  severity,
  channels, 
  environment,
  enabled,
  created_by,
  updated_by
) VALUES 
-- Security Events (only add if not exists)
('00000000-0000-0000-0000-000000000001', 'security.login.failed', 'Multiple Failed Login Attempts', 'security', 'warning', '{"email": true, "telegram": true, "slack": true, "inapp": true, "discord": false, "sms": false, "webhook": false}', 'prod', true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

('00000000-0000-0000-0000-000000000001', 'security.login.blocked', 'Account Temporarily Locked', 'security', 'critical', '{"email": true, "telegram": true, "slack": true, "inapp": true, "discord": false, "sms": true, "webhook": false}', 'prod', true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

('00000000-0000-0000-0000-000000000001', 'security.password.changed', 'Password Successfully Updated', 'security', 'info', '{"email": true, "telegram": true, "slack": false, "inapp": true, "discord": false, "sms": false, "webhook": false}', 'prod', true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

('00000000-0000-0000-0000-000000000001', 'security.2fa.enabled', 'Two-Factor Authentication Activated', 'security', 'info', '{"email": true, "telegram": true, "slack": false, "inapp": true, "discord": false, "sms": false, "webhook": false}', 'prod', true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

-- Account Events  
('00000000-0000-0000-0000-000000000001', 'account.created', 'Welcome! Account Created Successfully', 'account', 'info', '{"email": true, "telegram": false, "slack": false, "inapp": true, "discord": false, "sms": false, "webhook": false}', 'prod', true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

('00000000-0000-0000-0000-000000000001', 'account.verified', 'Email Verification Completed', 'account', 'info', '{"email": true, "telegram": false, "slack": false, "inapp": true, "discord": false, "sms": false, "webhook": false}', 'prod', true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

-- Agent Events
('00000000-0000-0000-0000-000000000001', 'agent.deployed', 'Agent Successfully Deployed', 'agent', 'info', '{"email": true, "telegram": true, "slack": true, "inapp": true, "discord": false, "sms": false, "webhook": false}', 'prod', true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

('00000000-0000-0000-0000-000000000001', 'agent.offline', 'Agent Connection Lost', 'agent', 'warning', '{"email": true, "telegram": true, "slack": true, "inapp": true, "discord": false, "sms": false, "webhook": false}', 'prod', true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

('00000000-0000-0000-0000-000000000001', 'agent.error', 'Agent Execution Error', 'agent', 'critical', '{"email": true, "telegram": true, "slack": true, "inapp": true, "discord": false, "sms": false, "webhook": true}', 'prod', true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

('00000000-0000-0000-0000-000000000001', 'agent.task.completed', 'Task Completed Successfully', 'agent', 'info', '{"email": false, "telegram": true, "slack": false, "inapp": true, "discord": false, "sms": false, "webhook": false}', 'prod', true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

-- System Events
('00000000-0000-0000-0000-000000000001', 'system.maintenance.scheduled', 'Scheduled Maintenance Window', 'system', 'warning', '{"email": true, "telegram": true, "slack": true, "inapp": true, "discord": false, "sms": false, "webhook": false}', 'prod', true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

('00000000-0000-0000-0000-000000000001', 'system.update.available', 'New System Update Deployed', 'system', 'info', '{"email": true, "telegram": false, "slack": false, "inapp": true, "discord": false, "sms": false, "webhook": false}', 'prod', true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

('00000000-0000-0000-0000-000000000001', 'system.outage.detected', 'Service Disruption Detected', 'system', 'critical', '{"email": true, "telegram": true, "slack": true, "inapp": true, "discord": false, "sms": true, "webhook": true}', 'prod', true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

-- Billing Events
('00000000-0000-0000-0000-000000000001', 'billing.payment.success', 'Payment Processed Successfully', 'billing', 'info', '{"email": true, "telegram": false, "slack": false, "inapp": true, "discord": false, "sms": false, "webhook": false}', 'prod', true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

('00000000-0000-0000-0000-000000000001', 'billing.payment.failed', 'Payment Processing Failed', 'billing', 'critical', '{"email": true, "telegram": true, "slack": false, "inapp": true, "discord": false, "sms": false, "webhook": false}', 'prod', true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

('00000000-0000-0000-0000-000000000001', 'billing.usage.limit', 'Approaching Usage Limit', 'billing', 'warning', '{"email": true, "telegram": true, "slack": false, "inapp": true, "discord": false, "sms": false, "webhook": false}', 'prod', true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')

-- Only insert if the event_key doesn't already exist
WHERE NOT EXISTS (
  SELECT 1 FROM notification_policies 
  WHERE customer_id = '00000000-0000-0000-0000-000000000001' 
  AND event_key IN ('security.login.failed', 'security.login.blocked', 'security.password.changed', 'security.2fa.enabled', 'account.created', 'account.verified', 'agent.deployed', 'agent.offline', 'agent.error', 'agent.task.completed', 'system.maintenance.scheduled', 'system.update.available', 'system.outage.detected', 'billing.payment.success', 'billing.payment.failed', 'billing.usage.limit')
);