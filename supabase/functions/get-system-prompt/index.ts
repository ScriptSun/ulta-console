import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { 
  getRouterSystemPrompt,
  getChatSystemPrompt,
  getToolsSystemPrompt,
  getAdviceSystemPrompt,
  getInputFillerSystemPrompt,
  getCommandSuggestionSystemPrompt
} from '../_shared/system-prompt-db.ts';

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

    // Map target to the appropriate function
    const promptFunctions = {
      'router': getRouterSystemPrompt,
      'chat': getChatSystemPrompt,
      'tools': getToolsSystemPrompt,
      'advice': getAdviceSystemPrompt,
      'input-filler': getInputFillerSystemPrompt,
      'command-suggestion': getCommandSuggestionSystemPrompt
    };

    const promptFunction = promptFunctions[target as keyof typeof promptFunctions];
    
    if (!promptFunction) {
      return new Response(
        JSON.stringify({ 
          error: `Invalid target: ${target}`,
          validTargets: Object.keys(promptFunctions)
        }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
    
    try {
      console.log(`📖 Loading ${target} prompt using system-prompt utility`);
      const promptContent = await promptFunction();
      
      console.log(`✅ Successfully loaded ${target} prompt (${promptContent.length} chars)`);
      
      return new Response(
        JSON.stringify({
          success: true,
          target,
          prompt: promptContent.trim(),
          filePath: `./prompts/${target}-system-prompt.md`
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
      
    } catch (loadError) {
      console.error(`❌ Failed to load ${target} prompt:`, loadError);
      
      return new Response(
        JSON.stringify({
          error: `Failed to load ${target} prompt`,
          details: loadError.message
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