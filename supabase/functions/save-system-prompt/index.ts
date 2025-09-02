import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { target, content } = await req.json()

    if (!target || content === undefined) {
      throw new Error('Missing target or content parameter')
    }

    // Validate target
    const validTargets = ['router', 'chat', 'tools', 'advice', 'input-filler', 'command-suggestion']
    if (!validTargets.includes(target)) {
      throw new Error(`Invalid target. Must be one of: ${validTargets.join(', ')}`)
    }

    // Create the file path
    const filePath = `./prompts/${target}-system-prompt.md`

    // Write the content to the file
    await Deno.writeTextFile(filePath, content)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Prompt ${target} saved successfully`,
        filePath 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error saving system prompt:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to save system prompt' 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})