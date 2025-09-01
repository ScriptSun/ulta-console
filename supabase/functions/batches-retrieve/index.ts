import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RetrieveRequest {
  q: string;
  os?: string;
  limit?: number;
}

interface BatchCandidate {
  id: string;
  key: string;
  name: string;
  summary: string;
  risk: string;
  tags: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { q, os, limit = 12 }: RetrieveRequest = await req.json();

    if (!q) {
      return new Response(JSON.stringify({ error: 'Missing query parameter q' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Retrieving batches for query: ${q}, os: ${os}, limit: ${limit}`);

    // Required keys that should always be included
    const requiredKeys = [
      'wordpress_installer',
      'setup_ssl_letsencrypt', 
      'install_n8n_automation',
      'install_nodejs_pm2',
      'install_docker_compose'
    ];

    // Build query - search by key, name, description and include required keys
    let query = supabase
      .from('script_batches')
      .select('id, key, name, description, risk, os_targets')
      .or(`key.ilike.%${q}%,name.ilike.%${q}%,description.ilike.%${q}%,key.in.(${requiredKeys.join(',')})`)
      .limit(Math.min(limit, 20)); // Cap at 20 to prevent abuse

    // Filter by OS if specified
    if (os) {
      query = query.contains('os_targets', [os]);
    }

    const { data: batches, error: batchesError } = await query;

    if (batchesError) {
      console.error('Error retrieving batches:', batchesError);
      return new Response(JSON.stringify({ error: 'Failed to retrieve batches' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Transform to candidate format
    const candidates: BatchCandidate[] = (batches || []).map(batch => ({
      id: batch.id,
      key: batch.key,
      name: batch.name,
      summary: batch.description || `${batch.name} script`,
      risk: batch.risk || 'medium',
      tags: batch.os_targets || []
    }));

    console.log(`Retrieved ${candidates.length} batch candidates`);

    return new Response(JSON.stringify({
      candidates,
      total: candidates.length,
      query: q,
      os: os || null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing batch retrieval request:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});