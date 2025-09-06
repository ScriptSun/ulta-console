import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { api } from '../_shared/api-wrapper.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = api.getClient();

    // Get the user from the request
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { agent_id, action } = await req.json();

    if (!agent_id || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing agent_id or action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the agent and verify permissions
    const agentResult = await api.select('agents', '*, customer_id', {
      eq: { id: agent_id },
      single: true
    });
    const agent = agentResult.data;
    const agentError = agentResult.success ? null : { message: agentResult.error };

    if (agentError || !agent) {
      return new Response(
        JSON.stringify({ error: 'Agent not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has permission to control this agent
    const permissionResult = await api.rpc('get_user_role_in_customer', {
      _customer_id: agent.customer_id,
      _role: 'approver'
    });
    const hasPermission = permissionResult.data;

    const adminResult = await api.rpc('is_admin');
    const isAdmin = adminResult.data;

    if (!hasPermission && !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let newStatus = agent.status;
    let actionDescription = '';

    switch (action) {
      case 'start':
        if (agent.status === 'offline' || agent.status === 'idle') {
          newStatus = 'running';
          actionDescription = 'started';
        } else {
          return new Response(
            JSON.stringify({ error: 'Agent cannot be started from current status' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        break;
      
      case 'pause':
        if (agent.status === 'running') {
          newStatus = 'idle';
          actionDescription = 'paused';
        } else {
          return new Response(
            JSON.stringify({ error: 'Agent cannot be paused from current status' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        break;
      
      case 'stop':
        if (agent.status === 'running' || agent.status === 'idle') {
          newStatus = 'offline';
          actionDescription = 'stopped';
        } else {
          return new Response(
            JSON.stringify({ error: 'Agent cannot be stopped from current status' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        break;
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Update the agent status
    const updateResult = await api.update('agents', {
      status: newStatus,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    }, {
      eq: { id: agent_id }
    });
    const updateError = updateResult.success ? null : { message: updateResult.error };

    if (updateError) {
      console.error('Error updating agent:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update agent status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the action in audit logs
    await api.insert('audit_logs', {
      customer_id: agent.customer_id,
      actor: user.email || user.id,
      action: `agent_${action}`,
      target: `agent:${agent.name}`,
      meta: {
        agent_id: agent_id,
        previous_status: agent.status,
        new_status: newStatus,
        user_id: user.id
      }
    });

    // Create a log entry for the agent
    await api.insert('agent_logs', {
      agent_id: agent_id,
      level: 'info',
      message: `Agent ${actionDescription} by ${user.email || 'system'}`,
      metadata: {
        action: action,
        user_id: user.id,
        previous_status: agent.status
      }
    });

    // In a real implementation, you would also send a command to the actual agent
    // This could be done via a message queue, webhook, or direct API call
    console.log(`Agent ${agent.name} (${agent_id}) ${actionDescription} by ${user.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Agent ${actionDescription} successfully`,
        agent_id: agent_id,
        new_status: newStatus
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in agent-control function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});