import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { method } = req;
    const url = new URL(req.url);

    // Get current user
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (method === 'POST') {
      // Create invite with rate limiting
      const { email, role, teamId } = await req.json();

      // Check rate limit for invites (10 per hour)
      const { data: rateCheck, error: rateError } = await supabaseClient.rpc('check_and_increment_rate_limit', {
        _team_id: teamId,
        _user_id: user.id,
        _limit_type: 'invites',
        _max_count: 10
      });

      if (rateError) {
        console.error('Rate limit check error:', rateError);
        return new Response(
          JSON.stringify({ error: 'Failed to check rate limit' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const rateLimit = rateCheck[0];
      if (!rateLimit.allowed) {
        // Log rate limit exceeded
        await supabaseClient.rpc('log_team_audit_event', {
          _team_id: teamId,
          _actor_email: user.email,
          _action: 'rate.limit',
          _target: 'invites',
          _details: { 
            current_count: rateLimit.current_count,
            retry_after_seconds: rateLimit.retry_after_seconds,
            attempted_email: email,
            attempted_role: role
          }
        });

        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded',
            retry_after_seconds: rateLimit.retry_after_seconds 
          }),
          { 
            status: 429, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'Retry-After': rateLimit.retry_after_seconds.toString()
            } 
          }
        );
      }

      // Create the invite
      const { data: invite, error: inviteError } = await supabaseClient
        .from('console_invites')
        .insert({
          email,
          role,
          team_id: teamId,
          created_by: user.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        })
        .select()
        .single();

      if (inviteError) {
        console.error('Invite creation error:', inviteError);
        return new Response(
          JSON.stringify({ error: 'Failed to create invite' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log audit event
      await supabaseClient.rpc('log_team_audit_event', {
        _team_id: teamId,
        _actor_email: user.email,
        _action: 'console.invite.create',
        _target: `invite:${email}`,
        _details: { 
          invited_email: email,
          invited_role: role,
          invite_id: invite.id,
          expires_at: invite.expires_at
        }
      });

      return new Response(
        JSON.stringify(invite),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (method === 'DELETE') {
      // Cancel invite
      const inviteId = url.pathname.split('/').pop();
      
      if (!inviteId) {
        return new Response(
          JSON.stringify({ error: 'Invite ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get invite details before deletion
      const { data: invite } = await supabaseClient
        .from('console_invites')
        .select('*')
        .eq('id', inviteId)
        .single();

      // Delete the invite
      const { error: deleteError } = await supabaseClient
        .from('console_invites')
        .delete()
        .eq('id', inviteId);

      if (deleteError) {
        console.error('Invite deletion error:', deleteError);
        return new Response(
          JSON.stringify({ error: 'Failed to cancel invite' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log audit event
      if (invite) {
        await supabaseClient.rpc('log_team_audit_event', {
          _team_id: invite.team_id,
          _actor_email: user.email,
          _action: 'console.invite.cancel',
          _target: `invite:${invite.email}`,
          _details: { 
            cancelled_email: invite.email,
            cancelled_role: invite.role,
            invite_id: inviteId
          }
        });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})