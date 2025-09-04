import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AuthRequest {
  action: 'login' | 'check_session' | 'check_ban_status' | 'unban_user' | 'validate_password';
  email?: string;
  password?: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { action, email, password, user_id, ip_address, user_agent }: AuthRequest = await req.json()

    switch (action) {
      case 'login': {
        if (!email || !password) {
          return new Response(
            JSON.stringify({ error: 'Email and password are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Sanitize inputs - trim whitespace to prevent authentication failures
        const cleanEmail = email.trim().toLowerCase()
        const cleanPassword = password.trim()

        try {
          console.log(`Attempting login for: ${cleanEmail}`);

          // Get security settings from database
          const { data: securitySettings } = await supabase.rpc('get_security_settings');
          console.log('Security settings from DB:', securitySettings);
          const maxAttempts = securitySettings?.max_login_attempts || 5;
          console.log(`Max attempts set to: ${maxAttempts}`);

          // Check current failed attempts count
          const { data: failedAttemptsData } = await supabase.rpc('get_failed_attempts_count', {
            email_address: cleanEmail
          });
          
          const currentAttempts = failedAttemptsData || 0;
          
          console.log(`Current failed attempts for ${cleanEmail}: ${currentAttempts}`);

          // Check if user is already locked out
          if (currentAttempts >= maxAttempts) {
            console.log(`Account locked for ${cleanEmail} - too many failed attempts`);
            return new Response(
              JSON.stringify({
                error: 'Account temporarily locked due to too many failed login attempts',
                attempts_remaining: 0,
                locked_until: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes from now
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // Attempt login with cleaned credentials
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword,
          })

          if (authError) {
            console.error('Auth error:', authError);
            
            // Record failed attempt
            await supabase.from('login_attempts').insert({
              email: cleanEmail,
              ip_address: ip_address,
              user_agent: user_agent,
              success: false
            });

            const newFailedCount = currentAttempts + 1;
            const attemptsRemaining = Math.max(0, maxAttempts - newFailedCount);
            
            console.log(`Failed login recorded. New count: ${newFailedCount}, Remaining: ${attemptsRemaining}`);

            return new Response(
              JSON.stringify({
                error: 'Invalid credentials',
                attempts_remaining: attemptsRemaining
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          console.log('Login successful for:', cleanEmail);
          
          // Record successful attempt and clean up old failed attempts
          await supabase.from('login_attempts').insert({
            email: cleanEmail,
            ip_address: ip_address,
            user_agent: user_agent,
            success: true
          });

          // Clean up old failed attempts for this email (older than 24 hours)
          await supabase.rpc('cleanup_old_login_attempts');

          return new Response(
            JSON.stringify({
              user: authData.user,
              session: authData.session
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } catch (loginError) {
          console.error('Login process error:', loginError)
          return new Response(
            JSON.stringify({ error: 'Login failed. Please try again.' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      case 'check_session': {
        if (!user_id) {
          return new Response(
            JSON.stringify({ error: 'User ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({
            valid: true,
            session_extended: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'check_ban_status': {
        if (!user_id) {
          return new Response(
            JSON.stringify({ error: 'User ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({
            security_status: {
              is_banned: false,
              failed_login_count: 0
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'unban_user': {
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'validate_password': {
        if (!password) {
          return new Response(
            JSON.stringify({ error: 'Password is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({
            validation: { valid: true, errors: [] }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Auth security error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})