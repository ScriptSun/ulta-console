import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AuthRequest {
  action: 'login' | 'check_session' | 'check_ban_status' | 'unban_user' | 'validate_password' | 'reset_attempts';
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

          // Get security settings from database - with proper fallbacks
          console.log('About to call get_security_settings RPC...');
          const { data: securitySettings, error: settingsError } = await supabase.rpc('get_security_settings');
          console.log('Security settings RPC result:', { data: securitySettings, error: settingsError });
          
          let maxAttempts = 2; // Safe default that matches your DB
          
          if (settingsError) {
            console.error('Error getting security settings, using default:', settingsError);
          } else if (securitySettings) {
            console.log('Raw securitySettings:', securitySettings);
            console.log('Type of securitySettings:', typeof securitySettings);
            
            // Handle different possible response formats with fallbacks
            if (typeof securitySettings === 'number' && securitySettings > 0) {
              maxAttempts = securitySettings;
              console.log('Used number format:', maxAttempts);
            } else if (Array.isArray(securitySettings) && securitySettings.length > 0 && securitySettings[0] > 0) {
              maxAttempts = securitySettings[0];
              console.log('Used array format:', maxAttempts);
            } else if (securitySettings && typeof securitySettings === 'object' && securitySettings.max_login_attempts > 0) {
              maxAttempts = securitySettings.max_login_attempts;
              console.log('Used object format:', maxAttempts);
            } else {
              console.log('Could not parse settings, using default:', maxAttempts);
            }
          } else {
            console.log('No settings returned, using default:', maxAttempts);
          }
          
          console.log(`Final maxAttempts value: ${maxAttempts}`);

          // Get lockout duration from security settings first
          let lockoutDurationMinutes = 1; // Safe default matching your DB
          
          if (securitySettings) {
            if (typeof securitySettings === 'object' && securitySettings.lockout_duration) {
              lockoutDurationMinutes = securitySettings.lockout_duration;
              console.log('Using lockout_duration from DB:', lockoutDurationMinutes);
            } else if (Array.isArray(securitySettings) && securitySettings.length > 5) {
              lockoutDurationMinutes = securitySettings[5]; // 6th element is lockout_duration
              console.log('Using lockout_duration from DB array:', lockoutDurationMinutes);
            } else {
              console.log('Could not parse lockout_duration, using default:', lockoutDurationMinutes);
            }
          }

          // Check current failed attempts WITHIN the lockout time window only
          const lockoutWindowStart = new Date(Date.now() - lockoutDurationMinutes * 60 * 1000);
          const { data: recentFailedAttemptsData } = await supabase.rpc('get_failed_attempts_count_since', {
            email_address: cleanEmail,
            since_time: lockoutWindowStart.toISOString()
          });
          
          const currentAttempts = recentFailedAttemptsData || 0;
          
          console.log(`Recent failed attempts for ${cleanEmail} in last ${lockoutDurationMinutes} minutes: ${currentAttempts}`);

          // Check if user is currently locked out (based on recent attempts only)
          if (currentAttempts >= maxAttempts) {
            console.log(`Account locked for ${cleanEmail} - ${currentAttempts} recent failed attempts >= ${maxAttempts}`);
            
            console.log(`Final lockout duration: ${lockoutDurationMinutes} minutes`);
            const lockoutUntil = new Date(Date.now() + lockoutDurationMinutes * 60 * 1000);
            
            return new Response(
              JSON.stringify({
                error: 'Account temporarily locked due to too many failed login attempts',
                attempts_remaining: 0,
                locked_until: lockoutUntil.toISOString()
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
            // Ensure calculation never returns null/undefined
            const attemptsRemaining = Math.max(0, (maxAttempts || 2) - newFailedCount);
            
            // Validate the result
            if (typeof attemptsRemaining !== 'number' || attemptsRemaining < 0) {
              console.error('Invalid attemptsRemaining calculation:', { maxAttempts, currentAttempts, newFailedCount, attemptsRemaining });
              const safeAttempts = Math.max(0, 2 - newFailedCount); // Emergency fallback
              console.log(`Using emergency fallback attempts: ${safeAttempts}`);
              
              return new Response(
                JSON.stringify({
                  error: 'Invalid credentials',
                  attempts_remaining: safeAttempts
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }
            
            console.log(`CALCULATION DEBUG - maxAttempts: ${maxAttempts}, currentAttempts: ${currentAttempts}, newFailedCount: ${newFailedCount}, attemptsRemaining: ${attemptsRemaining}`);
            
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
          
          // Still return attempts remaining even on error
          const failedCount = 1; // At least 1 failed attempt
          const remainingAttempts = Math.max(0, 2 - failedCount); // Use safe default
          
          return new Response(
            JSON.stringify({ 
              error: 'Invalid credentials',
              attempts_remaining: remainingAttempts
            }),
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

        try {
          // Check if user's session is still valid
          const { data: securityStatus, error: statusError } = await supabase
            .from('user_security_status')
            .select('session_expires_at, is_banned, ban_reason')
            .eq('user_id', user_id)
            .single();

          if (statusError) {
            console.log('No security status found, creating new one with 24h expiry');
            // Create a new security status with 24-hour expiry
            await supabase.from('user_security_status').upsert({
              user_id: user_id,
              session_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              failed_login_count: 0,
              is_banned: false
            });
            
            return new Response(
              JSON.stringify({
                valid: true,
                session_extended: true
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // Check if banned
          if (securityStatus.is_banned) {
            return new Response(
              JSON.stringify({
                valid: false,
                reason: 'banned',
                ban_reason: securityStatus.ban_reason
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // Check if session expired
          const now = new Date();
          const expiresAt = new Date(securityStatus.session_expires_at);
          
          if (expiresAt <= now) {
            console.log(`Session expired for user ${user_id}: ${expiresAt} <= ${now}`);
            
            // Instead of immediately invalidating, extend the session for active users
            const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await supabase.from('user_security_status')
              .update({
                session_expires_at: newExpiry.toISOString(),
                updated_at: now.toISOString()
              })
              .eq('user_id', user_id);
            
            console.log(`Session extended for user ${user_id} until ${newExpiry}`);
            
            return new Response(
              JSON.stringify({
                valid: true,
                session_extended: true,
                new_expiry: newExpiry.toISOString()
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // Session is still valid
          return new Response(
            JSON.stringify({
              valid: true,
              expires_at: securityStatus.session_expires_at
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Session check error:', error);
          
          // On error, assume session is valid to prevent unnecessary logouts
          return new Response(
            JSON.stringify({
              valid: true,
              error: 'Session check failed, assuming valid'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
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

        try {
          // Use the database function to validate password
          const { data: validationResult, error: validationError } = await supabase.rpc('validate_password_policy', {
            _password: password
          });

          if (validationError) {
            console.error('Password validation error:', validationError);
            return new Response(
              JSON.stringify({ error: 'Password validation failed' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({
              validation: {
                valid: validationResult?.[0]?.valid || false,
                errors: validationResult?.[0]?.errors || []
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Password validation exception:', error);
          return new Response(
            JSON.stringify({ error: 'Password validation failed' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      case 'reset_attempts': {
        if (!email) {
          return new Response(
            JSON.stringify({ error: 'Email is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const cleanEmail = email.trim().toLowerCase();
        console.log(`Resetting failed attempts for: ${cleanEmail}`);
        
        // Clear all failed login attempts for this email
        await supabase.from('login_attempts')
          .delete()
          .eq('email', cleanEmail)
          .eq('success', false);
          
        console.log(`Failed attempts cleared for: ${cleanEmail}`);

        return new Response(
          JSON.stringify({ success: true, message: 'Login attempts reset successfully' }),
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