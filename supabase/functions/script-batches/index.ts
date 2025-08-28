import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'
import { corsHeaders, cors } from '../_shared/cors.ts'
import { logger } from '../_shared/logger.ts'
import { createHash } from 'https://deno.land/std@0.177.0/crypto/mod.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface BatchVariant {
  id: string;
  batch_id: string;
  os: string;
  version: number;
  sha256: string;
  size_bytes: number;
  source: string;
  notes?: string;
  active: boolean;
  min_os_version?: string;
  created_at: string;
  created_by: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { pathname, searchParams } = new URL(req.url)
    const pathParts = pathname.split('/').filter(Boolean)
    
    logger.info('Script batches request', { method: req.method, pathname, pathParts })
    
    if (req.method === 'GET' && pathParts.length === 2 && pathParts[1] === 'variants') {
      // Get batch variants
      const batchId = pathParts[0]
      return await handleGetVariants(req, batchId)
    } else if (req.method === 'POST' && pathParts.length === 2 && pathParts[1] === 'variants') {
      // Create or update variant
      const batchId = pathParts[0]
      return await handleCreateVariant(req, batchId)
    } else if (req.method === 'POST' && pathParts.length === 4 && pathParts[1] === 'variants' && pathParts[3] === 'versions') {
      // Create version for OS variant
      const batchId = pathParts[0]
      const os = pathParts[2]
      return await handleCreateVariantVersion(req, batchId, os)
    } else if (req.method === 'POST' && pathParts.length === 4 && pathParts[1] === 'variants' && pathParts[3] === 'activate') {
      // Activate variant version
      const batchId = pathParts[0]
      const os = pathParts[2]
      return await handleActivateVariant(req, batchId, os)
    } else if (req.method === 'POST' && pathParts.length === 2 && pathParts[1] === 'quick-run') {
      // Quick run batch
      const batchId = pathParts[0]
      return await handleQuickRun(req, batchId)
    }
    
    return new Response('Not found', { status: 404, headers: corsHeaders })
  } catch (error) {
    logger.error('Script batches error', { error: error.message })
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})

async function handleGetVariants(req: Request, batchId: string) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  try {
    // Get all variants for the batch
    const { data: variants, error } = await supabase
      .from('script_batch_variants')
      .select('*')
      .eq('batch_id', batchId)
      .order('os')
      .order('version', { ascending: false })

    if (error) {
      logger.error('Failed to get variants', { error, batchId })
      return new Response('Failed to get variants', { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ variants }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    logger.error('Get variants error', { error: error.message, batchId })
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
}

async function handleCreateVariant(req: Request, batchId: string) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { os, source, notes, min_os_version } = body

    if (!os || !source) {
      return new Response('Missing required fields', { status: 400, headers: corsHeaders })
    }

    // Calculate SHA256 and size
    const encoder = new TextEncoder()
    const data = encoder.encode(source)
    const hashBuffer = await createHash('sha256').update(data).digest()
    const sha256 = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    const size_bytes = data.length

    // Get next version for this OS
    const { data: nextVersionData, error: versionError } = await supabase
      .rpc('get_next_variant_version', { _batch_id: batchId, _os: os })

    if (versionError) {
      logger.error('Failed to get next version', { error: versionError, batchId, os })
      return new Response('Failed to get next version', { status: 500, headers: corsHeaders })
    }

    const version = nextVersionData as number

    // Create the variant
    const { data: variant, error } = await supabase
      .from('script_batch_variants')
      .insert({
        batch_id: batchId,
        os,
        version,
        sha256,
        size_bytes,
        source,
        notes,
        min_os_version,
        active: false
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create variant', { error, batchId, os })
      return new Response('Failed to create variant', { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ variant }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    logger.error('Create variant error', { error: error.message, batchId })
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
}

async function handleCreateVariantVersion(req: Request, batchId: string, os: string) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { source, notes, min_os_version } = body

    if (!source) {
      return new Response('Missing source', { status: 400, headers: corsHeaders })
    }

    // Calculate SHA256 and size
    const encoder = new TextEncoder()
    const data = encoder.encode(source)
    const hashBuffer = await createHash('sha256').update(data).digest()
    const sha256 = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    const size_bytes = data.length

    // Get next version for this OS
    const { data: nextVersionData, error: versionError } = await supabase
      .rpc('get_next_variant_version', { _batch_id: batchId, _os: os })

    if (versionError) {
      logger.error('Failed to get next version', { error: versionError, batchId, os })
      return new Response('Failed to get next version', { status: 500, headers: corsHeaders })
    }

    const version = nextVersionData as number

    // Create the version
    const { data: variant, error } = await supabase
      .from('script_batch_variants')
      .insert({
        batch_id: batchId,
        os,
        version,
        sha256,
        size_bytes,
        source,
        notes,
        min_os_version,
        active: false
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create variant version', { error, batchId, os })
      return new Response('Failed to create variant version', { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ variant }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    logger.error('Create variant version error', { error: error.message, batchId, os })
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
}

async function handleActivateVariant(req: Request, batchId: string, os: string) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { version } = body

    if (!version) {
      return new Response('Missing version', { status: 400, headers: corsHeaders })
    }

    // Get user ID from auth header
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response('Invalid token', { status: 401, headers: corsHeaders })
    }

    // Activate the variant version
    const { data: success, error } = await supabase
      .rpc('activate_variant_version', { 
        _batch_id: batchId, 
        _os: os, 
        _version: version, 
        _user_id: user.id 
      })

    if (error) {
      logger.error('Failed to activate variant', { error, batchId, os, version })
      return new Response('Failed to activate variant', { status: 500, headers: corsHeaders })
    }

    if (!success) {
      return new Response('Activation failed', { status: 400, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    logger.error('Activate variant error', { error: error.message, batchId, os })
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
}

async function handleQuickRun(req: Request, batchId: string) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { inputs = {}, agentOs = 'ubuntu', agentOsVersion = '22.04' } = body

    // Get the batch details
    const { data: batch, error: batchError } = await supabase
      .from('script_batches')
      .select('*')
      .eq('id', batchId)
      .single()

    if (batchError || !batch) {
      logger.error('Batch not found', { error: batchError, batchId })
      return new Response('Batch not found', { status: 404, headers: corsHeaders })
    }

    // Get the active variant for the agent's OS
    const { data: activeVariant, error: variantError } = await supabase
      .from('script_batch_variants')
      .select('*')
      .eq('batch_id', batchId)
      .eq('os', agentOs)
      .eq('active', true)
      .single()

    if (variantError || !activeVariant) {
      logger.error('No active variant found for OS', { error: variantError, batchId, agentOs })
      return new Response(`No active ${agentOs} variant available`, { status: 400, headers: corsHeaders })
    }

    // Check minimum OS version if specified
    if (activeVariant.min_os_version) {
      // Simple semantic version comparison (assumes format like "22.04")
      const compareVersions = (a: string, b: string) => {
        const aParts = a.split('.').map(Number)
        const bParts = b.split('.').map(Number)
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const aPart = aParts[i] || 0
          const bPart = bParts[i] || 0
          if (aPart !== bPart) return aPart - bPart
        }
        return 0
      }

      if (compareVersions(agentOsVersion, activeVariant.min_os_version) < 0) {
        return new Response(
          `${agentOs} ${agentOsVersion} is below minimum required version ${activeVariant.min_os_version}`,
          { status: 400, headers: corsHeaders }
        )
      }
    }

    // Validate inputs if schema exists
    let validatedInputs = inputs
    if (batch.inputs_schema) {
      // TODO: Add input validation here if needed
    }

    // Get user ID from auth header
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response('Invalid token', { status: 401, headers: corsHeaders })
    }

    // Get the script source from the active variant
    const scriptSource = activeVariant.source

    // Map inputs to environment variables
    const envVars: Record<string, string> = {}
    if (validatedInputs && typeof validatedInputs === 'object') {
      Object.keys(validatedInputs).forEach(key => {
        const envKey = key.toUpperCase()
        const value = validatedInputs[key]
        if (value !== null && value !== undefined) {
          envVars[envKey] = String(value)
        }
      })
    }

    // Return the execution payload with variant information
    const executionPayload = {
      batch_id: batchId,
      batch_name: batch.name,
      inputs: validatedInputs,
      script: scriptSource,
      sha256: activeVariant.sha256,
      timeout_sec: batch.max_timeout_sec || 300,
      variant: {
        os: activeVariant.os,
        version: activeVariant.version,
        min_os_version: activeVariant.min_os_version
      },
      env_vars: envVars
    }

    logger.info('Quick run prepared', { 
      batchId, 
      agentOs, 
      variant: `${activeVariant.os} v${activeVariant.version}` 
    })

    return new Response(JSON.stringify({
      success: true,
      message: 'Batch prepared for execution',
      execution: executionPayload
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    logger.error('Quick run error', { error: error.message, batchId })
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
}