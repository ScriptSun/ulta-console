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
    const { target } = await req.json()

    if (!target) {
      throw new Error('Missing target parameter')
    }

    // Validate target
    const validTargets = ['router', 'chat', 'tools', 'advice', 'input-filler', 'command-suggestion']
    if (!validTargets.includes(target)) {
      throw new Error(`Invalid target. Must be one of: ${validTargets.join(', ')}`)
    }

    // Create the file path
    const filePath = `./prompts/${target}-system-prompt.md`

    let content = ''
    try {
      // Try to read the file
      content = await Deno.readTextFile(filePath)
    } catch (error) {
      // If file doesn't exist, return empty content
      console.warn(`Prompt file not found: ${filePath}`, error.message)
      content = `# ${target} System Prompt\n\nPrompt content not yet defined.`
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        target,
        prompt: content,
        filePath 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error loading system prompt:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to load system prompt' 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})