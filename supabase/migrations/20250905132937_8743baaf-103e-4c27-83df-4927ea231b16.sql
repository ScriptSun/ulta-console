-- Create expert notification messages for different event types
INSERT INTO notification_policies (
  customer_id, 
  event_key, 
  enabled, 
  channels, 
  email_message, 
  telegram_message, 
  slack_message,
  escalation_enabled,
  escalation_threshold,
  escalation_window_minutes,
  created_by,
  updated_by
) VALUES 
-- Security Events
('00000000-0000-0000-0000-000000000001', 'security.login.failed', true, '["email", "telegram", "slack"]', 
  'Multiple failed login attempts detected on your account. If this wasn''t you, please secure your account immediately.',
  '🔒 SECURITY ALERT: Multiple failed login attempts detected. Review your account security now.',
  '🔒 Security Alert: Failed login attempts detected for user {user_email}. Location: {location}. Time: {timestamp}.',
  true, 3, 60, 
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

('00000000-0000-0000-0000-000000000001', 'security.login.blocked', true, '["email", "telegram", "slack"]',
  'Your account has been temporarily locked due to suspicious login activity. Contact support if you need assistance.',
  '🚨 ACCOUNT LOCKED: Account temporarily blocked due to suspicious activity. Contact support for assistance.',
  '🚨 Account Security: User account {user_email} has been temporarily locked due to failed login attempts.',
  true, 1, 30,
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

('00000000-0000-0000-0000-000000000001', 'security.password.changed', true, '["email", "telegram"]',
  'Your password has been successfully updated. If you didn''t make this change, please contact support immediately.',
  '✅ Password successfully updated for your account. If this wasn''t you, contact support immediately.',
  '🔐 Password Changed: User {user_email} has updated their password.',
  false, 0, 0,
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

('00000000-0000-0000-0000-000000000001', 'security.2fa.enabled', true, '["email", "telegram"]',
  'Two-factor authentication has been successfully activated for your account. Your account is now more secure.',
  '🛡️ 2FA Enabled: Two-factor authentication activated successfully. Your account is now more secure!',
  '🛡️ Security Enhancement: 2FA enabled for user {user_email}.',
  false, 0, 0,
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

('00000000-0000-0000-0000-000000000001', 'api.key.created', true, '["email", "inapp", "telegram"]',
  'A new API key has been created for your account. Keep it secure and never share it publicly.',
  '🔑 New API key created: {key_name}. Keep it secure and never share publicly!',
  '🔑 API Key Created: New API key "{key_name}" created by {user_email}.',
  false, 0, 0,
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

-- Account Events  
('00000000-0000-0000-0000-000000000001', 'account.created', true, '["email", "inapp"]',
  'Welcome to UltaAI! Your account has been successfully created. Get started by exploring your dashboard.',
  '🎉 Welcome to UltaAI! Your account is ready. Start exploring your new dashboard!',
  '👋 New User: {user_email} has joined UltaAI.',
  false, 0, 0,
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

('00000000-0000-0000-0000-000000000001', 'account.verified', true, '["email", "inapp"]',
  'Your email has been successfully verified. You now have full access to all UltaAI features.',
  '✅ Email verified successfully! You now have full access to all UltaAI features.',
  '✅ Account Verified: {user_email} has completed email verification.',
  false, 0, 0,
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

-- Agent Events
('00000000-0000-0000-0000-000000000001', 'agent.deployed', true, '["email", "telegram", "slack"]',
  'Agent "{agent_name}" has been successfully deployed and is now ready to handle tasks.',
  '🤖 Agent Deployed: {agent_name} is now online and ready for action!',
  '🚀 Agent Deployment: {agent_name} deployed successfully and operational.',
  false, 0, 0,
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

('00000000-0000-0000-0000-000000000001', 'agent.offline', true, '["email", "telegram", "slack"]',
  'Agent "{agent_name}" has gone offline. Investigating connectivity issues and working to restore service.',
  '🔴 Agent Offline: {agent_name} is currently offline. Investigating connectivity issues.',
  '⚠️ Agent Status: {agent_name} has gone offline. Last seen: {last_seen}.',
  true, 2, 30,
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

('00000000-0000-0000-0000-000000000001', 'agent.error', true, '["email", "telegram", "slack"]',
  'Agent "{agent_name}" encountered an error during task execution. Error details: {error_message}',
  '🚨 Agent Error: {agent_name} encountered an error. Check the logs for details.',
  '❌ Agent Error: {agent_name} failed task execution. Error: {error_message}',
  true, 3, 15,
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

('00000000-0000-0000-0000-000000000001', 'agent.task.completed', true, '["inapp", "telegram"]',
  'Task "{task_name}" has been completed successfully by agent "{agent_name}".',
  '✅ Task Complete: {task_name} finished successfully by {agent_name}.',
  '✅ Task Completed: {task_name} by {agent_name}. Duration: {duration}.',
  false, 0, 0,
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

-- System Events
('00000000-0000-0000-0000-000000000001', 'system.maintenance.scheduled', true, '["email", "telegram", "slack"]',
  'Scheduled maintenance window is approaching. Service may be temporarily unavailable during this time.',
  '🔧 Scheduled Maintenance: Service maintenance window starting soon. Duration: {duration}',
  '🔧 Maintenance Alert: Scheduled maintenance from {start_time} to {end_time}.',
  false, 0, 0,
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

('00000000-0000-0000-0000-000000000001', 'system.update.available', true, '["email", "inapp"]',
  'A new system update has been deployed with performance improvements and new features.',
  '🆕 System Update: New features and improvements are now available!',
  '🆕 System Update: Version {version} deployed with {feature_count} new features.',
  false, 0, 0,
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

('00000000-0000-0000-0000-000000000001', 'system.outage.detected', true, '["email", "telegram", "slack"]',
  'Service disruption detected in {service_name}. Our team is investigating and working to resolve the issue.',
  '🚨 Service Outage: Disruption detected in {service_name}. Team is investigating.',
  '🚨 Outage Alert: {service_name} experiencing issues. Impact: {impact_level}.',
  true, 1, 15,
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

-- Billing Events
('00000000-0000-0000-0000-000000000001', 'billing.payment.success', true, '["email", "inapp"]',
  'Your payment of ${amount} has been processed successfully. Thank you for your continued subscription.',
  '💳 Payment Successful: ${amount} processed successfully. Thank you!',
  '💳 Payment Success: ${amount} payment processed for {user_email}.',
  false, 0, 0,
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

('00000000-0000-0000-0000-000000000001', 'billing.payment.failed', true, '["email", "telegram"]',
  'Your payment could not be processed. Please update your payment method to continue service.',
  '❌ Payment Failed: Please update your payment method to continue service.',
  '❌ Payment Failed: {user_email} payment declined. Amount: ${amount}.',
  true, 2, 1440,
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),

('00000000-0000-0000-0000-000000000001', 'billing.usage.limit', true, '["email", "inapp", "telegram"]',
  'You are approaching your usage limit for the current billing period. Consider upgrading your plan.',
  '⚠️ Usage Alert: Approaching your plan limit. Consider upgrading for continued service.',
  '⚠️ Usage Alert: {user_email} at {usage_percent}% of plan limit.',
  false, 0, 0,
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')

ON CONFLICT (customer_id, event_key) DO UPDATE SET
  email_message = EXCLUDED.email_message,
  telegram_message = EXCLUDED.telegram_message,
  slack_message = EXCLUDED.slack_message,
  escalation_enabled = EXCLUDED.escalation_enabled,
  escalation_threshold = EXCLUDED.escalation_threshold,
  escalation_window_minutes = EXCLUDED.escalation_window_minutes,
  updated_at = now(),
  updated_by = EXCLUDED.updated_by;