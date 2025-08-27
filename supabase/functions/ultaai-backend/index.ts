import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://lfsdqyvvboapsyeauchm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const CA_PRIVATE_KEY_PATH = Deno.env.get('CA_PRIVATE_KEY_PATH') || '';

// Initialize Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Structured JSON logger
class Logger {
  static info(message: string, meta?: any) {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }

  static error(message: string, error?: any, meta?: any) {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.message || error,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }

  static warn(message: string, meta?: any) {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }

  static debug(message: string, meta?: any) {
    console.debug(JSON.stringify({
      level: 'debug',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Routes handler
const handleRoutes = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const method = req.method;
  const path = url.pathname;

  Logger.info('Request received', { method, path, userAgent: req.headers.get('user-agent') });

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health endpoint
  if (path === '/health' && method === 'GET') {
    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'UltaAI Backend',
      version: '1.0.0',
      supabase: {
        connected: !!SUPABASE_SERVICE_ROLE_KEY,
        url: SUPABASE_URL
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // API routes
  if (path.startsWith('/api/')) {
    return handleApiRoutes(req, path.replace('/api', ''));
  }

  // WebSocket upgrade
  if (req.headers.get('upgrade') === 'websocket') {
    return handleWebSocket(req);
  }

  // 404 for unknown routes
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
};

// API routes handler
const handleApiRoutes = async (req: Request, path: string): Promise<Response> => {
  const method = req.method;

  try {
    switch (path) {
      case '/agents':
        return handleAgents(req, method);
      case '/tasks':
        return handleTasks(req, method);
      case '/keys':
        return handleApiKeys(req, method);
      case '/quotas':
        return handleQuotas(req, method);
      case '/security':
        return handleSecurity(req, method);
      default:
        return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    Logger.error('API route error', error, { path, method });
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

// WebSocket handler
const handleWebSocket = (req: Request): Response => {
  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.onopen = () => {
    Logger.info('WebSocket connection established');
    socket.send(JSON.stringify({
      type: 'connection',
      status: 'connected',
      timestamp: new Date().toISOString()
    }));
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      Logger.info('WebSocket message received', { type: data.type });
      
      // Echo back for now - implement specific handlers as needed
      socket.send(JSON.stringify({
        type: 'response',
        originalType: data.type,
        timestamp: new Date().toISOString(),
        data: data
      }));
    } catch (error) {
      Logger.error('WebSocket message error', error);
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      }));
    }
  };

  socket.onclose = (event) => {
    Logger.info('WebSocket connection closed', { code: event.code, reason: event.reason });
  };

  socket.onerror = (error) => {
    Logger.error('WebSocket error', error);
  };

  return response;
};

// Placeholder API handlers - implement as needed
const handleAgents = async (req: Request, method: string): Promise<Response> => {
  // Implement agent management logic
  return new Response(JSON.stringify({ message: 'Agents endpoint', method }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
};

const handleTasks = async (req: Request, method: string): Promise<Response> => {
  // Implement task management logic
  return new Response(JSON.stringify({ message: 'Tasks endpoint', method }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
};

const handleApiKeys = async (req: Request, method: string): Promise<Response> => {
  // Implement API key management logic
  return new Response(JSON.stringify({ message: 'API Keys endpoint', method }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
};

const handleQuotas = async (req: Request, method: string): Promise<Response> => {
  // Implement quota management logic
  return new Response(JSON.stringify({ message: 'Quotas endpoint', method }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
};

const handleSecurity = async (req: Request, method: string): Promise<Response> => {
  // Implement security monitoring logic
  return new Response(JSON.stringify({ message: 'Security endpoint', method }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
};

// Start the server
serve(async (req) => {
  try {
    return await handleRoutes(req);
  } catch (error) {
    Logger.error('Server error', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

Logger.info('UltaAI Backend service started', {
  service: 'UltaAI Backend',
  version: '1.0.0',
  timestamp: new Date().toISOString()
});