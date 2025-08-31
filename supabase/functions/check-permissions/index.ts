import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PermissionCheckRequest {
  pageKey: string;
  permission: 'view' | 'edit' | 'delete';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });

    // Get the user from the JWT token
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log('Authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 401 }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { pageKey, permission }: PermissionCheckRequest = await req.json();

    console.log(`Checking ${permission} permission for user ${user.id} on page ${pageKey}`);

    // Get user's team memberships
    const { data: memberships, error: membershipError } = await supabase
      .from('console_team_members')
      .select(`
        id,
        role,
        team_id,
        console_member_page_perms(
          page_key,
          can_view,
          can_edit,
          can_delete
        )
      `)
      .eq('admin_id', user.id);

    if (membershipError) {
      console.error('Error fetching memberships:', membershipError);
      throw membershipError;
    }

    // Get role templates
    const { data: roleTemplates, error: templatesError } = await supabase
      .from('console_role_templates')
      .select('*')
      .eq('page_key', pageKey);

    if (templatesError) {
      console.error('Error fetching role templates:', templatesError);
      throw templatesError;
    }

    let hasPermission = false;

    // If user has no team memberships, provide Owner-level access as fallback
    if (!memberships || memberships.length === 0) {
      const ownerTemplate = roleTemplates?.find(t => t.role === 'Owner');
      if (ownerTemplate) {
        switch (permission) {
          case 'view':
            hasPermission = ownerTemplate.can_view;
            break;
          case 'edit':
            hasPermission = ownerTemplate.can_edit;
            break;
          case 'delete':
            hasPermission = ownerTemplate.can_delete;
            break;
        }
      }
    } else {
      // Check permissions across all team memberships
      for (const membership of memberships) {
        const memberPermissions = membership.console_member_page_perms || [];
        
        // Check for explicit permission first
        const explicitPerm = memberPermissions.find(p => p.page_key === pageKey);
        
        if (explicitPerm) {
          // Use explicit permission
          switch (permission) {
            case 'view':
              hasPermission = hasPermission || explicitPerm.can_view;
              break;
            case 'edit':
              hasPermission = hasPermission || explicitPerm.can_edit;
              break;
            case 'delete':
              hasPermission = hasPermission || explicitPerm.can_delete;
              break;
          }
        } else {
          // Fall back to role template
          const template = roleTemplates?.find(t => t.role === membership.role);
          if (template) {
            switch (permission) {
              case 'view':
                hasPermission = hasPermission || template.can_view;
                break;
              case 'edit':
                hasPermission = hasPermission || template.can_edit;
                break;
              case 'delete':
                hasPermission = hasPermission || template.can_delete;
                break;
            }
          }
        }
        
        // If we already have permission, no need to check further
        if (hasPermission) break;
      }
    }

    if (!hasPermission) {
      console.log(`Permission denied for user ${user.id} on ${pageKey}:${permission}`);
      return new Response(
        JSON.stringify({ 
          error: 'Forbidden', 
          message: `You don't have ${permission} permission for ${pageKey}`,
          code: 403 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Permission granted for user ${user.id} on ${pageKey}:${permission}`);
    return new Response(
      JSON.stringify({ success: true, hasPermission: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Permission check error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});