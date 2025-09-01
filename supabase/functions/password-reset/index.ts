import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PasswordResetRequest {
  email: string;
  action: 'request' | 'confirm';
  token?: string;
  password?: string;
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
    const { email, action, token, password }: PasswordResetRequest = await req.json();

    if (!email || !action) {
      return new Response(
        JSON.stringify({ 
          error: 'Email and action are required' 
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

    if (action === 'request') {
      console.log(`Password reset requested for: ${email}`);

      // Generate password reset using Supabase Auth
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${Deno.env.get('SUPABASE_URL')?.replace('https://', 'https://').replace('.supabase.co', '')}auth/reset-password`
      });

      if (error) {
        console.error('Supabase password reset error:', error);
        // Don't reveal if the email exists or not for security
      }

      // Send custom email via SendGrid
      const sendGridResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/sendgrid-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          type: 'password_reset',
          to: email,
          data: {
            resetLink: `${req.headers.get('origin') || 'https://your-app.com'}/reset-password?token=${token || 'placeholder'}`
          }
        })
      });

      if (!sendGridResponse.ok) {
        console.error('SendGrid email failed:', await sendGridResponse.text());
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'If this email exists, a password reset link has been sent.' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (action === 'confirm') {
      if (!token || !password) {
        return new Response(
          JSON.stringify({ 
            error: 'Token and new password are required for confirmation' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Update password using Supabase Auth
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('Password update error:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to update password. The reset link may have expired.' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Password updated successfully.' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: 'Invalid action. Use "request" or "confirm".' 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in password-reset function:', error);
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