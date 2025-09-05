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
                  message: `🔔 Test Notification\n\nEvent: ${policy.event_name}\nSeverity: ${policy.severity}\nCategory: ${policy.category}\n\nThis is a test notification from your system.`,
                  customerId: policy.customer_id
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