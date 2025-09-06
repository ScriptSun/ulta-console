import { EdgeFunctionApiWrapper } from '../_shared/api-wrapper.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkInviteRequest {
  team_id: string;
  invites: Array<{
    email: string;
    role: string;
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const api = new EdgeFunctionApiWrapper();

    const { team_id, invites } = await req.json() as BulkInviteRequest;

    if (!team_id || !invites || !Array.isArray(invites)) {
      return new Response(
        JSON.stringify({ error: 'Missing team_id or invites array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing bulk invite for team ${team_id} with ${invites.length} emails`);

    const results = [];
    
    for (const invite of invites) {
      const { email, role } = invite;
      
      try {
        // Find user in auth.users by email
        const { data: authUser, error: userError } = await api.getClient().auth.admin.listUsers();
        
        if (userError) {
          console.error(`Error fetching users: ${userError.message}`);
          results.push({ email, status: 'error', message: userError.message });
          continue;
        }

        const user = authUser.users.find(u => u.email === email);
        
        if (!user) {
          console.log(`User not found: ${email}`);
          results.push({ email, status: 'skipped', message: 'User not found in auth.users' });
          continue;
        }

        // Upsert admin_profiles
        const profileResult = await api.upsert('admin_profiles', {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email
        });

        if (!profileResult.success) {
          console.error(`Error upserting profile for ${email}: ${profileResult.error}`);
          results.push({ email, status: 'error', message: `Profile error: ${profileResult.error}` });
          continue;
        }

        // Check if team member already exists
        const memberResult = await api.selectOne('console_team_members', 'id, role', { 
          team_id, 
          admin_id: user.id 
        });

        if (memberResult.success && memberResult.data) {
          // Update role if different
          if (memberResult.data.role !== role) {
            const updateResult = await api.update('console_team_members', { id: memberResult.data.id }, { role });

            if (!updateResult.success) {
              console.error(`Error updating member role for ${email}: ${updateResult.error}`);
              results.push({ email, status: 'error', message: `Update error: ${updateResult.error}` });
            } else {
              console.log(`Updated role for ${email} to ${role}`);
              results.push({ email, status: 'updated', message: `Role updated to ${role}` });
            }
          } else {
            console.log(`Member ${email} already exists with correct role`);
            results.push({ email, status: 'exists', message: 'Already a member with correct role' });
          }
        } else {
          // Insert new team member
          const insertResult = await api.insert('console_team_members', {
            team_id,
            admin_id: user.id,
            role
          });

          if (!insertResult.success) {
            console.error(`Error inserting team member for ${email}: ${insertResult.error}`);
            results.push({ email, status: 'error', message: `Member error: ${insertResult.error}` });
          } else {
            console.log(`Added ${email} as ${role} to team ${team_id}`);
            results.push({ email, status: 'added', message: `Added as ${role}` });
          }
        }

      } catch (error) {
        console.error(`Unexpected error processing ${email}:`, error);
        results.push({ 
          email, 
          status: 'error', 
          message: `Unexpected error: ${error.message}` 
        });
      }
    }

    console.log(`Bulk invite completed. Results:`, results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        summary: {
          total: invites.length,
          added: results.filter(r => r.status === 'added').length,
          updated: results.filter(r => r.status === 'updated').length,
          exists: results.filter(r => r.status === 'exists').length,
          errors: results.filter(r => r.status === 'error').length,
          skipped: results.filter(r => r.status === 'skipped').length,
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});