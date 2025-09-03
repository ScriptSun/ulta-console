import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPGRADE-PLAN] ${step}${detailsStr}`);
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    logStep('Function started');

    const { agent_id, new_plan_key, user_id } = await req.json();

    if (!agent_id || !new_plan_key) {
      throw new Error('Missing required fields: agent_id and new_plan_key are required');
    }

    logStep('Processing upgrade request', { agent_id, new_plan_key, user_id });

    // Validate the new plan exists
    const { data: planData, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('key', new_plan_key)
      .eq('active', true)
      .single();

    if (planError || !planData) {
      throw new Error(`Invalid plan key: ${new_plan_key}`);
    }

    logStep('Plan validated', { planName: planData.name, planKey: planData.key });

    // Get current agent details
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .select('*, subscription_plans!agents_plan_key_fkey(*)')
      .eq('id', agent_id)
      .single();

    if (agentError || !agentData) {
      throw new Error(`Agent not found: ${agent_id}`);
    }

    const currentPlan = agentData.subscription_plans;
    logStep('Current agent plan', { 
      currentPlanKey: agentData.plan_key, 
      currentPlanName: currentPlan?.name 
    });

    // Check if it's actually an upgrade (higher tier)
    const isUpgrade = planData.monthly_ai_requests > (currentPlan?.monthly_ai_requests || 0);
    const changeType = isUpgrade ? 'upgrade' : 'change';

    // Update agent's plan
    const { error: updateError } = await supabase
      .from('agents')
      .update({ 
        plan_key: new_plan_key,
        updated_at: new Date().toISOString()
      })
      .eq('id', agent_id);

    if (updateError) {
      throw new Error(`Failed to update agent plan: ${updateError.message}`);
    }

    logStep('Agent plan updated successfully', { changeType });

    // Reset usage counts for the current month to give immediate access
    const currentDate = new Date();
    const currentMonth = currentDate.toISOString().slice(0, 7) + '-01'; // YYYY-MM-01

    const { error: usageResetError } = await supabase
      .from('agent_usage')
      .upsert({
        agent_id: agent_id,
        usage_type: 'ai_request',
        usage_date: currentMonth,
        count: 0,
        updated_at: new Date().toISOString()
      });

    if (usageResetError) {
      logStep('Warning: Failed to reset usage count', { error: usageResetError.message });
    } else {
      logStep('Usage count reset for immediate access');
    }

    // Log the upgrade event
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        customer_id: agentData.customer_id,
        actor: user_id ? 'system' : 'api',
        action: 'agent_plan_upgraded',
        target: `agent:${agent_id}`,
        meta: {
          agent_id: agent_id,
          from_plan: agentData.plan_key,
          to_plan: new_plan_key,
          from_plan_name: currentPlan?.name,
          to_plan_name: planData.name,
          upgrade_type: changeType,
          upgraded_by: user_id || 'external_system',
          timestamp: new Date().toISOString()
        }
      });

    if (auditError) {
      logStep('Warning: Failed to log audit event', { error: auditError.message });
    }

    // Return success response
    const response = {
      success: true,
      message: `Agent successfully ${changeType}d to ${planData.name} plan`,
      agent_id: agent_id,
      previous_plan: {
        key: agentData.plan_key,
        name: currentPlan?.name || 'Unknown',
        ai_requests: currentPlan?.monthly_ai_requests || 0
      },
      new_plan: {
        key: planData.key,
        name: planData.name,
        ai_requests: planData.monthly_ai_requests
      },
      upgrade_type: changeType,
      usage_reset: !usageResetError
    };

    logStep('Upgrade completed successfully', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logStep('ERROR in upgrade-plan', { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});