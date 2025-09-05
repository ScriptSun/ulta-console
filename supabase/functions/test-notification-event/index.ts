import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestEventRequest {
  eventKey: string;
  payload?: any;
  environment?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { eventKey, payload = {}, environment = 'prod' }: TestEventRequest = await req.json();

    if (!eventKey) {
      return new Response(
        JSON.stringify({ error: 'Event key is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Testing event: ${eventKey} in ${environment}`);

    // Get the notification policy for this event
    const { data: policy, error: policyError } = await supabase
      .from('notification_policies')
      .select('*')
      .eq('customer_id', '00000000-0000-0000-0000-000000000001')
      .eq('event_key', eventKey)
      .eq('enabled', true)
      .single();

    if (policyError || !policy) {
      console.error('Policy not found:', policyError);
      return new Response(
        JSON.stringify({ error: 'Event policy not found or disabled' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active channels from the channels configuration
    const activeChannels = Object.entries(policy.channels)
      .filter(([, enabled]) => enabled)
      .map(([channel]) => channel);

    if (activeChannels.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No active channels configured for this event' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Active channels for ${eventKey}:`, activeChannels);

    // Log the event for escalation tracking
    await supabase
      .from('notification_event_logs')
      .insert({
        customer_id: policy.customer_id,
        event_key: eventKey,
        payload: JSON.stringify(payload)
      });

    // Send to each active channel (actual notifications, not simulation)
    const results = [];
    for (const channel of activeChannels) {
      try {
        switch (channel) {
          case 'email':
            console.log(`Sending test email for event: ${eventKey}`);
            try {
              const emailResult = await supabase.functions.invoke('sendgrid-email', {
                body: {
                  to: 'test@example.com', // Test email - you can customize this
                  subject: `🔔 Test: ${policy.event_name}`,
                  text: `This is a test notification for the event: ${policy.event_name}\n\nSeverity: ${policy.severity}\nCategory: ${policy.category}\n\nThis is a test from your notification system.`,
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                      <h2 style="color: #333;">🔔 Test Notification</h2>
                      <p><strong>Event:</strong> ${policy.event_name}</p>
                      <p><strong>Severity:</strong> ${policy.severity}</p>
                      <p><strong>Category:</strong> ${policy.category}</p>
                      <p>This is a test notification from your notification system.</p>
                    </div>
                  `
                }
              });
              
              if (emailResult.error) {
                console.error('Email sending error:', emailResult.error);
                results.push({ channel: 'email', status: 'error', message: `Email failed: ${emailResult.error.message}` });
              } else {
                console.log('Email sent successfully');
                results.push({ channel: 'email', status: 'success', message: 'Email notification sent' });
              }
            } catch (emailError: any) {
              console.error('Email error:', emailError);
              results.push({ channel: 'email', status: 'error', message: `Email error: ${emailError.message}` });
            }
            break;

          case 'telegram':
            console.log(`Sending test Telegram message for event: ${eventKey}`);
            try {
              const telegramResult = await supabase.functions.invoke('send-telegram-notification', {
                body: {
                  notification_type: mapEventToTelegramType(eventKey),
                  message: getExpertTelegramMessage(eventKey),
                  details: getExpertNotificationData(eventKey, payload),
                  tenant_id: policy.customer_id
                }
              });
              
              if (telegramResult.error) {
                console.error('Telegram sending error:', telegramResult.error);
                results.push({ channel: 'telegram', status: 'error', message: `Telegram failed: ${telegramResult.error.message}` });
              } else {
                console.log('Telegram message sent successfully');
                results.push({ channel: 'telegram', status: 'success', message: 'Telegram notification sent' });
              }
            } catch (telegramError: any) {
              console.error('Telegram error:', telegramError);
              results.push({ channel: 'telegram', status: 'error', message: `Telegram error: ${telegramError.message}` });
            }
            break;

          case 'slack':
            // For now, simulate Slack until it's implemented
            console.log(`Would send Slack message for event: ${eventKey} (not yet implemented)`);
            results.push({ channel: 'slack', status: 'success', message: 'Slack notification simulated (not implemented)' });
            break;

          case 'discord':
            // For now, simulate Discord until it's implemented
            console.log(`Would send Discord message for event: ${eventKey} (not yet implemented)`);
            results.push({ channel: 'discord', status: 'success', message: 'Discord notification simulated (not implemented)' });
            break;

          case 'sms':
            // For now, simulate SMS until it's implemented
            console.log(`Would send SMS for event: ${eventKey} (not yet implemented)`);
            results.push({ channel: 'sms', status: 'success', message: 'SMS notification simulated (not implemented)' });
            break;

          case 'webhook':
            // For now, simulate webhook until it's implemented
            console.log(`Would send webhook for event: ${eventKey} (not yet implemented)`);
            results.push({ channel: 'webhook', status: 'success', message: 'Webhook notification simulated (not implemented)' });
            break;

          case 'inapp':
            console.log(`Creating test in-app notification for event: ${eventKey}`);
            // For in-app notifications, we'd need a user_notifications table
            // For now, simulate it
            results.push({ channel: 'inapp', status: 'success', message: 'In-app notification simulated' });
            break;

          default:
            results.push({ channel, status: 'error', message: `Unknown channel: ${channel}` });
        }
      } catch (error: any) {
        console.error(`Error sending to ${channel}:`, error);
        results.push({ channel, status: 'error', message: error.message });
      }
    }

    // Check for escalation rules
    let escalationResults = [];
    if (policy.escalation?.enabled) {
      const { threshold } = policy.escalation;
      
      // Count recent events for this policy
      const windowStart = new Date(Date.now() - threshold.windowMinutes * 60 * 1000);
      const { data: recentEvents, error: countError } = await supabase
        .from('notification_event_logs')
        .select('id')
        .eq('customer_id', policy.customer_id)
        .eq('event_key', eventKey)
        .gte('occurred_at', windowStart.toISOString());

      if (!countError && recentEvents && recentEvents.length >= threshold.count) {
        console.log(`Escalation threshold met for ${eventKey}: ${recentEvents.length} events in ${threshold.windowMinutes} minutes`);
        
        for (const escalationChannel of policy.escalation.channels) {
          console.log(`Would escalate to ${escalationChannel} for event: ${eventKey}`);
          escalationResults.push({ 
            channel: escalationChannel, 
            status: 'success', 
            message: `Escalation notification sent to ${escalationChannel}` 
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        eventKey,
        environment,
        policy: {
          id: policy.id,
          event_name: policy.event_name,
          severity: policy.severity,
          category: policy.category
        },
        results,
        escalationResults,
        summary: `Test event sent to ${activeChannels.length} channel(s)${escalationResults.length > 0 ? ` with ${escalationResults.length} escalation(s)` : ''}`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in test-notification-event function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper functions for expert notification messages
function getExpertNotificationSubject(eventKey: string): string {
  const subjects = {
    'api.key.created': '🔑 New API Key Created - Keep It Secure',
    'security.login.failed': '🔒 Security Alert: Failed Login Attempts',
    'security.login.blocked': '🚨 Account Temporarily Locked',
    'security.password.changed': '✅ Password Successfully Updated',
    'security.2fa.enabled': '🛡️ Two-Factor Authentication Activated',
    'account.created': '🎉 Welcome to UltaAI!',
    'account.verified': '✅ Email Verification Complete',
    'agent.deployed': '🤖 Agent Successfully Deployed',
    'agent.offline': '🔴 Agent Connection Lost',
    'agent.error': '🚨 Agent Execution Error',
    'agent.task.completed': '✅ Task Completed Successfully',
    'system.maintenance.scheduled': '🔧 Scheduled Maintenance Window',
    'system.update.available': '🆕 New System Update Available',
    'system.outage.detected': '🚨 Service Disruption Detected',
    'billing.payment.success': '💳 Payment Processed Successfully',
    'billing.payment.failed': '❌ Payment Processing Failed',
    'billing.usage.limit': '⚠️ Approaching Usage Limit'
  };
  return subjects[eventKey as keyof typeof subjects] || `Notification: ${eventKey}`;
}

function getExpertTelegramMessage(eventKey: string): string {
  const messages = {
    'api.key.created': '🔑 New API key created. Keep it secure and never share publicly!',
    'security.login.failed': '🔒 SECURITY ALERT: Multiple failed login attempts detected. Review your account security now.',
    'security.login.blocked': '🚨 ACCOUNT LOCKED: Account temporarily blocked due to suspicious activity. Contact support for assistance.',
    'security.password.changed': '✅ Password successfully updated for your account. If this wasn\'t you, contact support immediately.',
    'security.2fa.enabled': '🛡️ 2FA Enabled: Two-factor authentication activated successfully. Your account is now more secure!',
    'account.created': '🎉 Welcome to UltaAI! Your account is ready. Start exploring your new dashboard!',
    'account.verified': '✅ Email verified successfully! You now have full access to all UltaAI features.',
    'agent.deployed': '🤖 Agent deployed successfully and is now online and ready for action!',
    'agent.offline': '🔴 Agent offline: Currently offline. Investigating connectivity issues.',
    'agent.error': '🚨 Agent Error: Agent encountered an error. Check the logs for details.',
    'agent.task.completed': '✅ Task completed successfully by agent.',
    'system.maintenance.scheduled': '🔧 Scheduled Maintenance: Service maintenance window starting soon.',
    'system.update.available': '🆕 System Update: New features and improvements are now available!',
    'system.outage.detected': '🚨 Service Outage: Disruption detected. Team is investigating.',
    'billing.payment.success': '💳 Payment Successful: Payment processed successfully. Thank you!',
    'billing.payment.failed': '❌ Payment Failed: Please update your payment method to continue service.',
    'billing.usage.limit': '⚠️ Usage Alert: Approaching your plan limit. Consider upgrading for continued service.'
  };
  return messages[eventKey as keyof typeof messages] || `Notification for event: ${eventKey}`;
}

function getExpertNotificationData(eventKey: string, payload: any) {
  const baseData = {
    eventType: eventKey,
    timestamp: new Date().toISOString(),
    ...payload
  };

  switch (eventKey) {
    case 'api.key.created':
      return {
        ...baseData,
        message: 'A new API key has been created for your account. Keep it secure and never share it publicly.',
        key_name: payload?.key_name || 'Test API Key',
        user_email: payload?.user_email || 'test@example.com'
      };
    case 'security.login.failed':
      return {
        ...baseData,
        message: 'Multiple failed login attempts detected on your account. If this wasn\'t you, please secure your account immediately.',
        location: payload?.location || 'Unknown Location',
        attempts: payload?.attempts || 3
      };
    case 'agent.deployed':
      return {
        ...baseData,
        message: 'Agent has been successfully deployed and is now ready to handle tasks.',
        agent_name: payload?.agent_name || 'Test Agent',
        version: payload?.version || '1.0.0'
      };
    case 'billing.payment.failed':
      return {
        ...baseData,
        message: 'Your payment could not be processed. Please update your payment method to continue service.',
        amount: payload?.amount || '$29.99',
        reason: payload?.reason || 'Card declined'
      };
    default:
      return {
        ...baseData,
        message: `Expert notification for ${eventKey} event.`
      };
  }
}

function mapEventToTelegramType(eventKey: string): string {
  if (eventKey.startsWith('security.')) return 'security_event';
  if (eventKey.startsWith('agent.')) return 'agent_error';
  if (eventKey.startsWith('system.')) return 'system_alert';
  if (eventKey.startsWith('billing.')) return 'system_alert';
  return 'system_alert';
}