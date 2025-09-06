import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'
import { corsHeaders, cors } from '../_shared/cors.ts'
import { Logger } from '../_shared/logger.ts'

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
    // Remove the function name from the path (e.g., /script-batches/batchId/variants -> /batchId/variants)
    const cleanPath = pathname.replace(/^\/[^\/]+\//, '/')
    const pathParts = cleanPath.split('/').filter(Boolean)
    
    Logger.info('Script batches request', { 
      method: req.method, 
      fullUrl: req.url, 
      pathname, 
      cleanPath,
      pathParts,
      pathPartsLength: pathParts.length 
    })
    
    // The pathname should be like: /batchId/variants or /batchId/variants/os/action
    if (req.method === 'GET' && pathParts.length === 1 && pathParts[0] === 'health') {
      // Health check endpoint: GET /health
      Logger.info('Health check requested')
      return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } else if (req.method === 'GET' && pathParts.length === 2 && pathParts[1] === 'variants') {
      // Get batch variants: GET /batchId/variants
      const batchId = pathParts[0]
      Logger.info('Handling GET variants', { batchId })
      return await handleGetVariants(req, batchId)
    } else if (req.method === 'POST' && pathParts.length === 2 && pathParts[1] === 'variants') {
      // Create or update variant: POST /batchId/variants
      const batchId = pathParts[0]
      Logger.info('Handling POST variants', { batchId })
      return await handleCreateVariant(req, batchId)
    } else if (req.method === 'POST' && pathParts.length === 4 && pathParts[1] === 'variants' && pathParts[3] === 'versions') {
      // Create version for OS variant: POST /batchId/variants/os/versions
      const batchId = pathParts[0]
      const os = pathParts[2]
      Logger.info('Handling POST variant version', { batchId, os })
      return await handleCreateVariantVersion(req, batchId, os)
    } else if (req.method === 'POST' && pathParts.length === 4 && pathParts[1] === 'variants' && pathParts[3] === 'activate') {
      // Activate variant version: POST /batchId/variants/os/activate
      const batchId = pathParts[0]
      const os = pathParts[2]
      Logger.info('Handling POST activate variant', { batchId, os })
      return await handleActivateVariant(req, batchId, os)
    } else if (req.method === 'POST' && pathParts.length === 2 && pathParts[1] === 'quick-run') {
      // Quick run batch: POST /batchId/quick-run
      const batchId = pathParts[0]
      Logger.info('Handling POST quick run', { batchId })
      return await handleQuickRun(req, batchId)
    } else if (req.method === 'POST' && pathParts.length === 2 && pathParts[1] === 'start-run') {
      // Start batch run with concurrency check: POST /batchId/start-run
      const batchId = pathParts[0]
      Logger.info('Handling POST start run', { batchId })
      return await handleStartRun(req, batchId)
    } else if (req.method === 'PUT' && pathParts.length === 2 && pathParts[0] === 'runs') {
      // Complete batch run: PUT /runs/runId
      const runId = pathParts[1]
      Logger.info('Handling PUT complete run', { runId })
      return await handleCompleteRun(req, runId)
    } else if (req.method === 'GET' && pathParts.length === 2 && pathParts[1] === 'runs') {
      // Get batch runs: GET /batchId/runs
      const batchId = pathParts[0]
      Logger.info('Handling GET batch runs', { batchId })
      return await handleGetRuns(req, batchId)
    }
    
    Logger.warn('No matching route found', { method: req.method, pathParts })
    return new Response('Not found', { status: 404, headers: corsHeaders })
  } catch (error) {
    Logger.error('Script batches error', { error: error.message })
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
      .select(`
        id,
        batch_id,
        os,
        version,
        active,
        sha256,
        created_at,
        updated_at
      `)
      .eq('batch_id', batchId)
      .order('os')
      .order('version', { ascending: false })

    if (error) {
      Logger.error('Failed to get variants', { error, batchId })
      return new Response('Failed to get variants', { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ variants }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    Logger.error('Get variants error', { error: error.message, batchId })
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

    // Calculate SHA256 and size using Web Crypto API
    const encoder = new TextEncoder()
    const data = encoder.encode(source)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const sha256 = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    const size_bytes = data.length

    // Get next version for this OS
    const { data: nextVersionData, error: versionError } = await supabase
      .rpc('get_next_variant_version', { _batch_id: batchId, _os: os })

    if (versionError) {
      Logger.error('Failed to get next version', { error: versionError, batchId, os })
      return new Response('Failed to get next version', { status: 500, headers: corsHeaders })
    }

    const version = nextVersionData as number

    // Get user ID from auth header
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      Logger.error('Auth error in create variant', { error: authError })
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

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
        active: false,
        updated_by: user.id
      })
      .select()
      .single()

    if (error) {
      Logger.error('Failed to create variant', { error, batchId, os })
      return new Response('Failed to create variant', { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ variant }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    Logger.error('Create variant error', { error: error.message, batchId })
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

    // Calculate SHA256 and size using Web Crypto API
    const encoder = new TextEncoder()
    const data = encoder.encode(source)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const sha256 = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    const size_bytes = data.length

    // Get next version for this OS
    const { data: nextVersionData, error: versionError } = await supabase
      .rpc('get_next_variant_version', { _batch_id: batchId, _os: os })

    if (versionError) {
      Logger.error('Failed to get next version', { error: versionError, batchId, os })
      return new Response('Failed to get next version', { status: 500, headers: corsHeaders })
    }

    const version = nextVersionData as number

    // Get user ID from auth header
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      Logger.error('Auth error in create variant version', { error: authError })
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

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
        active: false,
        updated_by: user.id
      })
      .select()
      .single()

    if (error) {
      Logger.error('Failed to create variant version', { error, batchId, os })
      return new Response('Failed to create variant version', { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ variant }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    Logger.error('Create variant version error', { error: error.message, batchId, os })
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
      Logger.error('Failed to activate variant', { error, batchId, os, version })
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
    Logger.error('Activate variant error', { error: error.message, batchId, os })
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

    // Get the batch details - only essential fields
    const { data: batch, error: batchError } = await supabase
      .from('script_batches')
      .select(`
        id,
        name,
        customer_id,
        inputs_schema,
        max_timeout_sec,
        active_version
      `)
      .eq('id', batchId)
      .maybeSingle()

    if (batchError || !batch) {
      Logger.error('Batch not found', { error: batchError, batchId })
      return new Response('Batch not found', { status: 404, headers: corsHeaders })
    }

    // Get the active variant for the agent's OS
    const { data: activeVariant, error: variantError } = await supabase
      .from('script_batch_variants')
      .select(`
        id,
        os,
        version,
        active,
        sha256,
        updated_at
      `)
      .eq('batch_id', batchId)
      .eq('os', agentOs)
      .eq('active', true)
      .single()

    if (variantError || !activeVariant) {
      Logger.error('No active variant found for OS', { error: variantError, batchId, agentOs })
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

    Logger.info('Quick run prepared', { 
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
    Logger.error('Quick run error', { error: error.message, batchId })
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
}

async function handleStartRun(req: Request, batchId: string) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { agentId, inputs = {}, agentOs = 'ubuntu', agentOsVersion = '22.04' } = body

    if (!agentId) {
      return new Response('Missing agentId', { status: 400, headers: corsHeaders })
    }

    // Check concurrency limits and start the run
    const { data: runResult, error } = await supabase
      .rpc('start_batch_run', { 
        _batch_id: batchId, 
        _agent_id: agentId 
      })

    if (error) {
      Logger.error('Failed to start batch run', { error, batchId, agentId })
      return new Response('Failed to start batch run', { status: 500, headers: corsHeaders })
    }

    const result = runResult[0]
    if (result.status === 'blocked') {
      Logger.info('Batch run blocked', { batchId, agentId, reason: result.message })
      return new Response(JSON.stringify({
        success: false,
        status: 'blocked',
        message: result.message
      }), {
        status: 429, // Too Many Requests
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get batch details for execution payload - only needed fields
    const { data: batch, error: batchError } = await supabase
      .from('script_batches')
      .select(`
        id,
        name,
        inputs_schema,
        max_timeout_sec
      `)
      .eq('id', batchId)
      .maybeSingle()

    if (batchError || !batch) {
      Logger.error('Batch not found', { error: batchError, batchId })
      return new Response('Batch not found', { status: 404, headers: corsHeaders })
    }

    // Get the active variant for the agent's OS - only essential fields
    const { data: activeVariant, error: variantError } = await supabase
      .from('script_batch_variants')
      .select(`
        id,
        os,
        version,
        sha256,
        source,
        min_os_version
      `)
      .eq('batch_id', batchId)
      .eq('os', agentOs)
      .eq('active', true)
      .maybeSingle()

    if (variantError || !activeVariant) {
      // Mark the run as failed and return error
      await supabase.rpc('complete_batch_run', {
        _run_id: result.run_id,
        _status: 'failed',
        _raw_stdout: null,
        _raw_stderr: `No active ${agentOs} variant available`
      })
      
      Logger.error('No active variant found for OS', { error: variantError, batchId, agentOs })
      return new Response(`No active ${agentOs} variant available`, { status: 400, headers: corsHeaders })
    }

    // Validate inputs and prepare execution payload
    let validatedInputs = inputs
    if (batch.inputs_schema) {
      // TODO: Add input validation here if needed
    }

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

    const executionPayload = {
      run_id: result.run_id,
      batch_id: batchId,
      batch_name: batch.name,
      inputs: validatedInputs,
      script: activeVariant.source,
      sha256: activeVariant.sha256,
      timeout_sec: batch.max_timeout_sec || 300,
      variant: {
        os: activeVariant.os,
        version: activeVariant.version,
        min_os_version: activeVariant.min_os_version
      },
      env_vars: envVars
    }

    Logger.info('Batch run started', { 
      runId: result.run_id,
      batchId, 
      agentId,
      agentOs, 
      variant: `${activeVariant.os} v${activeVariant.version}` 
    })

    return new Response(JSON.stringify({
      success: true,
      status: 'started',
      message: result.message,
      run_id: result.run_id,
      execution: executionPayload
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    Logger.error('Start run error', { error: error.message, batchId })
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
}

async function handleCompleteRun(req: Request, runId: string) {
  try {
    const body = await req.json()
    const { status, stdout, stderr } = body

    if (!status) {
      return new Response('Missing status', { status: 400, headers: corsHeaders })
    }

    // Complete the batch run
    const { data: success, error } = await supabase
      .rpc('complete_batch_run', {
        _run_id: runId,
        _status: status,
        _raw_stdout: stdout || null,
        _raw_stderr: stderr || null
      })

    if (error) {
      Logger.error('Failed to complete batch run', { error, runId })
      return new Response('Failed to complete batch run', { status: 500, headers: corsHeaders })
    }

    if (!success) {
      return new Response('Run not found', { status: 404, headers: corsHeaders })
    }

    Logger.info('Batch run completed', { runId, status })

    return new Response(JSON.stringify({
      success: true,
      message: 'Run completed successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    Logger.error('Complete run error', { error: error.message, runId })
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
}

async function handleGetRuns(req: Request, batchId: string) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Get batch runs with agent information
    const { data: runs, error } = await supabase
      .from('batch_runs')
      .select(`
        *,
        agents!inner(id, hostname)
      `)
      .eq('batch_id', batchId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      Logger.error('Failed to get batch runs', { error, batchId })
      return new Response('Failed to get batch runs', { status: 500, headers: corsHeaders })
    }

    // Parse contracts and format response
    const formattedRuns = runs.map(run => ({
      ...run,
      agent: run.agents,
      contract_status: run.contract?.status || null,
      contract_message: run.contract?.message || null,
      contract_metrics: run.contract?.metrics || null
    }))

    return new Response(JSON.stringify({
      runs: formattedRuns,
      total: runs.length
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    Logger.error('Get runs error', { error: error.message, batchId })
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
}