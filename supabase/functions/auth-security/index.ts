import { EdgeFunctionApiWrapper } from '../_shared/api-wrapper.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuthRequest {
  action: 'login' | 'check_session' | 'check_ban_status' | 'unban_user';
  email?: string;
  password?: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const api = new EdgeFunctionApiWrapper();

    const { action, email, password, user_id, ip_address, user_agent }: AuthRequest = await req.json();
    
    console.log(`Auth security action: ${action} for ${email || user_id}`);

    switch (action) {
      case 'login': {
        if (!email || !password) {
          return new Response(
            JSON.stringify({ error: 'Email and password required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if user exists and get their current security status
        const userCheckResult = await api.selectOne('user_security_status', 'is_banned, ban_reason, failed_login_count', { email });

        if (userCheckResult.success && userCheckResult.data?.is_banned) {
          return new Response(
            JSON.stringify({ 
              error: 'Account is banned', 
              ban_reason: userCheckResult.data.ban_reason,
              is_banned: true 
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Attempt login with Supabase Auth
        const { data: authData, error: authError } = await api.getClient().auth.signInWithPassword({
          email,
          password
        });

        if (authError) {
          // Track failed login attempt
          const trackResult = await api.rpc('track_login_attempt', {
            _email: email,
            _user_id: null,
            _success: false,
            _ip_address: ip_address || null,
            _user_agent: user_agent || null
          });

          const attemptsRemaining = trackResult.success && trackResult.data?.[0]?.attempts_remaining || 0;
          const isBanned = trackResult.success && trackResult.data?.[0]?.is_banned || false;

          if (isBanned) {
            return new Response(
              JSON.stringify({ 
                error: 'Account has been banned due to too many failed login attempts',
                is_banned: true,
                ban_reason: trackResult.success && trackResult.data?.[0]?.ban_reason
              }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify({ 
              error: 'Invalid email or password',
              attempts_remaining: attemptsRemaining
            }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Track successful login
        if (authData.user) {
          await api.rpc('track_login_attempt', {
            _email: email,
            _user_id: authData.user.id,
            _success: true,
            _ip_address: ip_address || null,
            _user_agent: user_agent || null
          });
        }

        return new Response(
          JSON.stringify({ 
            user: authData.user, 
            session: authData.session,
            success: true 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'check_session': {
        if (!user_id) {
          return new Response(
            JSON.stringify({ error: 'User ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if user is banned
        const bannedResult = await api.rpc('is_user_banned', { _user_id: user_id });
        const isBanned = bannedResult.success && bannedResult.data;
        
        if (isBanned) {
          return new Response(
            JSON.stringify({ 
              valid: false, 
              reason: 'User is banned',
              is_banned: true 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if session is expired  
        const expiredResult = await api.rpc('is_session_expired', { _user_id: user_id });
        const isExpired = expiredResult.success && expiredResult.data;
        
        if (isExpired) {
          return new Response(
            JSON.stringify({ 
              valid: false, 
              reason: 'Session expired',
              session_expired: true 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Extend session
        const extendResult = await api.rpc('extend_user_session', { _user_id: user_id });
        const newExpiry = extendResult.success ? extendResult.data : null;

        return new Response(
          JSON.stringify({ 
            valid: true, 
            session_expires_at: newExpiry 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'check_ban_status': {
        if (!user_id) {
          return new Response(
            JSON.stringify({ error: 'User ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const statusResult = await api.selectOne('user_security_status', 'is_banned, ban_reason, banned_at, failed_login_count, session_expires_at', { user_id });

        return new Response(
          JSON.stringify({ 
            security_status: (statusResult.success && statusResult.data) || { 
              is_banned: false, 
              failed_login_count: 0 
            } 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'unban_user': {
        if (!user_id) {
          return new Response(
            JSON.stringify({ error: 'User ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const unbanResult = await api.rpc('unban_user', { _user_id: user_id });
        
        if (!unbanResult.success) {
          return new Response(
            JSON.stringify({ error: unbanResult.error }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: unbanResult.data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Auth security error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});