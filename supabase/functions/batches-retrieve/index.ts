import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { EdgeFunctionApiWrapper } from '../_shared/api-wrapper.ts';

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
    // Initialize API wrapper
    const api = new EdgeFunctionApiWrapper();

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

    // Build filters for the search
    const filters: any = {
      or: [
        { key: { ilike: `%${q}%` } },
        { name: { ilike: `%${q}%` } },
        { description: { ilike: `%${q}%` } },
        { key: { in: requiredKeys } }
      ]
    };

    // Add OS filter if specified
    if (os) {
      filters.os_targets = { contains: [os] };
    }

    const batchesResult = await api.select('script_batches', 'id, key, name, description, risk, os_targets', filters, {
      limit: Math.min(limit, 20)
    });

    if (!batchesResult.success) {
      console.error('Error retrieving batches:', batchesResult.error);
      return new Response(JSON.stringify({ error: 'Failed to retrieve batches' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Transform to candidate format
    const candidates: BatchCandidate[] = (batchesResult.data || []).map(batch => ({
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