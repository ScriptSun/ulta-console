// CORS configuration for UltaAI Backend

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Max-Age': '86400', // 24 hours
};

export const handleCors = (req: Request): Response | null => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }
  return null;
};

export const jsonResponse = (data: any, status = 200, additionalHeaders?: Record<string, string>) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...additionalHeaders
    }
  });
};

export const errorResponse = (message: string, status = 500, details?: any) => {
  return jsonResponse({
    error: message,
    status,
    timestamp: new Date().toISOString(),
    ...(details && { details })
  }, status);
};