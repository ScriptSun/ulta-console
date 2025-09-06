import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { EdgeFunctionApiWrapper } from '../_shared/api-wrapper.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BatchDetailsRequest {
  batch_id: string;
}

interface SlimBatchResponse {
  id: string;
  name: string;
  description: string;
  risk: string;
  max_timeout_sec: number;
  inputs_schema: any;
  inputs_defaults: any;
  os_targets: string[];
  key: string;
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

    const { batch_id }: BatchDetailsRequest = await req.json();

    if (!batch_id) {
      return new Response(JSON.stringify({ error: 'Missing batch_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Getting slim batch details for: ${batch_id}`);

    // Get only essential batch fields - no metadata, timestamps, or audit fields
    const batchResult = await api.select('script_batches', `
      id,
      name,
      description,
      risk,
      max_timeout_sec,
      inputs_schema,
      inputs_defaults,
      os_targets,
      key
    `, { 
      eq: { id: batch_id },
      single: true 
    });

    if (!batchResult.success || !batchResult.data) {
      console.error('Error loading batch details:', batchResult.error);
      return new Response(JSON.stringify({ error: 'Batch not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Compress description to max 200 characters
    const compressedDescription = batchResult.data.description && batchResult.data.description.length > 200 
      ? batchResult.data.description.substring(0, 197) + '...'
      : batchResult.data.description;

    // Create slim response with only essential data
    const slimBatch: SlimBatchResponse = {
      id: batchResult.data.id,
      name: batchResult.data.name,
      description: compressedDescription || '',
      risk: batchResult.data.risk,
      max_timeout_sec: batchResult.data.max_timeout_sec,
      inputs_schema: batchResult.data.inputs_schema || {},
      inputs_defaults: batchResult.data.inputs_defaults || {},
      os_targets: batchResult.data.os_targets || [],
      key: batchResult.data.key
    };

    console.log(`Retrieved slim batch details for: ${batchResult.data.name} (compressed from full payload)`);

    return new Response(JSON.stringify({
      batch: slimBatch,
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing slim batch details request:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});