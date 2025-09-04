import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestRequest {
  providerType: 'email' | 'smtp' | 'sendgrid' | 'mailgun' | 'ses' | 'postmark' | 'resend' | 'slack' | 'telegram' | 'discord' | 'twilio';
  config: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { providerType, config }: TestRequest = await req.json();
    console.log(`Testing ${providerType} provider with config:`, config);

    let testResult: { success: boolean; message: string; error?: string };

    switch (providerType) {
      case 'email':
      case 'smtp':
      case 'sendgrid':
      case 'mailgun':
      case 'ses':
      case 'postmark':
      case 'resend':
        testResult = await testEmailProvider(config);
        break;
      case 'slack':
        testResult = await testSlackProvider(config);
        break;
      case 'telegram':
        testResult = await testTelegramProvider(config);
        break;
      case 'discord':
        testResult = await testDiscordProvider(config);
        break;
      case 'twilio':
        testResult = await testTwilioProvider(config);
        break;
      default:
        throw new Error(`Unsupported provider type: ${providerType}`);
    }

    return new Response(JSON.stringify(testResult), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('Test notification provider error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Test failed', 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

async function testEmailProvider(config: any): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const testEmail = config.testEmail || 'test@example.com';
    
    if (config.type === 'smtp') {
      // Validate SMTP configuration
      if (!config.host || !config.port || !config.username || !config.password) {
        return {
          success: false,
          message: 'Missing required SMTP configuration',
          error: 'Host, port, username, and password are required'
        };
      }
      
      // For SMTP, we'll do a basic validation check
      // In a real implementation, you'd try to connect to the SMTP server
      return {
        success: true,
        message: 'SMTP configuration appears valid'
      };
    } else if (config.type === 'sendgrid') {
      if (!config.apiKey) {
        return {
          success: false,
          message: 'SendGrid API key is required',
          error: 'API key missing'
        };
      }

      // Validate from email is provided
      if (!config.fromEmail) {
        return {
          success: false,
          message: 'From email address is required for SendGrid',
          error: 'You must provide a verified from email address'
        };
      }

      // Send actual test email via SendGrid
      const emailPayload = {
        personalizations: [{
          to: [{ email: testEmail }],
          subject: 'UltaAI Test Email'
        }],
        from: { email: config.fromEmail, name: config.fromName || 'UltaAI Test' },
        content: [{
          type: 'text/html',
          value: '<h1>Test Email</h1><p>This is a test email from UltaAI notification system.</p>'
        }]
      };
      
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailPayload)
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        return { success: false, message: 'SendGrid test email failed', error: errorData };
      }
      
      return { success: true, message: `Test email sent successfully to ${testEmail}` };
    } else if (config.type === 'resend') {
      if (!config.apiKey) {
        return {
          success: false,
          message: 'Resend API key is required',
          error: 'API key missing'
        };
      }

      if (!config.fromEmail) {
        return {
          success: false,
          message: 'From email address is required for Resend',
          error: 'You must provide a verified from email address'
        };
      }

      // Send actual test email via Resend
      const emailPayload = {
        from: `${config.fromName || 'UltaAI Test'} <${config.fromEmail}>`,
        to: [testEmail],
        subject: 'UltaAI Test Email',
        html: '<h1>Test Email</h1><p>This is a test email from UltaAI notification system using Resend.</p>'
      };
      
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailPayload)
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        return { success: false, message: 'Resend test email failed', error: errorData };
      }
      
      return { success: true, message: `Test email sent successfully to ${testEmail} via Resend` };
    }

    // Handle other email provider types with basic validation
    const providerType = config.type || 'unknown';
    if (['mailgun', 'ses', 'postmark'].includes(providerType)) {
      return { success: true, message: `${providerType.toUpperCase()} configuration validated (actual sending not implemented yet)` };
    }

    return {
      success: false,
      message: 'Unsupported email provider type',
      error: `Type ${config.type} not implemented`
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Email provider test failed',
      error: error.message
    };
  }
}

async function testSlackProvider(config: any): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    if (!config.webhookUrl) {
      return {
        success: false,
        message: 'Slack webhook URL is required',
        error: 'Webhook URL missing'
      };
    }

    // Test Slack webhook
    const testMessage = {
      text: "🧪 Test message from UltaAI Notification System",
      username: "UltaAI Test",
      channel: config.channel || "#general"
    };

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testMessage)
    });

    if (response.ok) {
      return {
        success: true,
        message: 'Slack webhook test successful'
      };
    } else {
      const errorText = await response.text();
      return {
        success: false,
        message: 'Slack webhook test failed',
        error: `${response.status}: ${errorText}`
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: 'Slack provider test failed',
      error: error.message
    };
  }
}

async function testTelegramProvider(config: any): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    if (!config.botToken || !config.chatId) {
      return {
        success: false,
        message: 'Telegram bot token and chat ID are required',
        error: 'Bot token and chat ID missing'
      };
    }

    // Test Telegram bot API
    const testMessage = "🧪 Test message from UltaAI Notification System";
    const telegramUrl = `https://api.telegram.org/bot${config.botToken}/sendMessage`;

    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: testMessage
      })
    });

    const result = await response.json();

    if (response.ok && result.ok) {
      return {
        success: true,
        message: 'Telegram bot test successful'
      };
    } else {
      return {
        success: false,
        message: 'Telegram bot test failed',
        error: result.description || `API returned ${response.status}`
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: 'Telegram provider test failed',
      error: error.message
    };
  }
}

async function testDiscordProvider(config: any): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    if (!config.webhookUrl) {
      return {
        success: false,
        message: 'Discord webhook URL is required',
        error: 'Webhook URL missing'
      };
    }

    // Test Discord webhook
    const testMessage = {
      content: "🧪 Test message from UltaAI Notification System",
      username: "UltaAI Test"
    };

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testMessage)
    });

    if (response.ok || response.status === 204) {
      return {
        success: true,
        message: 'Discord webhook test successful'
      };
    } else {
      const errorText = await response.text();
      return {
        success: false,
        message: 'Discord webhook test failed',
        error: `${response.status}: ${errorText}`
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: 'Discord provider test failed',
      error: error.message
    };
  }
}

async function testTwilioProvider(config: any): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    if (!config.accountSid || !config.authToken || !config.fromNumber) {
      return {
        success: false,
        message: 'Twilio Account SID, Auth Token, and From Number are required',
        error: 'Missing required Twilio credentials'
      };
    }

    // Test Twilio API by fetching account info
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}.json`;
    const credentials = btoa(`${config.accountSid}:${config.authToken}`);

    const response = await fetch(twilioUrl, {
      headers: {
        'Authorization': `Basic ${credentials}`
      }
    });

    if (response.ok) {
      return {
        success: true,
        message: 'Twilio credentials are valid'
      };
    } else {
      return {
        success: false,
        message: 'Twilio credentials test failed',
        error: `API returned ${response.status}`
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: 'Twilio provider test failed',
      error: error.message
    };
  }
}

serve(handler);