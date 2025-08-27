import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'UltaAI Backend Health',
      version: '1.0.0',
      uptime: Deno.memoryUsage(),
      environment: {
        supabaseUrl: Deno.env.get('SUPABASE_URL') ? 'configured' : 'missing',
        serviceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'configured' : 'missing',
        caPrivateKeyPath: Deno.env.get('CA_PRIVATE_KEY_PATH') ? 'configured' : 'missing'
      }
    };

    return new Response(JSON.stringify(healthData, null, 2), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    });
  }

  return new Response('Method not allowed', { 
    status: 405, 
    headers: corsHeaders 
  });
});