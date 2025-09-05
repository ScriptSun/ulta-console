import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramNotificationRequest {
  notification_type: 'agent_error' | 'system_alert' | 'security_event' | 'batch_completion';
  message: string;
  details?: any;
  tenant_id?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { notification_type, message, details, tenant_id }: TelegramNotificationRequest = await req.json();

    if (!notification_type || !message) {
      return new Response(
        JSON.stringify({ 
          error: 'Notification type and message are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get Telegram configuration from channel_providers table
    const { data: telegramProvider, error: providerError } = await supabase
      .from('channel_providers')
      .select('config, enabled')
      .eq('type', 'telegram')
      .eq('enabled', true)
      .single();

    if (providerError || !telegramProvider) {
      console.error('Failed to get Telegram provider config:', providerError);
      return new Response(
        JSON.stringify({ 
          error: 'Telegram provider not configured or not enabled' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { botToken: telegram_bot_token, chatId: telegram_chat_id } = telegramProvider.config;

    if (!telegram_bot_token || !telegram_chat_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Telegram bot token or chat ID not configured' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Format message based on type
    const getNotificationIcon = (type: string) => {
      switch (type) {
        case 'agent_error': return '🚨';
        case 'system_alert': return '⚠️';
        case 'security_event': return '🔒';
        case 'batch_completion': return '✅';
        default: return '📢';
      }
    };

    const formattedMessage = `${getNotificationIcon(notification_type)} *UltaAI ${notification_type.replace('_', ' ').toUpperCase()}*\n\n${message}\n\n${details ? `Details: \`${JSON.stringify(details, null, 2)}\`` : ''}\n\nTimestamp: ${new Date().toISOString()}`;

    // Send message to Telegram
    const telegramUrl = `https://api.telegram.org/bot${telegram_bot_token}/sendMessage`;

    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegram_chat_id,
        text: formattedMessage,
        parse_mode: 'Markdown',
      }),
    });

    const telegramData = await telegramResponse.json();

    if (!telegramResponse.ok) {
      console.error('Telegram API Error:', telegramData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send notification to Telegram',
          details: telegramData.description || 'Unknown error'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Notification sent successfully:', telegramData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent successfully',
        telegram_message_id: telegramData.result?.message_id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-telegram-notification function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});