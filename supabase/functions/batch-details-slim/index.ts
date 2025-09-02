import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

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
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { batch_id }: BatchDetailsRequest = await req.json();

    if (!batch_id) {
      return new Response(JSON.stringify({ error: 'Missing batch_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Getting slim batch details for: ${batch_id}`);

    // Get only essential batch fields - no metadata, timestamps, or audit fields
    const { data: batch, error: batchError } = await supabase
      .from('script_batches')
      .select(`
        id,
        name,
        description,
        risk,
        max_timeout_sec,
        inputs_schema,
        inputs_defaults,
        os_targets,
        key
      `)
      .eq('id', batch_id)
      .single();

    if (batchError || !batch) {
      console.error('Error loading batch details:', batchError);
      return new Response(JSON.stringify({ error: 'Batch not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Compress description to max 200 characters
    const compressedDescription = batch.description && batch.description.length > 200 
      ? batch.description.substring(0, 197) + '...'
      : batch.description;

    // Create slim response with only essential data
    const slimBatch: SlimBatchResponse = {
      id: batch.id,
      name: batch.name,
      description: compressedDescription || '',
      risk: batch.risk,
      max_timeout_sec: batch.max_timeout_sec,
      inputs_schema: batch.inputs_schema || {},
      inputs_defaults: batch.inputs_defaults || {},
      os_targets: batch.os_targets || [],
      key: batch.key
    };

    console.log(`Retrieved slim batch details for: ${batch.name} (compressed from full payload)`);

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