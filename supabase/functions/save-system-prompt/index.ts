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

    const { target, content } = await req.json();
    
    if (!target || content === undefined) {
      return new Response(
        JSON.stringify({ error: 'Target and content parameters are required' }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    const filePath = `./_shared/prompts/${target}-system-prompt.md`;
    
    try {
      console.log(`💾 Saving prompt to file: ${filePath}`);
      await Deno.writeTextFile(filePath, content);
      
      console.log(`✅ Successfully saved ${target} prompt (${content.length} chars)`);
      
      return new Response(
        JSON.stringify({
          success: true,
          target,
          message: 'Prompt saved successfully',
          filePath,
          size: content.length
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
      
    } catch (fileError) {
      console.error(`❌ Failed to save prompt file ${filePath}:`, fileError);
      
      return new Response(
        JSON.stringify({
          error: `Failed to save ${target} prompt`,
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
    console.error('❌ Error in save-system-prompt function:', error);
    
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