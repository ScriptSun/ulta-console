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
            { status: 400, headers: corsHeaders }
          )
        }

        // First check if user is already banned
        const { data: banStatus } = await supabase
          .from('user_security_status')
          .select('is_banned, ban_reason, banned_until')
          .eq('email', email)
          .single()

        if (banStatus?.is_banned) {
          const bannedUntil = banStatus.banned_until ? new Date(banStatus.banned_until) : null
          if (bannedUntil && bannedUntil > new Date()) {
            return new Response(
              JSON.stringify({
                error: 'Account is temporarily locked',
                ban_reason: banStatus.ban_reason,
                locked_until: bannedUntil.toISOString()
              }),
              { status: 423, headers: corsHeaders }
            )
          }
        }

        // Validate password against security policies
        const { data: passwordValidation, error: validationError } = await supabase
          .rpc('validate_password_policy', { _password: password })

        if (validationError) {
          console.error('Password validation error:', validationError)
        } else if (passwordValidation && passwordValidation.length > 0) {
          const validation = passwordValidation[0]
          if (!validation.valid) {
            return new Response(
              JSON.stringify({
                error: 'Password does not meet security requirements',
                errors: validation.errors
              }),
              { status: 400, headers: corsHeaders }
            )
          }
        }

        // Attempt login
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        // Track login attempt with enhanced tracking
        const { data: trackingResult } = await supabase
          .rpc('track_login_attempt_enhanced', {
            _email: email,
            _user_id: authData?.user?.id || null,
            _success: !authError,
            _ip_address: ip_address || null,
            _user_agent: user_agent || null
          })

        if (authError) {
          const tracking = trackingResult?.[0]
          if (tracking?.is_banned) {
            return new Response(
              JSON.stringify({
                error: tracking.ban_reason,
                locked_until: tracking.lockout_until,
                attempts_remaining: 0
              }),
              { status: 423, headers: corsHeaders }
            )
          }

          return new Response(
            JSON.stringify({
              error: 'Invalid credentials',
              attempts_remaining: tracking?.attempts_remaining || 0
            }),
            { status: 401, headers: corsHeaders }
          )
        }

        return new Response(
          JSON.stringify({
            user: authData.user,
            session: authData.session
          }),
          { headers: corsHeaders }
        )
      }

      case 'check_session': {
        if (!user_id) {
          return new Response(
            JSON.stringify({ error: 'User ID is required' }),
            { status: 400, headers: corsHeaders }
          )
        }

        // Check ban status and session expiry
        const { data: securityStatus } = await supabase
          .from('user_security_status')
          .select('is_banned, ban_reason, session_expires_at, banned_until')
          .eq('user_id', user_id)
          .single()

        if (securityStatus?.is_banned) {
          const bannedUntil = securityStatus.banned_until ? new Date(securityStatus.banned_until) : null
          if (!bannedUntil || bannedUntil > new Date()) {
            return new Response(
              JSON.stringify({
                valid: false,
                reason: 'banned',
                ban_reason: securityStatus.ban_reason,
                locked_until: bannedUntil?.toISOString()
              }),
              { headers: corsHeaders }
            )
          } else {
            // Ban has expired, unban the user
            await supabase
              .from('user_security_status')
              .update({
                is_banned: false,
                ban_reason: null,
                banned_at: null,
                banned_until: null,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', user_id)
          }
        }

        // Check session expiry
        if (securityStatus?.session_expires_at) {
          const expiresAt = new Date(securityStatus.session_expires_at)
          if (expiresAt < new Date()) {
            return new Response(
              JSON.stringify({
                valid: false,
                reason: 'session_expired',
                expired_at: expiresAt.toISOString()
              }),
              { headers: corsHeaders }
            )
          }
        }

        // Extend session
        const { data: securitySettings } = await supabase
          .rpc('get_security_settings')

        if (securitySettings && securitySettings.length > 0) {
          const settings = securitySettings[0]
          const newExpiryTime = new Date()
          newExpiryTime.setHours(newExpiryTime.getHours() + settings.session_timeout_hours)

          await supabase
            .from('user_security_status')
            .update({
              session_expires_at: newExpiryTime.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user_id)
        }

        return new Response(
          JSON.stringify({
            valid: true,
            session_extended: true
          }),
          { headers: corsHeaders }
        )
      }

      case 'check_ban_status': {
        if (!user_id) {
          return new Response(
            JSON.stringify({ error: 'User ID is required' }),
            { status: 400, headers: corsHeaders }
          )
        }

        const { data: securityStatus } = await supabase
          .from('user_security_status')
          .select('*')
          .eq('user_id', user_id)
          .single()

        return new Response(
          JSON.stringify({
            security_status: securityStatus
          }),
          { headers: corsHeaders }
        )
      }

      case 'unban_user': {
        if (!user_id) {
          return new Response(
            JSON.stringify({ error: 'User ID is required' }),
            { status: 400, headers: corsHeaders }
          )
        }

        const { error } = await supabase
          .rpc('reset_user_security_status', { _email: email })

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: corsHeaders }
          )
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: corsHeaders }
        )
      }

      case 'validate_password': {
        if (!password) {
          return new Response(
            JSON.stringify({ error: 'Password is required' }),
            { status: 400, headers: corsHeaders }
          )
        }

        const { data: validation, error } = await supabase
          .rpc('validate_password_policy', { _password: password })

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: corsHeaders }
          )
        }

        return new Response(
          JSON.stringify({
            validation: validation?.[0] || { valid: false, errors: ['Unknown validation error'] }
          }),
          { headers: corsHeaders }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: corsHeaders }
        )
    }
  } catch (error) {
    console.error('Auth security error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    )
  }
})