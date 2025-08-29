import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActivatePlanRequest {
  user_id: string;
  customer_id: string;
  plan_name: string;
  whmcs_order_id?: string;
  api_key: string;
}

serve(async (req) => {
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
    // Create Supabase client with service role key for admin access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const body: ActivatePlanRequest = await req.json();
    const { user_id, customer_id, plan_name, whmcs_order_id, api_key } = body;

    // Validate API key (you should set this as a secret)
    const expectedApiKey = Deno.env.get('WHMCS_API_KEY');
    if (!expectedApiKey || api_key !== expectedApiKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate required fields
    if (!user_id || !customer_id || !plan_name) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: user_id, customer_id, plan_name' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get the plan by name
    const { data: plan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('name', plan_name)
      .single();

    if (planError || !plan) {
      return new Response(JSON.stringify({ 
        error: `Plan '${plan_name}' not found` 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Deactivate any existing subscriptions for this user/customer
    const { error: deactivateError } = await supabaseAdmin
      .from('user_subscriptions')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .eq('customer_id', customer_id)
      .eq('status', 'active');

    if (deactivateError) {
      console.error('Error deactivating existing subscriptions:', deactivateError);
    }

    // Create new subscription
    const currentDate = new Date();
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from('user_subscriptions')
      .insert({
        user_id,
        customer_id,
        plan_id: plan.id,
        status: 'active',
        current_period_start: currentDate.toISOString(),
        current_period_end: nextMonth.toISOString(),
        whmcs_order_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError);
      return new Response(JSON.stringify({ 
        error: 'Failed to create subscription',
        details: subscriptionError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Log the activation
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        customer_id,
        actor: 'WHMCS_API',
        action: 'plan_activated',
        target: `user:${user_id}`,
        meta: {
          plan_name,
          plan_id: plan.id,
          subscription_id: subscription.id,
          whmcs_order_id,
          api_activation: true
        }
      });

    return new Response(JSON.stringify({
      success: true,
      message: `Plan '${plan_name}' activated successfully`,
      subscription_id: subscription.id,
      plan_details: {
        name: plan.name,
        monthly_ai_requests: plan.monthly_ai_requests,
        monthly_server_events: plan.monthly_server_events,
        price: plan.price
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in activate-plan function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});