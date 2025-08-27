import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { Logger } from "../_shared/logger.ts";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { createCAClient } from "../_shared/ca-client.ts";

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://lfsdqyvvboapsyeauchm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const CA_PRIVATE_KEY_PATH = Deno.env.get('CA_PRIVATE_KEY_PATH') || '';

// Initialize Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Initialize CA client
const caClient = createCAClient();

// Routes handler
const handleRoutes = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const method = req.method;
  const path = url.pathname;

  Logger.info('Request received', { method, path, userAgent: req.headers.get('user-agent') });

  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

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
      case '/certificates':
        return handleCertificates(req, method);
      default:
        return errorResponse('API endpoint not found', 404);
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
  return jsonResponse({ message: 'Agents endpoint', method });
};

const handleTasks = async (req: Request, method: string): Promise<Response> => {
  // Implement task management logic
  return jsonResponse({ message: 'Tasks endpoint', method });
};

const handleApiKeys = async (req: Request, method: string): Promise<Response> => {
  // Implement API key management logic
  return jsonResponse({ message: 'API Keys endpoint', method });
};

const handleQuotas = async (req: Request, method: string): Promise<Response> => {
  // Implement quota management logic
  return jsonResponse({ message: 'Quotas endpoint', method });
};

const handleSecurity = async (req: Request, method: string): Promise<Response> => {
  // Implement security monitoring logic
  return jsonResponse({ message: 'Security endpoint', method });
};

// Certificate management handler
const handleCertificates = async (req: Request, method: string): Promise<Response> => {
  try {
    if (method === 'POST') {
      const body = await req.json();
      const { action, agent_id, certificate_id, reason, revoked_by } = body;

      switch (action) {
        case 'issue': {
          if (!agent_id) {
            return errorResponse('agent_id is required', 400);
          }
          const cert = await caClient.issueClientCert(agent_id);
          return jsonResponse({
            success: true,
            message: 'Certificate issued successfully',
            data: cert
          });
        }

        case 'revoke': {
          if (!certificate_id) {
            return errorResponse('certificate_id is required', 400);
          }
          await caClient.revokeCertificate(certificate_id, reason, revoked_by);
          return jsonResponse({
            success: true,
            message: 'Certificate revoked successfully'
          });
        }

        default:
          return errorResponse('Invalid action', 400);
      }
    }

    if (method === 'GET') {
      // Get certificates or CRL
      const url = new URL(req.url);
      const type = url.searchParams.get('type');

      if (type === 'crl') {
        const crl = await caClient.getCRL();
        return jsonResponse({
          success: true,
          data: crl
        });
      }

      if (type === 'ca') {
        const ca = await caClient.getCACert();
        return jsonResponse({
          success: true,
          data: ca
        });
      }

      // Default: get all certificates
      const { data: certificates, error } = await supabase
        .from('certificates')
        .select('id, agent_id, fingerprint_sha256, issued_at, expires_at, revoked_at')
        .order('issued_at', { ascending: false });

      if (error) {
        Logger.error('Failed to fetch certificates', error);
        return errorResponse('Failed to fetch certificates', 500);
      }

      return jsonResponse({
        success: true,
        data: certificates || []
      });
    }

    return errorResponse('Method not allowed', 405);
    
  } catch (error) {
    Logger.error('Certificate handler error', error);
    return errorResponse('Internal server error', 500);
  }
};

// Start the server
serve(async (req) => {
  try {
    return await handleRoutes(req);
  } catch (error) {
    Logger.error('Server error', error);
    return errorResponse('Server error', 500);
  }
});

Logger.info('UltaAI Backend service started', {
  service: 'UltaAI Backend',
  version: '1.0.0',
  timestamp: new Date().toISOString()
});