import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { Logger } from '../_shared/logger.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    Logger.request(req.method, '/console-invite-accept');

    const { token } = await req.json();
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'Token required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Set auth for supabase client
    const authToken = authHeader.replace('Bearer ', '');
    await supabase.auth.setSession({ access_token: authToken, refresh_token: '' });

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find invite by token
    const { data: invite, error: inviteError } = await supabase
      .from('console_invites')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (inviteError || !invite) {
      return new Response(JSON.stringify({ error: 'Invalid or expired invite' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get user's email from their profile or auth
    const userEmail = user.user.email;
    if (userEmail !== invite.email) {
      return new Response(JSON.stringify({ error: 'Invite email does not match logged in user' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if admin_profiles entry exists, create if needed
    const { data: adminProfile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('id')
      .eq('id', user.user.id)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
      Logger.error('Failed to check admin profile', profileError);
      return new Response(JSON.stringify({ error: 'Failed to process invite' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!adminProfile) {
      // Create admin profile
      const { error: createProfileError } = await supabase
        .from('admin_profiles')
        .insert({
          id: user.user.id,
          email: userEmail,
          full_name: user.user.user_metadata?.full_name || userEmail
        });

      if (createProfileError) {
        Logger.error('Failed to create admin profile', createProfileError);
        return new Response(JSON.stringify({ error: 'Failed to create profile' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Check if already a team member
    const { data: existingMember } = await supabase
      .from('console_team_members')
      .select('id')
      .eq('team_id', invite.team_id)
      .eq('admin_id', user.user.id)
      .maybeSingle();

    if (existingMember) {
      // Mark invite as accepted even though already a member
      await supabase
        .from('console_invites')
        .update({ status: 'accepted' })
        .eq('id', invite.id);

      return new Response(JSON.stringify({ message: 'Already a team member' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Add to team
    const { error: memberError } = await supabase
      .from('console_team_members')
      .insert({
        team_id: invite.team_id,
        admin_id: user.user.id,
        role: invite.role
      });

    if (memberError) {
      Logger.error('Failed to add team member', memberError);
      return new Response(JSON.stringify({ error: 'Failed to join team' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Mark invite as accepted
    const { error: updateError } = await supabase
      .from('console_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id);

    if (updateError) {
      Logger.error('Failed to mark invite as accepted', updateError);
      // Don't return error here since the main action succeeded
    }

    Logger.info('Invite accepted', { inviteId: invite.id, userId: user.user.id, teamId: invite.team_id });

    return new Response(JSON.stringify({ 
      message: 'Successfully joined team',
      team_id: invite.team_id,
      role: invite.role
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    Logger.error('Unexpected error in console-invite-accept', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});