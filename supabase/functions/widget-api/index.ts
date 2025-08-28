import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

interface Database {
  public: {
    Tables: {
      widget_tickets: {
        Row: {
          id: string
          tenant_id: string
          user_id: string | null
          agent_id: string
          origin: string
          ua_hash: string | null
          expires_at: string
          used_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id?: string | null
          agent_id: string
          origin: string
          ua_hash?: string | null
          expires_at?: string
          used_at?: string | null
          created_at?: string
        }
        Update: {
          used_at?: string
        }
      }
      widget_sessions: {
        Row: {
          id: string
          tenant_id: string
          user_id: string | null
          agent_id: string
          conversation_id: string | null
          csrf: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id?: string | null
          agent_id: string
          conversation_id?: string | null
          csrf: string
          expires_at?: string
          created_at?: string
        }
        Update: {
          csrf?: string
          expires_at?: string
        }
      }
      agents: {
        Row: {
          id: string
          customer_id: string
          status: string
          agent_type: string
        }
      }
      chat_conversations: {
        Row: {
          id: string
          tenant_id: string
          agent_id: string
          user_id: string | null
          session_id: string | null
          source: string
          status: string
          meta: any
          started_at: string
          closed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          agent_id: string
          user_id?: string | null
          session_id?: string | null
          source?: string
          status?: string
          meta?: any
          started_at?: string
          closed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: string
          meta?: any
          closed_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          conversation_id: string
          role: string
          content: string
          tokens: number | null
          redacted: boolean
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: string
          content: string
          tokens?: number | null
          redacted?: boolean
          created_at?: string
        }
      }
      chat_events: {
        Row: {
          id: string
          conversation_id: string
          agent_id: string
          type: string
          payload: any
          ref_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          agent_id: string
          type: string
          payload?: any
          ref_id?: string | null
          created_at?: string
        }
      }
      script_batches: {
        Row: {
          id: string
          name: string
          customer_id: string
          active_version: number | null
        }
      }
    }
  }
}

interface ConnectedClient {
  socket: WebSocket;
  sessionId: string;
  agentId: string;
  tenantId: string;
  conversationId?: string;
  lastRotated: Date;
}

// Allowed origins for CORS - billing and WHMCS domains
const ALLOWED_ORIGINS = [
  'https://billing.example.com',
  'https://whmcs.example.com', 
  'https://portal.ultaai.com',
  'https://app.ultaai.com'
]

// In-memory storage for WebSocket connections (use Redis in production)
const connectedClients = new Map<string, ConnectedClient>();

// CSP header value
const CSP_HEADER = "default-src 'none'; script-src 'self' https://widget.ultaai.com 'strict-dynamic'; connect-src https://api.ultaai.com wss://api.ultaai.com; img-src 'self' data:; style-src 'unsafe-inline'"

// Widget.js content and hash for SRI
const WIDGET_JS_CONTENT = `
(function() {
  'use strict';
  
  class UltaAIWidget {
    constructor(config) {
      this.config = config;
      this.sessionId = null;
      this.csrfToken = null;
      this.conversationId = null;
      this.apiBase = 'https://api.ultaai.com';
    }
    
    async init() {
      try {
        const response = await fetch(this.apiBase + '/widget/bootstrap', {
          credentials: 'include',
          headers: {
            'Origin': window.location.origin
          }
        });
        
        if (!response.ok) {
          throw new Error('Bootstrap failed');
        }
        
        const data = await response.json();
        this.conversationId = data.conversation_id;
        this.csrfToken = data.csrf;
        
        this.render();
      } catch (error) {
        console.error('UltaAI Widget init failed:', error);
      }
    }
    
    async sendMessage(content) {
      if (!this.csrfToken) return;
      
      try {
        const response = await fetch(this.apiBase + '/chat/message', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF': this.csrfToken
          },
          body: JSON.stringify({ content })
        });
        
        if (!response.ok) {
          throw new Error('Message failed');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Send message failed:', error);
      }
    }
    
    render() {
      // Simple widget UI
      const widget = document.createElement('div');
      widget.innerHTML = \`
        <div id="ultaai-widget" style="position: fixed; bottom: 20px; right: 20px; width: 300px; height: 400px; border: 1px solid #ccc; background: white; z-index: 9999;">
          <div style="padding: 10px; border-bottom: 1px solid #eee;">
            <strong>UltaAI Assistant</strong>
          </div>
          <div id="ultaai-messages" style="height: 320px; overflow-y: auto; padding: 10px;"></div>
          <div style="padding: 10px; border-top: 1px solid #eee;">
            <input id="ultaai-input" type="text" placeholder="Type a message..." style="width: 100%; border: 1px solid #ccc; padding: 5px;">
          </div>
        </div>
      \`;
      
      document.body.appendChild(widget);
      
      const input = document.getElementById('ultaai-input');
      input.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
          const message = e.target.value.trim();
          e.target.value = '';
          
          this.addMessage('user', message);
          const response = await this.sendMessage(message);
          
          if (response && response.message) {
            this.addMessage('assistant', response.message);
          }
        }
      });
    }

// WebSocket upgrade handler with authentication and session rotation
async function handleWebSocketUpgrade(req: Request, supabase: any) {
  const { headers } = req;
  const origin = headers.get("origin");
  
  // Validate origin
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    console.log('WebSocket upgrade rejected: invalid origin', origin);
    await supabase.from('security_events').insert({
      event_type: 'websocket_rejected',
      ip_address: headers.get('x-forwarded-for') || headers.get('x-real-ip'),
      user_agent: headers.get('user-agent'),
      payload: { 
        origin, 
        reason: 'invalid_origin',
        allowed_origins: ALLOWED_ORIGINS
      }
    });
    return new Response("Forbidden", { status: 403 });
  }

  // Get and validate session cookie
  const cookieHeader = headers.get("cookie");
  const sessionId = extractCookie(cookieHeader, "ultaai_sid");
  
  if (!sessionId) {
    console.log('WebSocket upgrade rejected: no session cookie');
    await supabase.from('security_events').insert({
      event_type: 'websocket_rejected',
      ip_address: headers.get('x-forwarded-for') || headers.get('x-real-ip'),
      user_agent: headers.get('user-agent'),
      payload: { 
        origin,
        reason: 'no_session_cookie'
      }
    });
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
    console.log('WebSocket upgrade rejected: invalid session', { sessionError, expired: session ? new Date(session.expires_at) < new Date() : false });
    await supabase.from('security_events').insert({
      event_type: 'websocket_rejected',
      session_id: sessionId,
      ip_address: headers.get('x-forwarded-for') || headers.get('x-real-ip'),
      user_agent: headers.get('user-agent'),
      payload: { 
        origin,
        reason: sessionError ? 'session_error' : 'session_expired',
        error: sessionError?.message
      }
    });
    return new Response("Unauthorized", { status: 401 });
  }

  // Check if session needs rotation (every 15 minutes)
  const now = new Date();
  const lastRotated = new Date(session.last_rotated);
  const needsRotation = (now.getTime() - lastRotated.getTime()) > 15 * 60 * 1000;
  let currentSessionId = sessionId;

  if (needsRotation) {
    // Generate new session ID
    const newSessionId = crypto.randomUUID();
    
    // Update session with rotation
    await supabase
      .from('widget_sessions')
      .update({
        session_id: newSessionId,
        last_rotated: now.toISOString(),
        expires_at: new Date(now.getTime() + 30 * 60 * 1000).toISOString()
      })
      .eq('id', session.id);

    console.log('Session rotated for WebSocket:', { oldSession: sessionId, newSession: newSessionId });
    
    // Log session rotation
    await supabase.from('security_events').insert({
      event_type: 'session_rotated',
      session_id: newSessionId,
      agent_id: session.agent_id,
      tenant_id: session.tenant_id,
      user_id: session.user_id,
      ip_address: headers.get('x-forwarded-for') || headers.get('x-real-ip'),
      user_agent: headers.get('user-agent'),
      payload: { 
        origin,
        old_session_id: sessionId,
        reason: 'scheduled_rotation'
      }
    });
    
    // Close any existing sockets for the old session
    if (connectedClients.has(sessionId)) {
      const client = connectedClients.get(sessionId)!;
      client.socket.close(1000, "Session rotated");
      connectedClients.delete(sessionId);
    }

    currentSessionId = newSessionId;
  }

  // Upgrade to WebSocket
  const { socket, response } = Deno.upgradeWebSocket(req);
  
  // Log connection event
  await supabase.from('security_events').insert({
    event_type: 'websocket_connect',
    session_id: currentSessionId,
    agent_id: session.agent_id,
    tenant_id: session.tenant_id,
    user_id: session.user_id,
    ip_address: headers.get('x-forwarded-for') || headers.get('x-real-ip'),
    user_agent: headers.get('user-agent'),
    payload: { 
      origin,
      session_rotated: needsRotation
    }
  });

  // Store connection
  const client: ConnectedClient = {
    socket,
    sessionId: currentSessionId,
    agentId: session.agent_id,
    tenantId: session.tenant_id,
    conversationId: session.conversation_id,
    lastRotated: needsRotation ? now : lastRotated
  };
  
  connectedClients.set(currentSessionId, client);

  // Set up WebSocket event handlers
  socket.onopen = () => {
    console.log('WebSocket connected:', currentSessionId);
    
    // Send connection confirmation with potentially new session ID
    socket.send(JSON.stringify({
      type: 'connected',
      data: {
        session_id: currentSessionId,
        session_rotated: needsRotation,
        agent_id: session.agent_id,
        conversation_id: session.conversation_id
      }
    }));
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log('WebSocket message received:', { type: message.type, sessionId: currentSessionId });
      
      // Handle different message types
      if (message.type === 'chat_message' && message.data) {
        await handleWebSocketChatMessage(supabase, client, message.data);
      } else if (message.type === 'ping') {
        // Respond to ping with pong
        socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      socket.send(JSON.stringify({
        type: 'error',
        data: { message: 'Invalid message format' }
      }));
    }
  };

  socket.onclose = async (event) => {
    console.log('WebSocket disconnected:', { sessionId: currentSessionId, code: event.code, reason: event.reason });
    connectedClients.delete(currentSessionId);
    
    // Log disconnect event
    await supabase.from('security_events').insert({
      event_type: 'websocket_disconnect',
      session_id: currentSessionId,
      agent_id: session.agent_id,
      tenant_id: session.tenant_id,
      user_id: session.user_id,
      payload: { 
        duration_ms: Date.now() - now.getTime(),
        close_code: event.code,
        close_reason: event.reason
      }
    });
  };

  socket.onerror = async (error) => {
    console.error('WebSocket error:', { sessionId: currentSessionId, error });
    connectedClients.delete(currentSessionId);
    
    // Log error event
    await supabase.from('security_events').insert({
      event_type: 'websocket_error',
      session_id: currentSessionId,
      agent_id: session.agent_id,
      tenant_id: session.tenant_id,
      user_id: session.user_id,
      payload: { 
        error: error.toString()
      }
    });
  };

  // Set up session expiry monitoring
  const sessionExpiryCheck = setInterval(async () => {
    try {
      const { data: currentSession } = await supabase
        .from('widget_sessions')
        .select('expires_at, is_active')
        .eq('session_id', currentSessionId)
        .single();

      if (!currentSession || 
          !currentSession.is_active || 
          new Date(currentSession.expires_at) < new Date()) {
        
        console.log('Session expired, closing WebSocket:', currentSessionId);
        
        // Log expiry event
        await supabase.from('security_events').insert({
          event_type: 'websocket_session_expired',
          session_id: currentSessionId,
          agent_id: session.agent_id,
          tenant_id: session.tenant_id,
          user_id: session.user_id,
          payload: { 
            expires_at: currentSession?.expires_at,
            is_active: currentSession?.is_active
          }
        });
        
        socket.close(1000, "Session expired");
        clearInterval(sessionExpiryCheck);
      }
    } catch (error) {
      console.error('Session expiry check error:', error);
      socket.close(1011, "Session check failed");
      clearInterval(sessionExpiryCheck);
    }
  }, 60000); // Check every minute

  // Clear interval when socket closes
  socket.addEventListener('close', () => {
    clearInterval(sessionExpiryCheck);
  });

  return response;
}

// Handle chat messages received via WebSocket
async function handleWebSocketChatMessage(supabase: any, client: ConnectedClient, messageData: any) {
  try {
    const { content, role = 'user' } = messageData;
    
    if (!content || !client.conversationId) {
      throw new Error('Missing content or conversation ID');
    }

    // Rate limiting check (reuse the existing rate limiting logic)
    const sessionKey = "session:" + client.sessionId;
    const sessionLimit = await checkWebSocketRateLimit(supabase, sessionKey, 'session', 10, 10);
    
    if (!sessionLimit.allowed) {
      client.socket.send(JSON.stringify({
        type: 'error',
        data: { 
          message: sessionLimit.message,
          type: 'rate_limit'
        }
      }));
      return;
    }

    // Process the message through the chat API logic using Supabase functions
    const { data: result, error } = await supabase.functions.invoke('chat-api', {
      body: {
        path: '/chat/message',
        conversation_id: client.conversationId,
        role,
        content
      }
    });

    if (error) {
      throw new Error(error.message || 'Chat processing failed');
    }

    // Send response back via WebSocket
    client.socket.send(JSON.stringify({
      type: 'chat_response',
      data: {
        message: result.message,
        intent: result.intent,
        router_response: result.router_response,
        router_action: result.router_action
      }
    }));

  } catch (error) {
    console.error('WebSocket chat message error:', error);
    client.socket.send(JSON.stringify({
      type: 'error',
      data: { message: error.message }
    }));
  }
}

// Simple rate limiting for WebSocket messages
async function checkWebSocketRateLimit(supabase: any, bucketKey: string, bucketType: string, limit: number, windowSec: number): Promise<{ allowed: boolean; message?: string }> {
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / (windowSec * 1000)) * windowSec * 1000);

  try {
    const { data: bucket, error } = await supabase
      .from('rate_limit_buckets')
      .select('*')
      .eq('bucket_key', bucketKey)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Rate limit error:', error);
      return { allowed: true };
    }

    if (!bucket) {
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

    if (bucket.count >= limit) {
      return { 
        allowed: false, 
        message: "You're sending messages too quickly. Please wait a moment."
      };
    }

    await supabase
      .from('rate_limit_buckets')
      .update({
        count: bucket.count + 1,
        updated_at: now.toISOString()
      })
      .eq('bucket_key', bucketKey);

    return { allowed: true };
  } catch (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true };
  }
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
    
    addMessage(role, content) {
      const messages = document.getElementById('ultaai-messages');
      const msg = document.createElement('div');
      msg.style.marginBottom = '10px';
      msg.innerHTML = \`<strong>\${role}:</strong> \${content}\`;
      messages.appendChild(msg);
      messages.scrollTop = messages.scrollHeight;
    }
  }
  
  window.UltaAIWidget = UltaAIWidget;
})();
`

// Generate SRI hash for widget.js
async function generateSRIHash(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-384', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashBase64 = btoa(String.fromCharCode.apply(null, hashArray))
  return `sha384-${hashBase64}`
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
  
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf, origin, referer',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Security-Policy': CSP_HEADER,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  }
}

// Rate limiting storage
const rateLimits = new Map<string, { count: number; resetTime: number }>()

const RATE_LIMIT_WINDOW = 60000 // 1 minute
const RATE_LIMIT_MAX = 60 // 60 requests per minute per key

// Intent definitions for chat router
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
  }
];

serve(async (req) => {
  console.log(`Widget API: ${req.method} ${req.url}`)
  
  // Validate origin and referer for security
  function validateOriginAndReferer(req: Request): boolean {
    const origin = req.headers.get('origin')
    const referer = req.headers.get('referer')
    
    if (!origin && !referer) return false
    
    const requestOrigin = origin || (referer ? new URL(referer).origin : null)
    return requestOrigin ? ALLOWED_ORIGINS.includes(requestOrigin) : false
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin')
    return new Response(null, { headers: getCorsHeaders(origin) })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname
    const origin = req.headers.get('origin')

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

    // Route requests
    if (path === '/widget/tickets' && req.method === 'POST') {
      return await handleCreateTicket(req, supabase)
    } else if (path === '/widget/bootstrap' && req.method === 'GET') {
      // Validate origin/referer for bootstrap
      if (!validateOriginAndReferer(req)) {
        return new Response(
          JSON.stringify({ error: 'Origin not allowed' }),
          { 
            status: 403, 
            headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } 
          }
        )
      }
      return await handleBootstrap(req, supabase)
    } else if (path === '/widget.js' && req.method === 'GET') {
      return await handleWidgetJS(req)
    } else if (path === '/chat/message' && req.method === 'POST') {
      // Validate origin/referer for chat messages
      if (!validateOriginAndReferer(req)) {
        return new Response(
          JSON.stringify({ error: 'Origin not allowed' }),
          { 
            status: 403, 
            headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } 
          }
        )
      }
      return await handleWidgetMessage(req, supabase)
    } else if (path === '/chat/close' && req.method === 'POST') {
      // Validate origin/referer for chat close
      if (!validateOriginAndReferer(req)) {
        return new Response(
          JSON.stringify({ error: 'Origin not allowed' }),
          { 
            status: 403, 
            headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } 
          }
        )
      }
      return await handleWidgetClose(req, supabase)
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { 
        status: 404, 
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Widget API Error:', error)
    const origin = req.headers.get('origin')
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Helper function to parse cookies
function parseCookies(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!cookieHeader) return cookies
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.split('=')
    if (name && rest.length > 0) {
      cookies[name.trim()] = rest.join('=').trim()
    }
  })
  
  return cookies
}

// Helper function to generate random string
function generateRandomString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Rate limiting helper for general API calls
function checkGeneralRateLimit(key: string): boolean {
  const now = Date.now()
  const limit = rateLimits.get(key)
  
  if (!limit || now > limit.resetTime) {
    rateLimits.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }
  
  if (limit.count >= RATE_LIMIT_MAX) {
    return false
  }
  
  limit.count++
  return true
}

async function handleWidgetJS(req: Request): Promise<Response> {
  try {
    // Generate SRI hash
    const integrityHash = await generateSRIHash(WIDGET_JS_CONTENT)
    
    // Create embed script with SRI
    const embedScript = `
<!-- UltaAI Widget Embed -->
<script 
  src="https://api.ultaai.com/widget.js" 
  integrity="${integrityHash}"
  crossorigin="anonymous"
></script>
<script>
  // Initialize widget after script loads
  document.addEventListener('DOMContentLoaded', function() {
    if (window.UltaAIWidget) {
      const widget = new UltaAIWidget({
        // Widget configuration
      });
      widget.init();
    }
  });
</script>
<!-- End UltaAI Widget -->
`.trim()

    // Check if requesting the embed code
    const url = new URL(req.url)
    if (url.searchParams.get('embed') === 'true') {
      return new Response(embedScript, {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'public, max-age=3600',
          ...getCorsHeaders(req.headers.get('origin'))
        }
      })
    }

    // Serve the widget.js file
    return new Response(WIDGET_JS_CONTENT, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=3600, immutable',
        'X-Content-Type-Options': 'nosniff',
        ...getCorsHeaders(req.headers.get('origin'))
      }
    })
  } catch (error) {
    console.error('Error serving widget.js:', error)
    return new Response('// Widget unavailable', {
      status: 500,
      headers: {
        'Content-Type': 'application/javascript',
        ...getCorsHeaders(req.headers.get('origin'))
      }
    })
  }
}

async function handleCreateTicket(req: Request, supabase: any) {
  try {
    // Verify server-to-server authentication
    const authHeader = req.headers.get('authorization')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!authHeader || !authHeader.includes(serviceKey)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Server-to-server auth required' }),
        { 
          status: 403, 
          headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } 
        }
      )
    }

    const body = await req.json()
    const { tenant_id, user_id, agent_id, origin } = body

    // Validate required fields
    if (!tenant_id || !agent_id || !origin) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: tenant_id, agent_id, origin' }),
        { 
          status: 400, 
          headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate agent ownership - agent must belong to tenant
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, customer_id, status')
      .eq('id', agent_id)
      .eq('customer_id', tenant_id)
      .single()

    if (agentError || !agent) {
      console.log('Agent validation error:', agentError)
      return new Response(
        JSON.stringify({ error: 'Agent not found or does not belong to tenant' }),
        { 
          status: 403, 
          headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate User-Agent hash for additional security
    const userAgent = req.headers.get('user-agent') || ''
    const encoder = new TextEncoder()
    const data = encoder.encode(userAgent)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const ua_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Create ticket with 2-5 minute TTL (default 5 minutes from DB schema)
    const { data: ticket, error: ticketError } = await supabase
      .from('widget_tickets')
      .insert({
        tenant_id,
        user_id: user_id || null,
        agent_id,
        origin,
        ua_hash
      })
      .select('id')
      .single()

    if (ticketError) {
      console.error('Error creating ticket:', ticketError)
      return new Response(
        JSON.stringify({ error: 'Failed to create ticket' }),
        { 
          status: 500, 
          headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Created widget ticket ${ticket.id} for tenant ${tenant_id}, agent ${agent_id}`)

    // Log ticket creation audit event
    await supabase.from('audit_logs').insert({
      customer_id: tenant_id,
      actor: 'system',
      action: 'ticket_issued',
      target: `ticket:${ticket.id}`,
      meta: {
        agent_id,
        origin,
        user_id: user_id || null,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      }
    });

    // Increment ticket metrics
    await supabase.rpc('increment_widget_metric', {
      _tenant_id: tenant_id,
      _metric_type: 'tickets_issued',
      _increment: 1,
      _metadata: { agent_id }
    });

    return new Response(
      JSON.stringify({ ticket_id: ticket.id }),
      { 
        headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Error in handleCreateTicket:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } 
      }
    )
  }
}

async function handleBootstrap(req: Request, supabase: any) {
  try {
    // Read cookies
    const cookieHeader = req.headers.get('cookie')
    const cookies = parseCookies(cookieHeader)
    const ticketId = cookies['ultaai_ticket']
    
    if (!ticketId) {
      // Log security event for missing ticket
      await supabase.from('security_events').insert({
        tenant_id: '00000000-0000-0000-0000-000000000000', // Unknown tenant
        event_type: 'invalid_ticket',
        severity: 'medium',
        source: 'widget_bootstrap',
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent'),
        origin: req.headers.get('origin'),
        details: { reason: 'ticket_cookie_not_found' }
      });
      
      return new Response(
        JSON.stringify({ error: 'Ticket cookie not found' }),
        { 
          status: 401, 
          headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate Origin and Referer
    const origin = req.headers.get('origin')
    const referer = req.headers.get('referer')
    
    if (!origin && !referer) {
      return new Response(
        JSON.stringify({ error: 'Missing origin or referer header' }),
        { 
          status: 403, 
          headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get and validate ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('widget_tickets')
      .select('*')
      .eq('id', ticketId)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (ticketError || !ticket) {
      console.log('Ticket validation error:', ticketError)
      
      // Log security event for invalid ticket
      await supabase.from('security_events').insert({
        tenant_id: '00000000-0000-0000-0000-000000000000', // Unknown tenant
        event_type: 'invalid_ticket',
        severity: 'high',
        source: 'widget_bootstrap',
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent'),
        ticket_id: ticketId,
        origin: req.headers.get('origin'),
        details: { 
          reason: ticket ? 'ticket_expired_or_used' : 'ticket_not_found',
          error: ticketError?.message 
        }
      });

      // Increment widget metrics
      if (!ticket) {
        await supabase.rpc('increment_widget_metric', {
          _tenant_id: '00000000-0000-0000-0000-000000000000',
          _metric_type: 'bootstrap_failure',
          _increment: 1,
          _metadata: { reason: 'invalid_ticket' }
        });
      }
      
      return new Response(
        JSON.stringify({ error: 'Invalid or expired ticket' }),
        { 
          status: 401, 
          headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate origin matches ticket
    const requestOrigin = origin || new URL(referer!).origin
    if (!requestOrigin.includes(ticket.origin)) {
      console.log('Origin mismatch:', { requestOrigin, ticketOrigin: ticket.origin })
      
      // Log security event for origin mismatch
      await supabase.from('security_events').insert({
        tenant_id: ticket.tenant_id,
        event_type: 'origin_mismatch',
        severity: 'high',
        source: 'widget_bootstrap',
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent'),
        ticket_id: ticketId,
        origin: requestOrigin,
        details: { 
          request_origin: requestOrigin,
          ticket_origin: ticket.origin,
          agent_id: ticket.agent_id
        }
      });

      // Increment widget metrics
      await supabase.rpc('increment_widget_metric', {
        _tenant_id: ticket.tenant_id,
        _metric_type: 'bootstrap_failure',
        _increment: 1,
        _metadata: { reason: 'origin_mismatch' }
      });
      
      return new Response(
        JSON.stringify({ error: 'Origin not allowed' }),
        { 
          status: 403, 
          headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate User-Agent hash
    const userAgent = req.headers.get('user-agent') || ''
    const encoder = new TextEncoder()
    const data = encoder.encode(userAgent)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const ua_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    if (ticket.ua_hash && ticket.ua_hash !== ua_hash) {
      console.log('UA hash mismatch')
      
      // Log security event for user agent mismatch (potential replay attack)
      await supabase.from('security_events').insert({
        tenant_id: ticket.tenant_id,
        event_type: 'replay_attempt',
        severity: 'high',
        source: 'widget_bootstrap',
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent'),
        ticket_id: ticketId,
        origin: requestOrigin,
        details: { 
          expected_ua_hash: ticket.ua_hash,
          received_ua_hash: ua_hash,
          agent_id: ticket.agent_id
        }
      });

      // Increment widget metrics
      await supabase.rpc('increment_widget_metric', {
        _tenant_id: ticket.tenant_id,
        _metric_type: 'bootstrap_failure',
        _increment: 1,
        _metadata: { reason: 'ua_mismatch' }
      });
      
      return new Response(
        JSON.stringify({ error: 'User agent validation failed' }),
        { 
          status: 403, 
          headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } 
        }
      )
    }

    // Mark ticket as used (one-time consumption)
    const { error: updateError } = await supabase
      .from('widget_tickets')
      .update({ used_at: new Date().toISOString() })
      .eq('id', ticketId)

    if (updateError) {
      console.error('Error marking ticket as used:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to consume ticket' }),
        { 
          status: 500, 
          headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, customer_id, agent_type')
      .eq('id', ticket.agent_id)
      .single()

    if (agentError || !agent) {
      return new Response(
        JSON.stringify({ error: 'Agent not found' }),
        { 
          status: 404, 
          headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create or get existing conversation
    let conversationId: string
    const { data: existingConversation } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('tenant_id', ticket.tenant_id)
      .eq('agent_id', ticket.agent_id)
      .eq('user_id', ticket.user_id || '')
      .eq('source', 'widget')
      .eq('status', 'open')
      .maybeSingle()

    if (existingConversation) {
      conversationId = existingConversation.id
    } else {
      const { data: newConversation, error: conversationError } = await supabase
        .from('chat_conversations')
        .insert({
          tenant_id: ticket.tenant_id,
          agent_id: ticket.agent_id,
          user_id: ticket.user_id,
          session_id: null,
          source: 'widget',
          status: 'open',
          meta: {}
        })
        .select('id')
        .single()

      if (conversationError || !newConversation) {
        console.error('Error creating conversation:', conversationError)
        return new Response(
          JSON.stringify({ error: 'Failed to create conversation' }),
          { 
            status: 500, 
            headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } 
          }
        )
      }

      conversationId = newConversation.id
      
      // Log audit event for new conversation started
      await supabase.from('audit_logs').insert({
        customer_id: ticket.tenant_id,
        actor: ticket.user_id || 'anonymous',
        action: 'chat_start',
        target: `conversation:${conversationId}`,
        meta: {
          agent_id: ticket.agent_id,
          source: 'widget',
          origin: requestOrigin,
          ticket_id: ticketId
        }
      });
    }

    // Generate CSRF token and session
    const csrfToken = generateRandomString(32)
    const sessionId = generateRandomString(32)
    
    // Create widget session with 30-minute expiry
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    
    const { data: session, error: sessionError } = await supabase
      .from('widget_sessions')
      .insert({
        id: sessionId,
        tenant_id: ticket.tenant_id,
        user_id: ticket.user_id,
        agent_id: ticket.agent_id,
        conversation_id: conversationId,
        csrf: csrfToken,
        expires_at: expiresAt
      })
      .select('id')
      .single()

    if (sessionError) {
      console.error('Error creating session:', sessionError)
      return new Response(
        JSON.stringify({ error: 'Failed to create session' }),
        { 
          status: 500, 
          headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } 
        }
      )
    }

    // Set session cookie
    const cookieOptions = 'HttpOnly; Secure; SameSite=None; Path=/; Max-Age=1800'
    
    const responseData = {
      conversation_id: conversationId,
      agent_display: agent.agent_type,
      caps: ['text_chat', 'task_execution'],
      csrf: csrfToken
    }

    console.log(`Bootstrap successful for conversation ${conversationId}`)

    // Log successful bootstrap audit event
    await supabase.from('audit_logs').insert({
      customer_id: ticket.tenant_id,
      actor: ticket.user_id || 'anonymous',
      action: 'widget_bootstrap_success',
      target: `session:${sessionId}`,
      meta: {
        conversation_id: conversationId,
        agent_id: ticket.agent_id,
        origin: requestOrigin,
        ticket_id: ticketId
      }
    });

    // Increment success metrics
    await supabase.rpc('increment_widget_metric', {
      _tenant_id: ticket.tenant_id,
      _metric_type: 'bootstrap_success',
      _increment: 1,
      _metadata: { agent_id: ticket.agent_id }
    });

    await supabase.rpc('increment_widget_metric', {
      _tenant_id: ticket.tenant_id,
      _metric_type: 'tickets_consumed',
      _increment: 1,
      _metadata: { agent_id: ticket.agent_id }
    });

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { 
          ...getCorsHeaders(req.headers.get('origin')), 
          'Content-Type': 'application/json',
          'Set-Cookie': `ultaai_sid=${sessionId}; ${cookieOptions}`
        } 
      }
    )
  } catch (error) {
    console.error('Error in handleBootstrap:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } 
      }
    )
  }
}

// Intent classification and parameter extraction
function classifyIntentAndExtractParams(message: string, conversationContext: any = {}) {
  const lowerMessage = message.toLowerCase();
  
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

  return {
    intent: bestMatch.name,
    intentDef: bestMatch,
    params: extractedParams,
    confidence: maxScore / bestMatch.keywords.length
  };
}

async function handleWidgetMessage(req: Request, supabase: any) {
  try {
    // Validate session cookie and CSRF
    const cookieHeader = req.headers.get('cookie')
    const cookies = parseCookies(cookieHeader)
    const sessionId = cookies['ultaai_sid']
    const csrfHeader = req.headers.get('x-csrf')
    
    if (!sessionId || !csrfHeader) {
      // Log security event for missing CSRF token
      await supabase.from('security_events').insert({
        tenant_id: '00000000-0000-0000-0000-000000000000', // Unknown tenant
        event_type: 'csrf_fail',
        severity: 'medium',
        source: 'widget_message',
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent'),
        session_id: sessionId,
        origin: req.headers.get('origin'),
        details: { 
          has_session: !!sessionId,
          has_csrf: !!csrfHeader,
          reason: 'missing_session_or_csrf'
        }
      });

      return new Response(
        JSON.stringify({ error: 'Missing session or CSRF token' }),
        { 
          status: 401, 
          headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get and validate session
    const { data: session, error: sessionError } = await supabase
      .from('widget_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('csrf', csrfHeader)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (sessionError || !session) {
      // Log security event for invalid CSRF
      await supabase.from('security_events').insert({
        tenant_id: session?.tenant_id || '00000000-0000-0000-0000-000000000000',
        event_type: 'csrf_fail',
        severity: 'high',
        source: 'widget_message',
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent'),
        session_id: sessionId,
        origin: req.headers.get('origin'),
        details: { 
          reason: 'invalid_session_or_csrf',
          csrf_provided: !!csrfHeader,
          session_exists: !!session,
          error: sessionError?.message
        }
      });

      return new Response(
        JSON.stringify({ error: 'Invalid session or CSRF token' }),
        { 
          status: 403, 
          headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } 
        }
      )
    }

    // Rate limiting
    const rateLimitKey = `${session.tenant_id}:${session.agent_id}:${sessionId}`
    if (!checkGeneralRateLimit(rateLimitKey)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { 
          status: 429, 
          headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } 
        }
      )
    }

    const body = await req.json()
    const { content } = body
    
    if (!content || typeof content !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message content is required' }),
        { 
          status: 400, 
          headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } 
        }
      )
    }

    // Store user message
    const { error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: session.conversation_id,
        role: 'user',
        content: content
      })

    if (messageError) {
      console.error('Error storing message:', messageError)
      return new Response(
        JSON.stringify({ error: 'Failed to store message' }),
        { 
          status: 500, 
          headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log audit event for message stored
    await supabase.from('audit_logs').insert({
      customer_id: session.tenant_id,
      actor: session.user_id || 'anonymous',
      action: 'message_stored',
      target: `conversation:${session.conversation_id}`,
      meta: {
        role: 'user',
        agent_id: session.agent_id,
        source: 'widget',
        content_length: content.length
      }
    });

    // Get conversation for context
    const { data: conversation } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', session.conversation_id)
      .single()

    // Process message through router
    const routerResult = await processChatRouter(supabase, session.conversation_id!, content, conversation, session.agent_id, session.tenant_id)

    // Log audit event for router decision
    await supabase.from('audit_logs').insert({
      customer_id: session.tenant_id,
      actor: 'system',
      action: 'router_decision',
      target: `conversation:${session.conversation_id}`,
      meta: {
        intent: routerResult.intent,
        action: routerResult.action,
        agent_id: session.agent_id,
        has_task: !!routerResult.task_id
      }
    });

    // Store assistant response
    const { error: responseError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: session.conversation_id,
        role: 'assistant',
        content: routerResult.response
      })

    if (responseError) {
      console.error('Error storing response:', responseError)
    } else {
      // Log audit event for assistant message stored
      await supabase.from('audit_logs').insert({
        customer_id: session.tenant_id,
        actor: 'assistant',
        action: 'message_stored',
        target: `conversation:${session.conversation_id}`,
        meta: {
          role: 'assistant',
          agent_id: session.agent_id,
          source: 'widget',
          content_length: routerResult.response.length,
          intent: routerResult.intent
        }
      });
    }

    // If router created a task, log it
    if (routerResult.task_id) {
      await supabase.from('audit_logs').insert({
        customer_id: session.tenant_id,
        actor: 'system',
        action: 'task_link',
        target: `task:${routerResult.task_id}`,
        meta: {
          conversation_id: session.conversation_id,
          agent_id: session.agent_id,
          intent: routerResult.intent
        }
      });
    }

    return new Response(
      JSON.stringify({
        message: routerResult.response,
        action: routerResult.action,
        intent: routerResult.intent
      }),
      { 
        headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Error in handleWidgetMessage:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } 
      }
    )
  }
}

// Chat router for intent processing
async function processChatRouter(supabase: any, conversationId: string, message: string, conversation: any, agentId: string, tenantId: string) {
  console.log('Processing chat router for widget:', { conversationId, message });

  const conversationContext = conversation?.meta || {};
  
  // Check if we're waiting for a parameter
  if (conversationContext.pending_intent && conversationContext.awaiting_param) {
    const pendingIntent = INTENT_DEFINITIONS.find(i => i.name === conversationContext.pending_intent);
    if (pendingIntent) {
      const awaitingParam = conversationContext.awaiting_param;
      const pendingParams = conversationContext.pending_params || {};
      
      let paramValue = message.trim();
      
      // Store the parameter
      pendingParams[awaitingParam] = paramValue;
      
      // Check if we have all required parameters
      const missingParams = pendingIntent.requiredParams.filter(param => !pendingParams[param]);
      
      if (missingParams.length > 0) {
        // Still missing parameters, ask for next one
        const nextParam = missingParams[0];
        
        // Update conversation context
        await supabase
          .from('chat_conversations')
          .update({
            meta: {
              ...conversationContext,
              pending_params: pendingParams,
              awaiting_param: nextParam
            }
          })
          .eq('id', conversationId);
        
        return {
          response: pendingIntent.clarifyingQuestions[nextParam] || `Please provide ${nextParam}:`,
          action: 'clarify',
          intent: conversationContext.pending_intent,
          missing_param: nextParam
        };
      } else {
        // All parameters collected, execute the batch
        if (pendingIntent.batchName) {
          const executeResult = await executeBatch(supabase, pendingIntent.batchName, pendingParams, agentId, tenantId, conversationId);
          
          // Clear pending intent
          await supabase
            .from('chat_conversations')
            .update({
              meta: {
                ...conversationContext,
                pending_intent: null,
                pending_params: null,
                awaiting_param: null
              }
            })
            .eq('id', conversationId);
          
          return executeResult;
        }
      }
    }
  }

  // Classify new intent
  const classification = classifyIntentAndExtractParams(message, conversationContext);
  
  if (classification.intent === 'general_inquiry') {
    return {
      response: "I can help you with system tasks like installing WordPress, checking system status, restarting services, and more. What would you like me to do?",
      action: 'general_response',
      intent: 'general_inquiry'
    };
  }

  const intent = classification.intentDef;
  if (!intent) {
    return {
      response: "I'm not sure how to help with that. Can you be more specific?",
      action: 'general_response',
      intent: 'unknown'
    };
  }

  // Check if we have all required parameters
  const missingParams = intent.requiredParams.filter(param => !classification.params[param]);
  
  if (missingParams.length > 0) {
    // Store intent and ask for missing parameter
    const nextParam = missingParams[0];
    
    await supabase
      .from('chat_conversations')
      .update({
        meta: {
          ...conversationContext,
          pending_intent: intent.name,
          pending_params: classification.params,
          awaiting_param: nextParam
        }
      })
      .eq('id', conversationId);
    
    return {
      response: intent.clarifyingQuestions[nextParam] || `To proceed, I need to know: ${nextParam}`,
      action: 'clarify',
      intent: intent.name,
      missing_param: nextParam
    };
  }

  // Execute batch if we have all parameters
  if (intent.batchName) {
    return await executeBatch(supabase, intent.batchName, classification.params, agentId, tenantId, conversationId);
  }

  return {
    response: `I understand you want to ${intent.name}, but I don't have a handler for that yet.`,
    action: 'not_implemented',
    intent: intent.name
  };
}

async function executeBatch(supabase: any, batchName: string, params: Record<string, string>, agentId: string, tenantId: string, conversationId: string) {
  try {
    // Get the batch
    const { data: batch, error: batchError } = await supabase
      .from('script_batches')
      .select('id, name, active_version')
      .eq('name', batchName)
      .eq('customer_id', tenantId)
      .single();

    if (batchError || !batch || !batch.active_version) {
      console.error('Batch not found or inactive:', batchError);
      return {
        response: `Sorry, the ${batchName} functionality is not available right now.`,
        action: 'error',
        intent: batchName
      };
    }

    // Start batch run using existing function
    const { data: runResult, error: runError } = await supabase
      .rpc('start_batch_run', {
        _batch_id: batch.id,
        _agent_id: agentId
      });

    if (runError) {
      console.error('Error starting batch run:', runError);
      return {
        response: "I'm having trouble starting that task right now. Please try again later.",
        action: 'error',
        intent: batchName
      };
    }

    if (runResult && runResult.length > 0) {
      const result = runResult[0];
      
      if (result.status === 'started') {
        // Log task queued event
        await supabase
          .from('chat_events')
          .insert({
            conversation_id: conversationId,
            agent_id: agentId,
            type: 'task_queued',
            payload: {
              batch_name: batchName,
              batch_id: batch.id,
              run_id: result.run_id,
              params: params
            },
            ref_id: result.run_id
          });

        return {
          response: `I've started the ${batchName} task for you. I'll let you know when it's complete.`,
          action: 'task_started',
          intent: batchName,
          run_id: result.run_id
        };
      } else {
        return {
          response: `Unable to start the task: ${result.message}`,
          action: 'blocked',
          intent: batchName
        };
      }
    }

    return {
      response: "Task submitted successfully.",
      action: 'task_started',
      intent: batchName
    };
  } catch (error) {
    console.error('Error in executeBatch:', error);
    return {
      response: "There was an error processing your request. Please try again.",
      action: 'error',
      intent: batchName
    };
  }
}

async function handleWidgetClose(req: Request, supabase: any) {
  try {
    // Validate session cookie and CSRF
    const cookieHeader = req.headers.get('cookie')
    const cookies = parseCookies(cookieHeader)
    const sessionId = cookies['ultaai_sid']
    const csrfHeader = req.headers.get('x-csrf')
    
    if (!sessionId || !csrfHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing session or CSRF token' }),
        { 
          status: 401, 
          headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get and validate session
    const { data: session, error: sessionError } = await supabase
      .from('widget_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('csrf', csrfHeader)
      .single()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid session or CSRF token' }),
        { 
          status: 403, 
          headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } 
        }
      )
    }

    // Close conversation
    const { error: closeError } = await supabase
      .from('chat_conversations')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString()
      })
      .eq('id', session.conversation_id)

    if (closeError) {
      console.error('Error closing conversation:', closeError)
    }

    // Rotate session (generate new CSRF token and extend expiry)
    const newCsrfToken = generateRandomString(32)
    const newExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    
    const { error: rotateError } = await supabase
      .from('widget_sessions')
      .update({
        csrf: newCsrfToken,
        expires_at: newExpiresAt
      })
      .eq('id', sessionId)

    if (rotateError) {
      console.error('Error rotating session:', rotateError)
    }

    console.log(`Closed conversation ${session.conversation_id} and rotated session`)

    return new Response(
      JSON.stringify({ 
        message: 'Conversation closed successfully',
        csrf: newCsrfToken
      }),
      { 
        headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Error in handleWidgetClose:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } 
      }
    )
  }
}