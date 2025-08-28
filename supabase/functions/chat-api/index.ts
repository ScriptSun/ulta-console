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
      } else if (path.endsWith('/webhook/batch-completion')) {
        return await handleBatchCompletion(req, supabase);
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
      .select('id, tenant_id, agent_id, user_id, status, meta')
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

    // Use the chat router for user messages
    let routerResult = null;
    if (role === 'user') {
      routerResult = await processChatRouter(supabase, conversation_id, content, conversation);
      console.log('Router result:', routerResult);
    }

    // For backward compatibility, still classify intent
    const intent = routerResult?.intent || classifyIntent(content);
    console.log('Classified intent:', intent);

    // Update conversation with last intent
    await supabase
      .from('chat_conversations')
      .update({
        last_intent: intent,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversation_id);

    // Log message event
    await supabase.from('chat_events').insert({
      conversation_id,
      type: 'message_received',
      agent_id: conversation.agent_id,
      ref_id: message.id,
      payload: {
        role,
        content_length: content.length,
        intent,
        router_action: routerResult?.action
      }
    });

    return new Response(JSON.stringify({ 
      message,
      intent,
      conversation_updated: true,
      router_response: routerResult?.response,
      router_action: routerResult?.action,
      run_id: routerResult?.run_id,
      batch_id: routerResult?.batch_id
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

// Intent definitions with required parameters
interface IntentDefinition {
  name: string;
  keywords: string[];
  requiredParams: string[];
  batchName?: string;
  clarifyingQuestions: Record<string, string>;
}

const INTENT_DEFINITIONS: IntentDefinition[] = [
  {
    name: 'install_wordpress',
    keywords: ['install', 'wordpress', 'wp', 'create', 'setup', 'new site'],
    requiredParams: ['domain', 'admin_email'],
    batchName: 'wordpress-installer',
    clarifyingQuestions: {
      domain: 'What domain would you like to install WordPress on? (e.g., example.com)',
      admin_email: 'What email address should be used for the WordPress admin account?'
    }
  },
  {
    name: 'check_cpu',
    keywords: ['cpu', 'processor', 'load', 'performance', 'usage'],
    requiredParams: [],
    batchName: 'system-monitor',
    clarifyingQuestions: {}
  },
  {
    name: 'check_disk',
    keywords: ['disk', 'storage', 'space', 'drive', 'filesystem'],
    requiredParams: [],
    batchName: 'system-monitor',
    clarifyingQuestions: {}
  },
  {
    name: 'check_memory',
    keywords: ['memory', 'ram', 'memory usage'],
    requiredParams: [],
    batchName: 'system-monitor',
    clarifyingQuestions: {}
  },
  {
    name: 'restart_service',
    keywords: ['restart', 'reboot', 'service', 'daemon'],
    requiredParams: ['service_name'],
    batchName: 'service-manager',
    clarifyingQuestions: {
      service_name: 'Which service would you like me to restart? (e.g., apache2, nginx, mysql)'
    }
  },
  {
    name: 'setup_ssl',
    keywords: ['ssl', 'https', 'certificate', 'secure', 'letsencrypt'],
    requiredParams: ['domain'],
    batchName: 'ssl-manager',
    clarifyingQuestions: {
      domain: 'Which domain do you want to secure with SSL? (e.g., example.com)'
    }
  },
  {
    name: 'backup_database',
    keywords: ['backup', 'database', 'mysql', 'export', 'dump'],
    requiredParams: ['database_name'],
    batchName: 'backup-manager',
    clarifyingQuestions: {
      database_name: 'Which database would you like to backup?'
    }
  },
  {
    name: 'update_system',
    keywords: ['update', 'upgrade', 'packages', 'system', 'security'],
    requiredParams: [],
    batchName: 'system-updater',
    clarifyingQuestions: {}
  },
  {
    name: 'deploy_app',
    keywords: ['deploy', 'deployment', 'app', 'application', 'publish'],
    requiredParams: ['repository_url'],
    batchName: 'app-deployer',
    clarifyingQuestions: {
      repository_url: 'What is the Git repository URL for your application?'
    }
  }
];

// Enhanced intent classification with parameter extraction
function classifyIntentAndExtractParams(message: string, conversationContext: any = {}) {
  const lowerMessage = message.toLowerCase();
  
  // Find the best matching intent
  let bestMatch = null;
  let maxScore = 0;

  for (const intent of INTENT_DEFINITIONS) {
    const keywordMatches = intent.keywords.filter(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    ).length;
    
    if (keywordMatches > maxScore) {
      maxScore = keywordMatches;
      bestMatch = intent;
    }
  }

  if (!bestMatch) {
    return {
      intent: 'general_inquiry',
      params: {},
      confidence: 0
    };
  }

  // Extract parameters from message
  const extractedParams: Record<string, string> = {};
  
  // Extract domain names
  const domainRegex = /(?:domain|site|website)?\s*(?:is|:|at)?\s*([a-zA-Z0-9-]+\.(?:[a-zA-Z]{2,})+)/gi;
  const domainMatch = domainRegex.exec(message);
  if (domainMatch && bestMatch.requiredParams.includes('domain')) {
    extractedParams.domain = domainMatch[1];
  }

  // Extract email addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailMatch = emailRegex.exec(message);
  if (emailMatch && bestMatch.requiredParams.includes('admin_email')) {
    extractedParams.admin_email = emailMatch[0];
  }

  // Extract service names
  const serviceRegex = /(?:service|restart|stop|start)\s+([a-zA-Z0-9_-]+)/gi;
  const serviceMatch = serviceRegex.exec(message);
  if (serviceMatch && bestMatch.requiredParams.includes('service_name')) {
    extractedParams.service_name = serviceMatch[1];
  }

  // Extract database names
  const dbRegex = /(?:database|db)\s+([a-zA-Z0-9_-]+)/gi;
  const dbMatch = dbRegex.exec(message);
  if (dbMatch && bestMatch.requiredParams.includes('database_name')) {
    extractedParams.database_name = dbMatch[1];
  }

  // Extract repository URLs
  const repoRegex = /(https?:\/\/(?:github\.com|gitlab\.com|bitbucket\.org)\/[^\s]+)/gi;
  const repoMatch = repoRegex.exec(message);
  if (repoMatch && bestMatch.requiredParams.includes('repository_url')) {
    extractedParams.repository_url = repoMatch[1];
  }

  return {
    intent: bestMatch.name,
    intentDef: bestMatch,
    params: extractedParams,
    confidence: maxScore / bestMatch.keywords.length
  };
}

// Chat router to handle intent processing and batch execution
async function processChatRouter(supabase: any, conversationId: string, message: string, conversation: any) {
  console.log('Processing chat router for:', { conversationId, message });

  // Get conversation context
  const conversationContext = conversation.meta || {};
  
  // Check if we're waiting for a specific parameter
  if (conversationContext.pending_intent && conversationContext.awaiting_param) {
    console.log('Continuing pending intent:', conversationContext.pending_intent);
    
    const pendingIntent = INTENT_DEFINITIONS.find(i => i.name === conversationContext.pending_intent);
    if (pendingIntent) {
      const awaitingParam = conversationContext.awaiting_param;
      const pendingParams = conversationContext.pending_params || {};
      
      // Extract the parameter value from the message
      let paramValue = null;
      
      if (awaitingParam === 'domain') {
        const domainRegex = /([a-zA-Z0-9-]+\.(?:[a-zA-Z]{2,})+)/gi;
        const match = domainRegex.exec(message);
        paramValue = match ? match[1] : message.trim();
      } else if (awaitingParam === 'admin_email') {
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const match = emailRegex.exec(message);
        paramValue = match ? match[0] : (message.includes('@') ? message.trim() : null);
      } else if (awaitingParam === 'service_name') {
        paramValue = message.trim().replace(/^(service\s+|restart\s+|stop\s+|start\s+)/i, '');
      } else if (awaitingParam === 'database_name') {
        paramValue = message.trim().replace(/^(database\s+|db\s+)/i, '');
      } else if (awaitingParam === 'repository_url') {
        const repoRegex = /(https?:\/\/(?:github\.com|gitlab\.com|bitbucket\.org)\/[^\s]+)/gi;
        const match = repoRegex.exec(message);
        paramValue = match ? match[0] : (message.startsWith('http') ? message.trim() : null);
      } else {
        paramValue = message.trim();
      }
      
      if (!paramValue) {
        return {
          response: `I didn't understand that. ${pendingIntent.clarifyingQuestions[awaitingParam]}`,
          action: 'clarify',
          intent: conversationContext.pending_intent,
          missing_param: awaitingParam
        };
      }
      
      // Add the parameter and continue processing
      const allParams = { ...pendingParams, [awaitingParam]: paramValue };
      const result = {
        intent: conversationContext.pending_intent,
        intentDef: pendingIntent,
        params: allParams,
        confidence: 1.0
      };
      
      // Clear pending state and continue with normal processing
      const updatedContext = { ...conversationContext };
      delete updatedContext.pending_intent;
      delete updatedContext.pending_params;
      delete updatedContext.awaiting_param;
      
      await supabase
        .from('chat_conversations')
        .update({
          meta: updatedContext,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);
      
      // Continue with the intent processing using the collected parameters
      return await processIntentWithParams(supabase, conversationId, conversation, result, updatedContext);
    }
  }
  
  // Classify intent and extract parameters
  const result = classifyIntentAndExtractParams(message, conversationContext);
  console.log('Intent classification result:', result);

  if (result.intent === 'general_inquiry') {
    return {
      response: "I can help you with various server tasks like installing WordPress, checking system resources, managing services, and more. What would you like me to help you with?",
      action: 'clarify',
      intent: result.intent
    };
  }

  return await processIntentWithParams(supabase, conversationId, conversation, result, conversationContext);
}

// Separate function to process intents with parameters
async function processIntentWithParams(supabase: any, conversationId: string, conversation: any, result: any, conversationContext: any) {
  const intentDef = result.intentDef!;
  const missingParams = intentDef.requiredParams.filter(param => !result.params[param]);

  // Check if we have all required parameters
  if (missingParams.length > 0) {
    const nextParam = missingParams[0];
    const question = intentDef.clarifyingQuestions[nextParam];
    
    // Store context for next interaction
    const updatedContext = {
      ...conversationContext,
      pending_intent: result.intent,
      pending_params: result.params,
      awaiting_param: nextParam
    };

    await supabase
      .from('chat_conversations')
      .update({
        last_intent: result.intent,
        meta: updatedContext,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    return {
      response: question,
      action: 'clarify',
      intent: result.intent,
      missing_param: nextParam
    };
  }

  // All parameters available - check if we have a matching batch
  if (!intentDef.batchName) {
    return {
      response: `I understand you want to ${result.intent.replace('_', ' ')}, but I don't have the automation ready for that task yet.`,
      action: 'no_automation',
      intent: result.intent
    };
  }

  // Find the batch for this intent
  const { data: batch, error: batchError } = await supabase
    .from('script_batches')
    .select('id, name, active_version')
    .eq('customer_id', conversation.tenant_id)
    .eq('name', intentDef.batchName)
    .neq('active_version', null)
    .single();

  if (batchError || !batch) {
    console.error('No active batch found for intent:', { intent: result.intent, batchName: intentDef.batchName });
    return {
      response: `I'd like to help you ${result.intent.replace('_', ' ')}, but the automation for this task isn't configured yet. Please contact your administrator.`,
      action: 'no_batch',
      intent: result.intent
    };
  }

  // Start batch run using the start_batch_run function
  console.log('Starting batch run:', { batchId: batch.id, agentId: conversation.agent_id });
  
  const { data: runResult, error: runError } = await supabase
    .rpc('start_batch_run', {
      _batch_id: batch.id,
      _agent_id: conversation.agent_id
    });

  if (runError || !runResult || runResult.length === 0) {
    console.error('Failed to start batch run:', runError);
    
    // Log failed task event
    await supabase.from('chat_events').insert({
      conversation_id: conversationId,
      type: 'task_failed',
      agent_id: conversation.agent_id,
      payload: {
        intent: result.intent,
        batch_name: intentDef.batchName,
        error: runError?.message || 'Failed to start batch run',
        params: result.params
      }
    });

    return {
      response: `I encountered an issue starting the ${result.intent.replace('_', ' ')} task. ${runError?.message || 'Please try again later.'}`,
      action: 'error',
      intent: result.intent
    };
  }

  const runInfo = runResult[0];
  console.log('Batch run result:', runInfo);

  if (runInfo.status === 'blocked') {
    return {
      response: `I can't start the ${result.intent.replace('_', ' ')} task right now: ${runInfo.message}`,
      action: 'blocked',
      intent: result.intent
    };
  }

  // Successfully started - log the event
  await supabase.from('chat_events').insert({
    conversation_id: conversationId,
    type: 'task_queued',
    agent_id: conversation.agent_id,
    ref_id: runInfo.run_id,
    payload: {
      intent: result.intent,
      batch_name: intentDef.batchName,
      batch_id: batch.id,
      run_id: runInfo.run_id,
      params: result.params
    }
  });

  // Update conversation
  await supabase
    .from('chat_conversations')
    .update({
      last_intent: result.intent,
      last_action: `batch_started:${batch.name}`,
      meta: { ...conversationContext, last_run_id: runInfo.run_id },
      updated_at: new Date().toISOString()
    })
    .eq('id', conversationId);

  const paramsText = Object.keys(result.params).length > 0 
    ? ` with parameters: ${Object.entries(result.params).map(([k, v]) => `${k}=${v}`).join(', ')}`
    : '';

  return {
    response: `Great! I've started the ${result.intent.replace('_', ' ')} task${paramsText}. I'll let you know once it's complete.`,
    action: 'task_started',
    intent: result.intent,
    run_id: runInfo.run_id,
    batch_id: batch.id
  };
}

// Legacy intent classification for backward compatibility
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

// Webhook handler for batch run completion events
async function handleBatchCompletion(req: Request, supabase: any) {
  const body = await req.json();
  console.log('Batch completion webhook:', body);

  const { run_id, batch_id, agent_id, status, error_message, duration_sec, contract } = body;

  if (!run_id) {
    return new Response(JSON.stringify({ error: 'run_id is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Find conversations that are waiting for this batch run
    const { data: events, error: eventsError } = await supabase
      .from('chat_events')
      .select('conversation_id, payload')
      .eq('type', 'task_queued')
      .eq('ref_id', run_id);

    if (eventsError) {
      console.error('Error finding related chat events:', eventsError);
      throw eventsError;
    }

    if (!events || events.length === 0) {
      console.log('No chat events found for run_id:', run_id);
      return new Response(JSON.stringify({ message: 'No related chat events found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process each conversation that was waiting for this run
    for (const event of events) {
      const conversationId = event.conversation_id;
      const payload = event.payload || {};

      // Log completion event
      const eventType = status === 'success' ? 'task_completed' : 'task_failed';
      
      await supabase.from('chat_events').insert({
        conversation_id: conversationId,
        type: eventType,
        agent_id,
        ref_id: run_id,
        payload: {
          ...payload,
          status,
          duration_sec,
          error_message,
          contract: contract ? JSON.stringify(contract) : null,
          completed_at: new Date().toISOString()
        }
      });

      // Update conversation with completion status
      const lastAction = status === 'success' 
        ? `task_completed:${payload.batch_name || 'unknown'}`
        : `task_failed:${payload.batch_name || 'unknown'}`;

      await supabase
        .from('chat_conversations')
        .update({
          last_action: lastAction,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      // Send completion message back to the conversation
      const completionMessage = status === 'success'
        ? `✅ Task completed successfully! The ${payload.intent?.replace('_', ' ') || 'requested task'} has finished${duration_sec ? ` in ${duration_sec} seconds` : ''}.`
        : `❌ Task failed: ${error_message || 'An error occurred while running the task.'}`;

      await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: completionMessage,
        created_at: new Date().toISOString()
      });

      console.log(`Updated conversation ${conversationId} with ${eventType} status`);
    }

    return new Response(JSON.stringify({ 
      message: 'Batch completion processed',
      conversations_updated: events.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in handleBatchCompletion:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}