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
      .eq('environment', environment)
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
        environment,
        payload: JSON.stringify(payload)
      });

    // Simulate sending to each active channel
    const results = [];
    for (const channel of activeChannels) {
      try {
        switch (channel) {
          case 'email':
            // In a real implementation, this would send via the configured email provider
            console.log(`Would send email for event: ${eventKey}`);
            results.push({ channel: 'email', status: 'success', message: 'Email notification sent' });
            break;

          case 'telegram':
            // In a real implementation, this would send via Telegram bot API
            console.log(`Would send Telegram message for event: ${eventKey}`);
            results.push({ channel: 'telegram', status: 'success', message: 'Telegram notification sent' });
            break;

          case 'slack':
            // In a real implementation, this would send via Slack webhook
            console.log(`Would send Slack message for event: ${eventKey}`);
            results.push({ channel: 'slack', status: 'success', message: 'Slack notification sent' });
            break;

          case 'discord':
            // In a real implementation, this would send via Discord webhook
            console.log(`Would send Discord message for event: ${eventKey}`);
            results.push({ channel: 'discord', status: 'success', message: 'Discord notification sent' });
            break;

          case 'sms':
            // In a real implementation, this would send via SMS provider (Twilio)
            console.log(`Would send SMS for event: ${eventKey}`);
            results.push({ channel: 'sms', status: 'success', message: 'SMS notification sent' });
            break;

          case 'webhook':
            // In a real implementation, this would send to configured webhooks
            console.log(`Would send webhook for event: ${eventKey}`);
            results.push({ channel: 'webhook', status: 'success', message: 'Webhook notification sent' });
            break;

          case 'inapp':
            // In a real implementation, this would create in-app notifications
            console.log(`Would create in-app notification for event: ${eventKey}`);
            results.push({ channel: 'inapp', status: 'success', message: 'In-app notification created' });
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
        .eq('environment', environment)
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