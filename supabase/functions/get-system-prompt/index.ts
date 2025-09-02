import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    const { target } = await req.json();
    
    if (!target) {
      return new Response(
        JSON.stringify({ error: 'Target parameter is required' }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    const filePath = `../_shared/prompts/${target}-system-prompt.md`;
    
    try {
      console.log(`📖 Reading prompt file: ${filePath}`);
      const promptContent = await Deno.readTextFile(filePath);
      
      console.log(`✅ Successfully loaded ${target} prompt (${promptContent.length} chars)`);
      
      return new Response(
        JSON.stringify({
          success: true,
          target,
          prompt: promptContent.trim(),
          filePath
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
      
    } catch (fileError) {
      console.error(`❌ Failed to load ${target} prompt:`, fileError);
      
      return new Response(
        JSON.stringify({
          error: `Failed to load ${target} prompt`,
          details: fileError.message,
          filePath
        }),
        { 
          status: 500, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

  } catch (error) {
    console.error('❌ Error in get-system-prompt function:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});