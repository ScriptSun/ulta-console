import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

// CORS and security headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf',
  'Access-Control-Allow-Credentials': 'true',
};

// Allowed origins for widget authentication
const ALLOWED_ORIGINS = [
  'https://billing.example.com',
  'https://whmcs.example.com',
  'https://widget.ultaai.com'
];

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

interface ConnectedClient {
  socket: WebSocket;
  sessionId: string;
  agentId: string;
  tenantId: string;
  conversationId: string;
  lastRotated: Date;
}

// In-memory storage for WebSocket connections (use Redis in production)
const connectedClients = new Map<string, ConnectedClient>();

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

    // Handle WebSocket upgrade for streaming
    if (req.headers.get("upgrade") === "websocket") {
      return await handleWebSocketUpgrade(req, supabase);
    }

    // Route requests
    if (req.method === 'POST') {
      const body = await req.json();
      const routePath = body.path || path;
      
      if (routePath.endsWith('/chat/start')) {
        return await handleChatStart(req, supabase, body);
      } else if (routePath.endsWith('/chat/message')) {
        return await handleChatMessage(req, supabase, body);
      } else if (routePath.endsWith('/chat/close')) {
        return await handleChatClose(req, supabase, body);
      } else if (routePath.endsWith('/demo/start')) {
        return await handleDemoStart(req, supabase, body);
      } else if (routePath.endsWith('/demo/message')) {
        return await handleDemoMessage(req, supabase, body);
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

// WebSocket upgrade handler with authentication and session rotation
async function handleWebSocketUpgrade(req: Request, supabase: any) {
  const { headers } = req;
  const origin = headers.get("origin");
  
  // Validate origin
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    console.log('WebSocket upgrade rejected: invalid origin', origin);
    return new Response("Forbidden", { status: 403 });
  }

  // Get and validate session cookie
  const cookieHeader = headers.get("cookie");
  const sessionId = extractCookie(cookieHeader, "ultaai_sid");
  
  if (!sessionId) {
    console.log('WebSocket upgrade rejected: no session cookie');
    return new Response("Unauthorized", { status: 401 });
  }

  // Validate session
  const { data: session, error: sessionError } = await supabase
    .from('widget_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .eq('is_active', true)
    .single();

  if (sessionError || !session || new Date(session.expires_at) < new Date()) {
    console.log('WebSocket upgrade rejected: invalid session', sessionError);
    return new Response("Unauthorized", { status: 401 });
  }

  // Check if session needs rotation (every 15 minutes)
  const now = new Date();
  const lastRotated = new Date(session.last_rotated);
  const needsRotation = (now.getTime() - lastRotated.getTime()) > 15 * 60 * 1000;

  if (needsRotation) {
    // Generate new session ID
    const newSessionId = crypto.randomUUID();
    
    // Update session
    await supabase
      .from('widget_sessions')
      .update({
        session_id: newSessionId,
        last_rotated: now.toISOString(),
        expires_at: new Date(now.getTime() + 30 * 60 * 1000).toISOString()
      })
      .eq('id', session.id);

    console.log('Session rotated:', { oldSession: sessionId, newSession: newSessionId });
    
    // Close any existing sockets for this session
    if (connectedClients.has(sessionId)) {
      const client = connectedClients.get(sessionId)!;
      client.socket.close(1000, "Session rotated");
      connectedClients.delete(sessionId);
    }

    sessionId = newSessionId;
  }

  // Upgrade to WebSocket
  const { socket, response } = Deno.upgradeWebSocket(req);
  
  // Log connection event
  await supabase.from('security_events').insert({
    event_type: 'websocket_connect',
    session_id: session.session_id,
    agent_id: session.agent_id,
    tenant_id: session.tenant_id,
    user_id: session.user_id,
    ip_address: headers.get('x-forwarded-for') || headers.get('x-real-ip'),
    user_agent: headers.get('user-agent'),
    payload: { origin }
  });

  // Store connection
  const client: ConnectedClient = {
    socket,
    sessionId: session.session_id,
    agentId: session.agent_id,
    tenantId: session.tenant_id,
    conversationId: session.conversation_id,
    lastRotated: now
  };
  
  connectedClients.set(session.session_id, client);

  socket.onopen = () => {
    console.log('WebSocket connected:', session.session_id);
  };

  socket.onclose = async () => {
    console.log('WebSocket disconnected:', session.session_id);
    connectedClients.delete(session.session_id);
    
    // Log disconnect event
    await supabase.from('security_events').insert({
      event_type: 'websocket_disconnect',
      session_id: session.session_id,
      agent_id: session.agent_id,
      tenant_id: session.tenant_id,
      user_id: session.user_id,
      payload: { duration_ms: Date.now() - now.getTime() }
    });
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
    connectedClients.delete(session.session_id);
  };

  return response;
}

// Rate limiting implementation
async function checkRateLimit(supabase: any, bucketKey: string, bucketType: string, limit: number, windowSec: number): Promise<{ allowed: boolean; message?: string }> {
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / (windowSec * 1000)) * windowSec * 1000);

  // Get or create bucket
  const { data: bucket, error } = await supabase
    .from('rate_limit_buckets')
    .select('*')
    .eq('bucket_key', bucketKey)
    .single();

  if (error && error.code !== 'PGRST116') { // Not found error
    console.error('Rate limit error:', error);
    return { allowed: true }; // Allow on error to avoid blocking legitimate requests
  }

  if (!bucket) {
    // Create new bucket
    await supabase
      .from('rate_limit_buckets')
      .insert({
        bucket_key: bucketKey,
        bucket_type: bucketType,
        count: 1,
        window_start: windowStart.toISOString()
      });
    return { allowed: true };
  }

  const bucketWindowStart = new Date(bucket.window_start);
  
  // Reset bucket if window has passed
  if (bucketWindowStart < windowStart) {
    await supabase
      .from('rate_limit_buckets')
      .update({
        count: 1,
        window_start: windowStart.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('bucket_key', bucketKey);
    return { allowed: true };
  }

  // Check if limit exceeded
  if (bucket.count >= limit) {
    const friendlyMessages = {
      session: "You're sending messages too quickly. Please wait a moment before trying again.",
      agent: "This agent is receiving too many requests. Please try again in a minute.",
      tenant: "Your organization has reached the message limit. Please try again later."
    };
    
    return { 
      allowed: false, 
      message: friendlyMessages[bucketType as keyof typeof friendlyMessages] || "Rate limit exceeded" 
    };
  }

  // Increment counter
  await supabase
    .from('rate_limit_buckets')
    .update({
      count: bucket.count + 1,
      updated_at: now.toISOString()
    })
    .eq('bucket_key', bucketKey);

  return { allowed: true };
}

// Content redaction for sensitive data
function redactSensitiveContent(content: string): { redacted: string; hasSensitive: boolean } {
  let redacted = content;
  let hasSensitive = false;

  // Redact emails
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  if (emailRegex.test(redacted)) {
    redacted = redacted.replace(emailRegex, '[REDACTED_EMAIL]');
    hasSensitive = true;
  }

  // Redact phone numbers (various formats)
  const phoneRegex = /(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
  if (phoneRegex.test(redacted)) {
    redacted = redacted.replace(phoneRegex, '[REDACTED_PHONE]');
    hasSensitive = true;
  }

  // Redact potential passwords/tokens (common patterns)
  const passwordRegex = /\b(?:password|pass|pwd|token|key|secret)[\s:=]+[^\s]+/gi;
  if (passwordRegex.test(redacted)) {
    redacted = redacted.replace(passwordRegex, (match) => {
      const parts = match.split(/[\s:=]+/);
      return parts[0] + ': [REDACTED]';
    });
    hasSensitive = true;
  }

  // Redact API keys and tokens (alphanumeric sequences longer than 20 chars)
  const tokenRegex = /\b[A-Za-z0-9]{20,}\b/g;
  if (tokenRegex.test(redacted)) {
    redacted = redacted.replace(tokenRegex, '[REDACTED_TOKEN]');
    hasSensitive = true;
  }

  return { redacted, hasSensitive };
}

// Generate SHA256 hash for deduplication
async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper function to extract cookies
function extractCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name) return value;
  }
  return null;
}

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

async function handleChatStart(req: Request, supabase: any, body?: any) {
  const requestBody: ChatStartRequest = body || await req.json();
  const { tenant_id, agent_id, user_id, session_id, source = 'website' } = requestBody;

  console.log('Starting chat:', requestBody);

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

async function handleChatMessage(req: Request, supabase: any, body?: any) {
  const requestBody: ChatMessageRequest = body || await req.json();
  const { conversation_id, role, content } = requestBody;

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
      .select('id, tenant_id, agent_id, user_id, status, meta, session_id')
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

    // Rate limiting for user messages
    if (role === 'user') {
      const sessionKey = `session:${conversation.session_id || conversation_id}`;
      const agentKey = `agent:${conversation.agent_id}`;
      const tenantKey = `tenant:${conversation.tenant_id}`;

      // Check session rate limit (10 messages per 10 seconds)
      const sessionLimit = await checkRateLimit(supabase, sessionKey, 'session', 10, 10);
      if (!sessionLimit.allowed) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded',
          message: sessionLimit.message,
          widget_message: sessionLimit.message
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check agent rate limit (60 messages per minute)
      const agentLimit = await checkRateLimit(supabase, agentKey, 'agent', 60, 60);
      if (!agentLimit.allowed) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded',
          message: agentLimit.message,
          widget_message: agentLimit.message
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check tenant rate limit (1000 messages per minute)
      const tenantLimit = await checkRateLimit(supabase, tenantKey, 'tenant', 1000, 60);
      if (!tenantLimit.allowed) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded',
          message: tenantLimit.message,
          widget_message: tenantLimit.message
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Redact sensitive content
    const { redacted: redactedContent, hasSensitive } = redactSensitiveContent(content);
    
    // Generate content hash for deduplication
    const contentHash = await generateContentHash(redactedContent);

    // Check for duplicate messages
    if (role === 'user') {
      const { data: existingMessage } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('conversation_id', conversation_id)
        .eq('content_sha256', contentHash)
        .eq('role', role)
        .limit(1);

      if (existingMessage && existingMessage.length > 0) {
        console.log('Duplicate message detected, ignoring');
        return new Response(JSON.stringify({ 
          message: { id: existingMessage[0].id },
          duplicate: true 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Log the message with redacted content and hash
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id,
        role,
        content: redactedContent, // Store redacted content
        content_sha256: contentHash,
        redacted: hasSensitive,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error logging message:', messageError);
      throw messageError;
    }

    console.log('Message logged:', message.id, hasSensitive ? '(redacted)' : '(clean)');

    // Use the chat router for user messages
    let routerResult = null;
    if (role === 'user') {
      routerResult = await processChatRouter(supabase, conversation_id, redactedContent, conversation);
      console.log('Router result:', routerResult);
    }

    // For backward compatibility, still classify intent
    const intent = routerResult?.intent || classifyIntent(redactedContent);
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
        content_length: redactedContent.length,
        intent,
        router_action: routerResult?.action,
        redacted: hasSensitive
      }
    });

    // Send response via WebSocket if connected
    if (role === 'assistant' && conversation.session_id) {
      const client = connectedClients.get(conversation.session_id);
      if (client && client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(JSON.stringify({
          type: 'message',
          data: {
            id: message.id,
            role,
            content: redactedContent,
            created_at: message.created_at
          }
        }));
      }
    }

    return new Response(JSON.stringify({ 
      message,
      intent,
      conversation_updated: true,
      router_response: routerResult?.response,
      router_action: routerResult?.action,
      run_id: routerResult?.run_id,
      batch_id: routerResult?.batch_id,
      redacted: hasSensitive
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

async function handleChatClose(req: Request, supabase: any, body?: any) {
  const requestBody: ChatCloseRequest = body || await req.json();
  const { conversation_id } = requestBody;

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
      .select('id, tenant_id, agent_id, status, session_id')
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

    // Close WebSocket connection if exists
    if (conversation.session_id && connectedClients.has(conversation.session_id)) {
      const client = connectedClients.get(conversation.session_id)!;
      client.socket.close(1000, "Conversation closed");
      connectedClients.delete(conversation.session_id);
    }

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

  // Extract email addresses (but redact them in the stored content)
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

// Agent-bound router with enhanced command policy checking and event tracking
async function processIntentWithParams(supabase: any, conversationId: string, conversation: any, result: any, conversationContext: any) {
  const intentDef = result.intentDef!;
  const agentId = conversation.agent_id;
  const tenantId = conversation.tenant_id;
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

  // All parameters available - check command policies
  const policyCheck = await checkAgentCommandPolicies(supabase, tenantId, agentId, intentDef.batchName, result.params);
  
  if (!policyCheck.allowed) {
    // Log policy blocked event
    await supabase.from('chat_events').insert({
      conversation_id: conversationId,
      type: 'policy_blocked',
      agent_id: agentId,
      payload: {
        intent: result.intent,
        batch_name: intentDef.batchName,
        reason: policyCheck.reason,
        policy_id: policyCheck.policy_id
      }
    });

    return {
      response: policyCheck.reason,
      action: 'policy_blocked',
      intent: result.intent
    };
  }

  // Check if we have a matching batch for this agent
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
    .eq('customer_id', tenantId)
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

  // Start batch run for this specific agent
  console.log('Starting agent-bound batch run:', { batchId: batch.id, agentId });
  
  const { data: runResult, error: runError } = await supabase
    .rpc('start_batch_run', {
      _batch_id: batch.id,
      _agent_id: agentId
    });

  if (runError || !runResult || runResult.length === 0) {
    console.error('Failed to start batch run:', runError);
    
    // Log fail event
    await supabase.from('chat_events').insert({
      conversation_id: conversationId,
      type: 'fail',
      agent_id: agentId,
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
  console.log('Agent-bound batch run result:', runInfo);

  if (runInfo.status === 'blocked') {
    // Log blocked event
    await supabase.from('chat_events').insert({
      conversation_id: conversationId,
      type: 'task_blocked',
      agent_id: agentId,
      payload: {
        intent: result.intent,
        batch_name: intentDef.batchName,
        reason: runInfo.message
      }
    });

    return {
      response: `I can't start the ${result.intent.replace('_', ' ')} task right now: ${runInfo.message}`,
      action: 'blocked',
      intent: result.intent
    };
  }

  // Task queued - log the event
  await supabase.from('chat_events').insert({
    conversation_id: conversationId,
    type: 'task_queued',
    agent_id: agentId,
    ref_id: runInfo.run_id,
    payload: {
      intent: result.intent,
      batch_name: intentDef.batchName,
      batch_id: batch.id,
      run_id: runInfo.run_id,
      params: result.params
    }
  });

  // Task started - log the event (immediately after queuing for this agent)
  await supabase.from('chat_events').insert({
    conversation_id: conversationId,
    type: 'task_started',
    agent_id: agentId,
    ref_id: runInfo.run_id,
    payload: {
      intent: result.intent,
      batch_name: intentDef.batchName,
      batch_id: batch.id,
      run_id: runInfo.run_id,
      params: result.params,
      started_at: new Date().toISOString()
    }
  });

  // Update conversation with agent-bound action
  await supabase
    .from('chat_conversations')
    .update({
      last_intent: result.intent,
      last_action: `agent_task_started:${batch.name}`,
      meta: { ...conversationContext, last_run_id: runInfo.run_id, bound_agent: agentId },
      updated_at: new Date().toISOString()
    })
    .eq('id', conversationId);

  const paramsText = Object.keys(result.params).length > 0 
    ? ` with parameters: ${Object.entries(result.params).map(([k, v]) => `${k}=${v}`).join(', ')}`
    : '';

  return {
    response: `Great! I've started the ${result.intent.replace('_', ' ')} task${paramsText} on this agent. I'll let you know once it's complete.`,
    action: 'task_started',
    intent: result.intent,
    run_id: runInfo.run_id,
    batch_id: batch.id,
    agent_id: agentId
  };
}

// Agent-bound command policy checker
async function checkAgentCommandPolicies(supabase: any, tenantId: string, agentId: string, batchName: string, params: any): Promise<{ allowed: boolean; reason?: string; policy_id?: string }> {
  // Get active command policies for this tenant
  const { data: policies } = await supabase
    .from('command_policies')
    .select('*')
    .eq('customer_id', tenantId)
    .eq('active', true)
    .or(`match_value.eq.${batchName},match_type.eq.wildcard`);

  if (!policies || policies.length === 0) {
    return { allowed: true };
  }

  // Get agent details for OS checking
  const { data: agent } = await supabase
    .from('agents')
    .select('os')
    .eq('id', agentId)
    .single();

  // Check each policy
  for (const policy of policies) {
    // Check OS whitelist if specified
    if (policy.os_whitelist && policy.os_whitelist.length > 0 && agent?.os) {
      if (!policy.os_whitelist.includes(agent.os)) {
        return { 
          allowed: false, 
          reason: `Command blocked: not allowed on ${agent.os} systems`,
          policy_id: policy.id
        };
      }
    }

    if (policy.mode === 'deny') {
      return { 
        allowed: false, 
        reason: `Command blocked by policy: ${policy.policy_name}`,
        policy_id: policy.id
      };
    }
    
    if (policy.mode === 'confirm') {
      return { 
        allowed: false, 
        reason: policy.confirm_message || 'This command requires approval',
        policy_id: policy.id
      };
    }
  }

  return { allowed: true };
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

      // Log completion event with agent-bound event types
      const eventType = status === 'success' ? 'success' : 'fail';
      
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

      const { data: conversation } = await supabase
        .from('chat_conversations')
        .update({
          last_action: lastAction,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .select('session_id')
        .single();

      // Send completion message back to the conversation
      const completionMessage = status === 'success'
        ? `✅ Task completed successfully! The ${payload.intent?.replace('_', ' ') || 'requested task'} has finished${duration_sec ? ` in ${duration_sec} seconds` : ''}.`
        : `❌ Task failed: ${error_message || 'An error occurred while running the task.'}`;

      const { data: message } = await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: completionMessage,
        created_at: new Date().toISOString()
      }).select().single();

      // Stream completion message via WebSocket if connected
      if (conversation?.session_id && connectedClients.has(conversation.session_id)) {
        const client = connectedClients.get(conversation.session_id)!;
        if (client.socket.readyState === WebSocket.OPEN) {
          client.socket.send(JSON.stringify({
            type: 'message',
            data: {
              id: message.id,
              role: 'assistant',
              content: completionMessage,
              created_at: message.created_at
            }
          }));
        }
      }

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

// Dashboard demo handlers with Supabase auth
async function handleDemoStart(req: Request, supabase: any, body?: any) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const requestBody = body || await req.json();
  const { agent_id } = requestBody;

  if (!agent_id) {
    return new Response(JSON.stringify({ error: 'agent_id is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get user's customer IDs
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('customer_id')
      .eq('user_id', user.id);

    if (!userRoles || userRoles.length === 0) {
      return new Response(JSON.stringify({ error: 'No tenant access' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const customerIds = userRoles.map(r => r.customer_id);

    // Validate agent access
    const { data: agent } = await supabase
      .from('agents')
      .select('id, customer_id')
      .eq('id', agent_id)
      .single();

    if (!agent || !customerIds.includes(agent.customer_id)) {
      return new Response(JSON.stringify({ error: 'Agent not accessible' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for existing demo conversation
    const { data: existingConversation } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('tenant_id', agent.customer_id)
      .eq('agent_id', agent_id)
      .eq('user_id', user.id)
      .eq('source', 'demo')
      .eq('status', 'open')
      .order('created_at', { descending: true })
      .limit(1);

    if (existingConversation && existingConversation.length > 0) {
      return new Response(JSON.stringify({ 
        conversation_id: existingConversation[0].id,
        created: false 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create new demo conversation
    const { data: newConversation, error: createError } = await supabase
      .from('chat_conversations')
      .insert({
        tenant_id: agent.customer_id,
        user_id: user.id,
        agent_id: agent_id,
        source: 'demo',
        status: 'open',
        started_at: new Date().toISOString(),
        meta: { dashboard_demo: true }
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    // Log start event
    await supabase.from('chat_events').insert({
      conversation_id: newConversation.id,
      type: 'conversation_started',
      agent_id: agent_id,
      payload: {
        tenant_id: agent.customer_id,
        user_id: user.id,
        source: 'demo',
        dashboard_demo: true
      }
    });

    return new Response(JSON.stringify({ 
      conversation_id: newConversation.id,
      created: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in handleDemoStart:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleDemoMessage(req: Request, supabase: any, body?: any) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const requestBody = body || await req.json();
  const { conversation_id, content, is_action = false } = requestBody;

  if (!conversation_id || !content) {
    return new Response(JSON.stringify({ error: 'conversation_id and content are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Validate conversation access
    const { data: conversation } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', conversation_id)
      .eq('user_id', user.id)
      .eq('source', 'demo')
      .single();

    if (!conversation) {
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting for demo (more generous)
    const sessionKey = `demo:${user.id}:${conversation_id}`;
    const sessionLimit = await checkRateLimit(supabase, sessionKey, 'session', 15, 30);
    if (!sessionLimit.allowed) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        message: sessionLimit.message
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process message through chat system
    const messageResult = await handleChatMessage(
      new Request(req.url, {
        method: 'POST',
        headers: req.headers,
        body: JSON.stringify({
          conversation_id,
          role: 'user',
          content
        })
      }),
      supabase
    );

    const messageData = await messageResult.json();

    // Generate assistant response
    let assistantResponse = "I received your message and I'm processing it.";
    let eventType = null;
    let runId = null;

    if (messageData.router_action === 'task_started') {
      assistantResponse = messageData.router_response;
      eventType = 'task_queued';
      runId = messageData.run_id;
    } else if (messageData.router_action === 'clarify') {
      assistantResponse = messageData.router_response;
    } else if (messageData.router_action === 'policy_blocked') {
      assistantResponse = messageData.router_response;
    } else if (messageData.router_action === 'no_batch') {
      assistantResponse = messageData.router_response;
    } else {
      // Generate contextual response based on intent
      const intent = messageData.intent;
      if (intent === 'install_wordpress') {
        assistantResponse = "I can help you install WordPress! I'll need a domain name and admin email address to get started.";
      } else if (intent === 'check_cpu' || intent === 'check_disk' || intent === 'check_memory') {
        assistantResponse = `I'll check the ${intent.replace('check_', '')} usage for you right away.`;
      } else if (intent === 'restart_service') {
        assistantResponse = "I can restart services for you. Which service would you like me to restart?";
      } else {
        assistantResponse = "I can help you with server management tasks like installing WordPress, checking system resources, managing services, and more. What would you like me to help you with?";
      }
    }

    // Add assistant response
    const { data: assistantMessage } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id,
        role: 'assistant',
        content: assistantResponse,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    // Log assistant message event
    await supabase.from('chat_events').insert({
      conversation_id,
      type: 'message_sent',
      agent_id: conversation.agent_id,
      ref_id: assistantMessage.id,
      payload: {
        role: 'assistant',
        content_length: assistantResponse.length,
        generated_response: true
      }
    });

    return new Response(JSON.stringify({ 
      response: assistantResponse,
      intent: messageData.intent,
      event_type: eventType,
      run_id: runId,
      needs_inputs: messageData.router_action === 'clarify',
      message_id: assistantMessage.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in handleDemoMessage:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
