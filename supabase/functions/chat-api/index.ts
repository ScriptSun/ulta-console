import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatStartRequest {
  tenant_id: string;
  agent_id: string;
  user_id?: string;
  session_id?: string;
  source?: string;
}

interface ChatMessageRequest {
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatCloseRequest {
  conversation_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const path = url.pathname;

    console.log('Chat API request:', { method: req.method, path });

    // Route requests
    if (req.method === 'POST') {
      if (path.endsWith('/chat/start')) {
        return await handleChatStart(req, supabase);
      } else if (path.endsWith('/chat/message')) {
        return await handleChatMessage(req, supabase);
      } else if (path.endsWith('/chat/close')) {
        return await handleChatClose(req, supabase);
      }
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function validateAgentAccess(supabase: any, agentId: string, tenantId: string, userId?: string) {
  console.log('Validating agent access:', { agentId, tenantId, userId });
  
  // Check if agent belongs to tenant
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, customer_id')
    .eq('id', agentId)
    .single();

  if (agentError || !agent) {
    console.error('Agent not found:', agentError);
    return { valid: false, error: 'Agent not found' };
  }

  if (agent.customer_id !== tenantId) {
    console.error('Agent does not belong to tenant:', { agent_tenant: agent.customer_id, requested_tenant: tenantId });
    return { valid: false, error: 'Agent does not belong to tenant' };
  }

  // If userId provided, check if user has access to tenant
  if (userId) {
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('customer_id')
      .eq('user_id', userId)
      .eq('customer_id', tenantId);

    if (roleError || !userRoles || userRoles.length === 0) {
      console.error('User does not have access to tenant:', roleError);
      return { valid: false, error: 'User does not have access to tenant' };
    }
  }

  return { valid: true };
}

async function handleChatStart(req: Request, supabase: any) {
  const body: ChatStartRequest = await req.json();
  const { tenant_id, agent_id, user_id, session_id, source = 'website' } = body;

  console.log('Starting chat:', body);

  // Validate required fields
  if (!tenant_id || !agent_id) {
    return new Response(JSON.stringify({ error: 'tenant_id and agent_id are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate agent access
  const validation = await validateAgentAccess(supabase, agent_id, tenant_id, user_id);
  if (!validation.valid) {
    return new Response(JSON.stringify({ error: validation.error }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Check for existing open conversation
    let query = supabase
      .from('chat_conversations')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('agent_id', agent_id)
      .eq('status', 'open');

    if (user_id) {
      query = query.eq('user_id', user_id);
    }
    if (session_id) {
      query = query.eq('session_id', session_id);
    }

    const { data: existingConversations } = await query.limit(1);

    if (existingConversations && existingConversations.length > 0) {
      console.log('Found existing conversation:', existingConversations[0].id);
      return new Response(JSON.stringify({ 
        conversation: existingConversations[0],
        created: false 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create new conversation
    const { data: newConversation, error: createError } = await supabase
      .from('chat_conversations')
      .insert({
        tenant_id,
        user_id,
        agent_id,
        session_id,
        source,
        status: 'open',
        started_at: new Date().toISOString(),
        meta: {}
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating conversation:', createError);
      throw createError;
    }

    console.log('Created new conversation:', newConversation.id);

    // Log conversation start event
    await supabase.from('chat_events').insert({
      conversation_id: newConversation.id,
      type: 'conversation_started',
      agent_id,
      payload: {
        tenant_id,
        user_id,
        session_id,
        source
      }
    });

    return new Response(JSON.stringify({ 
      conversation: newConversation,
      created: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in handleChatStart:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleChatMessage(req: Request, supabase: any) {
  const body: ChatMessageRequest = await req.json();
  const { conversation_id, role, content } = body;

  console.log('Handling chat message:', { conversation_id, role, content_length: content?.length });

  // Validate required fields
  if (!conversation_id || !role || !content) {
    return new Response(JSON.stringify({ error: 'conversation_id, role, and content are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get conversation details for validation
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('id, tenant_id, agent_id, user_id, status')
      .eq('id', conversation_id)
      .single();

    if (convError || !conversation) {
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if conversation is still open
    if (conversation.status !== 'open') {
      return new Response(JSON.stringify({ error: 'Conversation is closed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the message
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id,
        role,
        content,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error logging message:', messageError);
      throw messageError;
    }

    console.log('Message logged:', message.id);

    // Classify intent (simple keyword-based for now)
    const intent = classifyIntent(content);
    console.log('Classified intent:', intent);

    // Update conversation with last intent
    await supabase
      .from('chat_conversations')
      .update({
        last_intent: intent,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversation_id);

    // If this is a user message, enqueue task for agent
    if (role === 'user' && intent) {
      const { data: task, error: taskError } = await supabase
        .from('agent_tasks')
        .insert({
          agent_id: conversation.agent_id,
          task_name: `chat_${intent}`,
          status: 'pending',
          metadata: {
            conversation_id,
            message_id: message.id,
            intent,
            user_message: content
          },
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (taskError) {
        console.error('Error creating task:', taskError);
      } else {
        console.log('Task enqueued:', task.id);

        // Log task enqueued event
        await supabase.from('chat_events').insert({
          conversation_id,
          type: 'task_queued',
          agent_id: conversation.agent_id,
          ref_id: task.id,
          payload: {
            task_name: task.task_name,
            intent,
            message_id: message.id
          }
        });

        // Update conversation with last action
        await supabase
          .from('chat_conversations')
          .update({
            last_action: `task_queued:${task.task_name}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', conversation_id);
      }
    }

    // Log message event
    await supabase.from('chat_events').insert({
      conversation_id,
      type: 'message_received',
      agent_id: conversation.agent_id,
      ref_id: message.id,
      payload: {
        role,
        content_length: content.length,
        intent
      }
    });

    return new Response(JSON.stringify({ 
      message,
      intent,
      conversation_updated: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in handleChatMessage:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleChatClose(req: Request, supabase: any) {
  const body: ChatCloseRequest = await req.json();
  const { conversation_id } = body;

  console.log('Closing chat:', { conversation_id });

  // Validate required fields
  if (!conversation_id) {
    return new Response(JSON.stringify({ error: 'conversation_id is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get conversation details for validation
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('id, tenant_id, agent_id, status')
      .eq('id', conversation_id)
      .single();

    if (convError || !conversation) {
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Close the conversation
    const { data: updatedConversation, error: updateError } = await supabase
      .from('chat_conversations')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', conversation_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error closing conversation:', updateError);
      throw updateError;
    }

    console.log('Conversation closed:', conversation_id);

    // Log conversation closed event
    await supabase.from('chat_events').insert({
      conversation_id,
      type: 'conversation_closed',
      agent_id: conversation.agent_id,
      payload: {
        closed_at: new Date().toISOString()
      }
    });

    return new Response(JSON.stringify({ 
      conversation: updatedConversation,
      closed: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in handleChatClose:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Simple intent classification based on keywords
function classifyIntent(message: string): string | null {
  const lowerMessage = message.toLowerCase();

  // Define intent patterns
  const intents = [
    { name: 'install_wordpress', keywords: ['install', 'wordpress', 'wp', 'site', 'website'] },
    { name: 'setup_ssl', keywords: ['ssl', 'https', 'certificate', 'secure', 'encryption'] },
    { name: 'backup_data', keywords: ['backup', 'restore', 'export', 'download', 'save'] },
    { name: 'update_software', keywords: ['update', 'upgrade', 'latest', 'version'] },
    { name: 'troubleshoot', keywords: ['error', 'problem', 'issue', 'fix', 'broken', 'not working'] },
    { name: 'configure', keywords: ['configure', 'setup', 'settings', 'config'] },
    { name: 'deploy', keywords: ['deploy', 'deployment', 'publish', 'go live'] },
    { name: 'monitor', keywords: ['monitor', 'status', 'health', 'check', 'metrics'] }
  ];

  // Find the best matching intent
  let bestMatch = null;
  let maxMatches = 0;

  for (const intent of intents) {
    const matches = intent.keywords.filter(keyword => lowerMessage.includes(keyword)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      bestMatch = intent.name;
    }
  }

  return maxMatches > 0 ? bestMatch : 'general_inquiry';
}