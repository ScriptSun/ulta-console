import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { EdgeFunctionApiWrapper } from '../_shared/api-wrapper.ts';

interface CreateConfirmationRequest {
  command_id: string;
  policy_id: string;
  command_text: string;
  params?: Record<string, any>;
  agent_id: string;
  customer_id: string;
}

interface CreateConfirmationResponse {
  confirmation_id: string;
  expires_at: string;
}

interface ApprovalRequest {
  rejection_reason?: string;
}

interface CommandConfirmation {
  id: string;
  command_id: string;
  policy_id: string;
  command_text: string;
  params: Record<string, any> | null;
  agent_id: string;
  requested_by: string;
  requested_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  expires_at: string;
  customer_id: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function createConfirmation(api: EdgeFunctionApiWrapper, body: CreateConfirmationRequest): Promise<Response> {
  try {
    // Calculate expiration time (24 hours from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Insert confirmation record
    const insertResult = await api.insert('command_confirmations', {
      command_id: body.command_id,
      policy_id: body.policy_id,
      command_text: body.command_text,
      params: body.params || null,
      agent_id: body.agent_id,
      customer_id: body.customer_id,
      requested_by: body.customer_id, // TODO: Get actual user ID from auth context
      expires_at: expiresAt,
      status: 'pending'
    });

    if (!insertResult.success) {
      console.error('Failed to create confirmation:', insertResult.error);
      return new Response(JSON.stringify({ error: 'Failed to create confirmation' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const response: CreateConfirmationResponse = {
      confirmation_id: insertResult.data.id,
      expires_at: insertResult.data.expires_at
    };

    console.log('Created confirmation:', response);

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Create confirmation error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function approveConfirmation(api: EdgeFunctionApiWrapper, confirmationId: string): Promise<Response> {
  try {
    // Get the confirmation record
    const confirmationResult = await api.selectOne('command_confirmations', '*', { id: confirmationId });

    if (!confirmationResult.success || !confirmationResult.data) {
      return new Response(JSON.stringify({ error: 'Confirmation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const confirmation = confirmationResult.data;

    // Check if confirmation is still valid
    if (confirmation.status !== 'pending') {
      return new Response(JSON.stringify({ 
        error: 'Confirmation already processed',
        status: confirmation.status 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if confirmation has expired
    if (new Date(confirmation.expires_at) < new Date()) {
      // Mark as expired
      await api.update('command_confirmations', { id: confirmationId }, { status: 'expired' });

      return new Response(JSON.stringify({ error: 'Confirmation has expired' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update confirmation status to approved
    const updateResult = await api.update('command_confirmations', { id: confirmationId }, {
      status: 'approved',
      approved_by: confirmation.customer_id, // TODO: Get actual user ID from auth context
      approved_at: new Date().toISOString()
    });

    if (!updateResult.success) {
      console.error('Failed to update confirmation:', updateResult.error);
      return new Response(JSON.stringify({ error: 'Failed to approve confirmation' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Enqueue task via signer (simulated for now)
    // TODO: Implement actual task enqueuing to signer service
    await enqueueTask(confirmation);

    console.log('Approved confirmation:', confirmationId);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Confirmation approved and task enqueued' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Approve confirmation error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function denyConfirmation(api: EdgeFunctionApiWrapper, confirmationId: string, body: ApprovalRequest): Promise<Response> {
  try {
    // Get the confirmation record
    const confirmationResult = await api.selectOne('command_confirmations', '*', { id: confirmationId });

    if (!confirmationResult.success || !confirmationResult.data) {
      return new Response(JSON.stringify({ error: 'Confirmation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const confirmation = confirmationResult.data;

    // Check if confirmation is still valid
    if (confirmation.status !== 'pending') {
      return new Response(JSON.stringify({ 
        error: 'Confirmation already processed',
        status: confirmation.status 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update confirmation status to rejected
    const updateResult = await api.update('command_confirmations', { id: confirmationId }, {
      status: 'rejected',
      approved_by: confirmation.customer_id, // TODO: Get actual user ID from auth context
      approved_at: new Date().toISOString(),
      rejection_reason: body.rejection_reason || 'Denied by approver'
    });

    if (!updateResult.success) {
      console.error('Failed to update confirmation:', updateResult.error);
      return new Response(JSON.stringify({ error: 'Failed to deny confirmation' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Denied confirmation:', confirmationId);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Confirmation denied' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Deny confirmation error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function enqueueTask(confirmation: CommandConfirmation): Promise<void> {
  try {
    // TODO: Implement actual task enqueuing to signer service
    // This is a placeholder for the actual implementation
    console.log('Enqueuing task for approved command:', {
      command_id: confirmation.command_id,
      agent_id: confirmation.agent_id,
      command_text: confirmation.command_text,
      params: confirmation.params
    });

    // Example: Call signer service API
    // const signerResponse = await fetch('https://signer-service.example.com/api/tasks', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     agent_id: confirmation.agent_id,
    //     command: confirmation.command_text,
    //     parameters: confirmation.params,
    //     confirmation_id: confirmation.id
    //   })
    // });

    // Simulate successful enqueuing
    await new Promise(resolve => setTimeout(resolve, 100));
    
  } catch (error) {
    console.error('Failed to enqueue task:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize API wrapper
    const api = new EdgeFunctionApiWrapper();

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // Route: POST /internal/commands/confirmations
    if (req.method === 'POST' && pathParts.length === 3) {
      const body: CreateConfirmationRequest = await req.json();
      
      // Validate required fields
      if (!body.command_id || !body.policy_id || !body.command_text || !body.agent_id || !body.customer_id) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields: command_id, policy_id, command_text, agent_id, customer_id' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return await createConfirmation(api, body);
    }

    // Route: POST /internal/commands/confirmations/{id}/approve
    if (req.method === 'POST' && pathParts.length === 5 && pathParts[4] === 'approve') {
      const confirmationId = pathParts[3];
      return await approveConfirmation(api, confirmationId);
    }

    // Route: POST /internal/commands/confirmations/{id}/deny
    if (req.method === 'POST' && pathParts.length === 5 && pathParts[4] === 'deny') {
      const confirmationId = pathParts[3];
      const body: ApprovalRequest = await req.json().catch(() => ({}));
      return await denyConfirmation(api, confirmationId, body);
    }

    // Route not found
    return new Response(JSON.stringify({ error: 'Route not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Request handler error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});