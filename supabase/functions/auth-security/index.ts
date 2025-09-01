import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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

        // First, check if user is banned before attempting login
        const { data: banCheck } = await supabase.rpc('track_login_attempt', {
          _email: email,
          _user_id: null,
          _success: false,
          _ip_address: ip_address || null,
          _user_agent: user_agent || null
        });

        if (banCheck && banCheck[0]?.is_banned) {
          return new Response(
            JSON.stringify({ 
              error: 'Account is banned', 
              ban_reason: banCheck[0].ban_reason,
              is_banned: true 
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Attempt login
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (authError) {
          // Track failed login attempt
          await supabase.rpc('track_login_attempt', {
            _email: email,
            _user_id: authData?.user?.id || null,
            _success: false,
            _ip_address: ip_address || null,
            _user_agent: user_agent || null
          });

          return new Response(
            JSON.stringify({ 
              error: authError.message,
              attempts_remaining: banCheck?.[0]?.attempts_remaining - 1 || 0
            }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Track successful login
        if (authData.user) {
          await supabase.rpc('track_login_attempt', {
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
        const { data: isBanned } = await supabase.rpc('is_user_banned', { _user_id: user_id });
        
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
        const { data: isExpired } = await supabase.rpc('is_session_expired', { _user_id: user_id });
        
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
        const { data: newExpiry } = await supabase.rpc('extend_user_session', { _user_id: user_id });

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

        const { data: securityStatus } = await supabase
          .from('user_security_status')
          .select('is_banned, ban_reason, banned_at, failed_login_count, session_expires_at')
          .eq('user_id', user_id)
          .single();

        return new Response(
          JSON.stringify({ 
            security_status: securityStatus || { 
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

        const { data: unbanned, error } = await supabase.rpc('unban_user', { _user_id: user_id });
        
        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: unbanned }),
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