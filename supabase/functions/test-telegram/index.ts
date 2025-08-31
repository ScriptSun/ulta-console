import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestTelegramRequest {
  bot_token: string;
  chat_id: string;
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
    const { bot_token, chat_id }: TestTelegramRequest = await req.json();

    if (!bot_token || !chat_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Bot token and chat ID are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Send test message to Telegram
    const telegramUrl = `https://api.telegram.org/bot${bot_token}/sendMessage`;
    const message = `🤖 *UltaAI Test Message*\n\nYour Telegram integration is working correctly!\n\nTimestamp: ${new Date().toISOString()}`;

    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chat_id,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const telegramData = await telegramResponse.json();

    if (!telegramResponse.ok) {
      console.error('Telegram API Error:', telegramData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send message to Telegram',
          details: telegramData.description || 'Unknown error'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Test message sent successfully:', telegramData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test message sent successfully',
        telegram_message_id: telegramData.result?.message_id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in test-telegram function:', error);
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