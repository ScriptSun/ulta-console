import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  type: 'password_reset' | 'welcome' | 'security_alert' | 'notification' | 'system_update';
  to: string;
  subject?: string;
  data?: any;
  user_id?: string;
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
    const { type, to, subject, data, user_id }: EmailRequest = await req.json();

    if (!type || !to) {
      return new Response(
        JSON.stringify({ 
          error: 'Email type and recipient are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
    if (!sendgridApiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'SendGrid API key not configured' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client for user preferences check
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Check user email preferences if user_id is provided
    if (user_id) {
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('email_alerts, security_alerts, system_updates')
        .eq('user_id', user_id)
        .single();

      // Check if user has opted out of this type of email
      if (preferences) {
        if (type === 'security_alert' && !preferences.security_alerts) {
          return new Response(
            JSON.stringify({ 
              message: 'User has opted out of security alerts' 
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        if (type === 'system_update' && !preferences.system_updates) {
          return new Response(
            JSON.stringify({ 
              message: 'User has opted out of system updates' 
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        if (['notification', 'welcome'].includes(type) && !preferences.email_alerts) {
          return new Response(
            JSON.stringify({ 
              message: 'User has opted out of email notifications' 
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }
    }

    // Get email templates and content
    const emailContent = getEmailContent(type, data);
    const emailSubject = subject || emailContent.subject;

    const sendgridData = {
      personalizations: [
        {
          to: [{ email: to }],
          subject: emailSubject,
        },
      ],
      from: {
        email: "noreply@yourdomain.com",
        name: "UltaAI System"
      },
      content: [
        {
          type: "text/html",
          value: emailContent.html,
        },
      ],
    };

    // Send email via SendGrid API
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sendgridData),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('SendGrid API Error:', errorData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email via SendGrid',
          details: errorData
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Log email send event
    await supabase
      .from('email_logs')
      .insert({
        user_id,
        email: to,
        type,
        subject: emailSubject,
        status: 'sent',
        sent_at: new Date().toISOString()
      });

    console.log('Email sent successfully via SendGrid');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        type,
        recipient: to
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in sendgrid-email function:', error);
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

function getEmailContent(type: string, data: any) {
  switch (type) {
    case 'password_reset':
      return {
        subject: 'Reset Your Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #7c3aed; margin: 0;">UltaAI</h1>
            </div>
            
            <h2 style="color: #333; margin-bottom: 20px;">Reset Your Password</h2>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              We received a request to reset your password. Click the button below to reset it:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data?.resetLink}" 
                 style="background-color: #7c3aed; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block; 
                        font-weight: bold;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              If you didn't request this password reset, you can safely ignore this email.
            </p>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              This link will expire in 24 hours for security reasons.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #888; font-size: 12px; text-align: center;">
              This email was sent by UltaAI. If you have any questions, please contact our support team.
            </p>
          </div>
        `
      };
      
    case 'welcome':
      return {
        subject: 'Welcome to UltaAI!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #7c3aed; margin: 0;">Welcome to UltaAI!</h1>
            </div>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              Hi ${data?.name || 'there'},
            </p>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              Welcome to UltaAI! We're excited to have you on board. Your account has been successfully created.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data?.dashboardLink}" 
                 style="background-color: #7c3aed; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block; 
                        font-weight: bold;">
                Access Dashboard
              </a>
            </div>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              If you have any questions, don't hesitate to reach out to our support team.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #888; font-size: 12px; text-align: center;">
              This email was sent by UltaAI. If you have any questions, please contact our support team.
            </p>
          </div>
        `
      };
      
    case 'security_alert':
      return {
        subject: '🔒 Security Alert - UltaAI',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 20px;">
              <h2 style="color: #dc2626; margin: 0 0 10px 0;">🔒 Security Alert</h2>
            </div>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              We detected ${data?.eventType || 'suspicious activity'} on your account.
            </p>
            
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; color: #374151;">
                <strong>Details:</strong><br>
                ${data?.details || 'Security event detected'}
              </p>
              <p style="margin: 10px 0 0 0; color: #374151;">
                <strong>Time:</strong> ${data?.timestamp || new Date().toISOString()}
              </p>
            </div>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              If this was you, you can safely ignore this email. If not, please secure your account immediately.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data?.securityLink || '#'}" 
                 style="background-color: #dc2626; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block; 
                        font-weight: bold;">
                Review Security
              </a>
            </div>
          </div>
        `
      };
      
    case 'system_update':
      return {
        subject: 'System Update - UltaAI',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #7c3aed; margin: 0;">System Update</h1>
            </div>
            
            <h2 style="color: #333; margin-bottom: 20px;">${data?.title || 'System Update Available'}</h2>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              ${data?.message || 'A new system update is available with improved features and bug fixes.'}
            </p>
            
            ${data?.features ? `
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h3 style="color: #374151; margin: 0 0 10px 0;">What's New:</h3>
                <ul style="color: #374151; padding-left: 20px;">
                  ${data.features.map((feature: string) => `<li style="margin-bottom: 5px;">${feature}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            
            <p style="color: #888; font-size: 12px; text-align: center; margin-top: 30px;">
              This email was sent by UltaAI. You can update your notification preferences in your account settings.
            </p>
          </div>
        `
      };
      
    default:
      return {
        subject: 'Notification from UltaAI',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #7c3aed; margin: 0;">UltaAI</h1>
            </div>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              ${data?.message || 'You have a new notification from UltaAI.'}
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #888; font-size: 12px; text-align: center;">
              This email was sent by UltaAI. You can update your notification preferences in your account settings.
            </p>
          </div>
        `
      };
  }
}