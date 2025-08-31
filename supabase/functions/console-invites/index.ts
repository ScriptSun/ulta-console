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

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    Logger.request(req.method, url.pathname);

    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Set auth for supabase client
    const token = authHeader.replace('Bearer ', '');
    await supabase.auth.setSession({ access_token: token, refresh_token: '' });

    if (req.method === 'POST' && pathSegments.length === 0) {
      // POST /console-invites - Create invite
      const { team_id, email, role } = await req.json();
      
      if (!team_id || !email || !role) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check if user can invite to this team
      const { data: membership } = await supabase
        .from('console_team_members')
        .select('role')
        .eq('team_id', team_id)
        .eq('admin_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!membership || !['Owner', 'Admin'].includes(membership.role)) {
        return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check if already invited or member
      const { data: existingInvite } = await supabase
        .from('console_invites')
        .select('id')
        .eq('team_id', team_id)
        .eq('email', email)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingInvite) {
        return new Response(JSON.stringify({ error: 'Already invited' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('admin_profiles')
        .select(`
          console_team_members!inner(id)
        `)
        .eq('console_team_members.team_id', team_id)
        .eq('email', email)
        .maybeSingle();

      if (existingMember) {
        return new Response(JSON.stringify({ error: 'Already a team member' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Create invite
      const { data, error } = await supabase
        .from('console_invites')
        .insert({
          team_id,
          email,
          role,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) {
        Logger.error('Failed to create invite', error);
        return new Response(JSON.stringify({ error: 'Failed to create invite' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      Logger.info('Invite created', { inviteId: data.id, email, role });
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (req.method === 'GET') {
      // GET /console-invites?team_id=... - List invites
      const team_id = url.searchParams.get('team_id');
      
      if (!team_id) {
        return new Response(JSON.stringify({ error: 'team_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data, error } = await supabase
        .from('console_invites')
        .select('*')
        .eq('team_id', team_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        Logger.error('Failed to fetch invites', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch invites' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (req.method === 'POST' && pathSegments[1] === 'cancel') {
      // POST /console-invites/:id/cancel - Cancel invite
      const inviteId = pathSegments[0];
      
      const { data, error } = await supabase
        .from('console_invites')
        .update({ status: 'canceled' })
        .eq('id', inviteId)
        .select()
        .single();

      if (error) {
        Logger.error('Failed to cancel invite', error);
        return new Response(JSON.stringify({ error: 'Failed to cancel invite' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      Logger.info('Invite canceled', { inviteId });
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    Logger.error('Unexpected error in console-invites', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});