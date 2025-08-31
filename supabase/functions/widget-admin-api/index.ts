// Widget Admin API - CRUD endpoints for widget configuration  
// Now uses JWT authentication via Supabase

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'

console.log('Widget Admin API function loaded')

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Generate secure random secret for HMAC signing
function generateWidgetSecret(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// Create HMAC SHA256 hash
async function createHmacHash(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return Array.from(new Uint8Array(signature), byte => 
    byte.toString(16).padStart(2, '0')
  ).join('')
}

// Validate HMAC signature
async function validateHmacSignature(userId: string, timestamp: string, signature: string, secret: string): Promise<boolean> {
  try {
    const data = `${userId}:${timestamp}`
    const expectedSignature = await createHmacHash(data, secret)
    return expectedSignature === signature
  } catch {
    return false
  }
}

interface Widget {
  id?: string
  site_key?: string
  name: string
  allowed_domains: string[]
  theme: {
    color_primary?: string
    text_color?: string
    logo_url?: string
    welcome_text?: string
  }
  customer_id?: string
  secret_hash?: string
  created_at?: string
  updated_at?: string
}

// Validate domain format (must be exact origins like https://client.whmcs.com)
function validateDomains(domains: string[]): string | null {
  const urlRegex = /^https?:\/\/[a-zA-Z0-9][a-zA-Z0-9\-._]*[a-zA-Z0-9]+(:\d+)?$/
  
  for (const domain of domains) {
    // Reject wildcards explicitly
    if (domain.includes('*') || domain.includes('//') || domain.endsWith('/*')) {
      return `Wildcard domains not allowed: "${domain}". Use exact origins like https://client.whmcs.com`
    }
    
    if (!urlRegex.test(domain)) {
      return `Invalid domain format: "${domain}". Must be exact origins like https://client.whmcs.com`
    }
  }
  return null
}

// Rate limiting function using rate_limit_buckets table
async function checkRateLimit(ip: string, endpoint: string, limit: number = 60): Promise<{ allowed: boolean, retryAfter?: number }> {
  const bucketKey = `${ip}:${endpoint}`
  const windowStart = new Date()
  windowStart.setSeconds(0, 0) // Round to start of minute
  
  try {
    // Get or create rate limit bucket for this minute
    const { data: bucket, error: selectError } = await supabase
      .from('rate_limit_buckets')
      .select('count, window_start')
      .eq('bucket_key', bucketKey)
      .eq('bucket_type', 'api_endpoint')
      .eq('window_start', windowStart.toISOString())
      .single()

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Rate limit check error:', selectError)
      return { allowed: true } // Allow on error to avoid blocking legitimate requests
    }

    if (!bucket) {
      // Create new bucket
      await supabase
        .from('rate_limit_buckets')
        .insert({
          bucket_key: bucketKey,
          bucket_type: 'api_endpoint',
          window_start: windowStart.toISOString(),
          count: 1
        })
      return { allowed: true }
    }

    if (bucket.count >= limit) {
      const nextWindow = new Date(windowStart)
      nextWindow.setMinutes(nextWindow.getMinutes() + 1)
      const retryAfter = Math.ceil((nextWindow.getTime() - Date.now()) / 1000)
      return { allowed: false, retryAfter }
    }

    // Increment counter
    await supabase
      .from('rate_limit_buckets')
      .update({ count: bucket.count + 1 })
      .eq('bucket_key', bucketKey)
      .eq('bucket_type', 'api_endpoint')
      .eq('window_start', windowStart.toISOString())

    return { allowed: true }
  } catch (error) {
    console.error('Rate limit error:', error)
    return { allowed: true } // Allow on error
  }
}

// Log audit events for widget changes
async function logAuditEvent(customerId: string, action: string, widgetId: string, changes: any, apiKeyId?: string) {
  try {
    await supabase
      .from('audit_logs')
      .insert({
        customer_id: customerId,
        actor: apiKeyId ? `api_key:${apiKeyId}` : 'system',
        action: `widget_${action}`,
        target: `widget:${widgetId}`,
        meta: {
          widget_id: widgetId,
          changes: changes,
          timestamp: new Date().toISOString()
        }
      })
  } catch (error) {
    console.error('Audit log error:', error)
    // Don't fail the main operation if audit logging fails
  }
}

// Authenticate request using Supabase auth (for admin operations)
async function authenticateRequest(req: Request): Promise<{ valid: boolean, customer_id?: string, api_key_id?: string, error?: string }> {
  const authHeader = req.headers.get('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing or invalid Authorization header' }
  }

  const token = authHeader.replace('Bearer ', '')
  
  try {
    // Verify the JWT token with the service role client
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return { valid: false, error: 'Invalid token' }
    }

    // Get user's customer_id
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('customer_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (rolesError || !userRoles) {
      console.error('User roles error:', rolesError)
      return { valid: false, error: 'User not associated with any customer' }
    }

    return { valid: true, customer_id: userRoles.customer_id }
  } catch (error) {
    console.error('Authentication error:', error)
    return { valid: false, error: 'Authentication failed' }
  }
}

// Handle POST /api/admin/widgets - Create new widget
async function createWidget(req: Request, customerId: string, apiKeyId?: string): Promise<Response> {
  try {
    const body = await req.json()
    const { name, allowed_domains, theme } = body

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return errorResponse('Missing or invalid name field', 400)
    }

    if (!Array.isArray(allowed_domains)) {
      return errorResponse('allowed_domains must be an array', 400)
    }

    if (!theme || typeof theme !== 'object') {
      return errorResponse('Missing or invalid theme object', 400)
    }

    // Validate domain formats
    const domainError = validateDomains(allowed_domains)
    if (domainError) {
      return errorResponse(domainError, 400)
    }

    // Generate secret for HMAC signing
    const secret = generateWidgetSecret()
    const secretHash = await createHmacHash(secret, 'widget_secret_salt')

    // Insert widget
    const { data, error } = await supabase
      .from('widgets')
      .insert({
        name,
        allowed_domains,
        theme,
        secret_hash: secretHash,
        customer_id: customerId
      })
      .select('id, site_key')
      .single()

    if (error) {
      console.error('Widget creation error:', error)
      return errorResponse('Failed to create widget', 500)
    }

    // Log audit event
    await logAuditEvent(customerId, 'created', data.id, {
      name,
      allowed_domains,
      theme
    }, apiKeyId)

    return jsonResponse({
      id: data.id,
      site_key: data.site_key,
      secret: secret // Only returned once on creation
    }, 201)

  } catch (error) {
    console.error('Create widget error:', error)
    return errorResponse('Invalid request body', 400)
  }
}

// Handle GET /api/admin/widgets - List widgets
async function listWidgets(customerId: string): Promise<Response> {
  try {
    const { data, error } = await supabase
      .from('widgets')
      .select('id, site_key, name, allowed_domains, theme, created_at, updated_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Widget list error:', error)
      return errorResponse('Failed to fetch widgets', 500)
    }

    return jsonResponse(data || [])
  } catch (error) {
    console.error('List widgets error:', error)
    return errorResponse('Failed to fetch widgets', 500)
  }
}

// Handle PATCH /api/admin/widgets/:id - Update widget
async function updateWidget(req: Request, widgetId: string, customerId: string, apiKeyId?: string): Promise<Response> {
  try {
    const body = await req.json()
    const allowedFields = ['name', 'allowed_domains', 'theme']
    
    // Filter to only allowed fields
    const updates: Partial<Widget> = {}
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        updates[key as keyof Widget] = value
      }
    }

    // Don't allow updating site_key
    if ('site_key' in body) {
      return errorResponse('site_key cannot be updated', 400)
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse('No valid fields to update', 400)
    }

    // Validate domains if provided
    if (updates.allowed_domains) {
      if (!Array.isArray(updates.allowed_domains)) {
        return errorResponse('allowed_domains must be an array', 400)
      }
      const domainError = validateDomains(updates.allowed_domains)
      if (domainError) {
        return errorResponse(domainError, 400)
      }
    }

    // Validate theme if provided
    if (updates.theme && typeof updates.theme !== 'object') {
      return errorResponse('theme must be an object', 400)
    }

    // Update widget
    const { data, error } = await supabase
      .from('widgets')
      .update(updates)
      .eq('id', widgetId)
      .eq('customer_id', customerId)
      .select('id, site_key, name, allowed_domains, theme, created_at, updated_at')
      .single()

    if (error) {
      console.error('Widget update error:', error)
      if (error.code === 'PGRST116') {
        return errorResponse('Widget not found', 404)
      }
      return errorResponse('Failed to update widget', 500)
    }

    // Log audit event with changes
    await logAuditEvent(customerId, 'updated', widgetId, updates, apiKeyId)

    return jsonResponse(data)
  } catch (error) {
    console.error('Update widget error:', error)
    return errorResponse('Invalid request body', 400)
  }
}

// Parse origin to scheme + host only (no path, query, fragment)
function parseOrigin(originStr: string): string | null {
  try {
    const url = new URL(originStr)
    return `${url.protocol}//${url.host}`
  } catch {
    return null
  }
}

// Get client IP for rate limiting
function getClientIP(req: Request): string {
  return req.headers.get('cf-connecting-ip') || 
         req.headers.get('x-forwarded-for')?.split(',')[0] || 
         req.headers.get('x-real-ip') || 
         'unknown'
}

// Handle GET /api/widget/config - Public endpoint for iframe config
async function getWidgetConfig(req: Request): Promise<Response> {
  // Rate limit by IP
  const clientIP = getClientIP(req)
  const rateLimit = await checkRateLimit(clientIP, 'widget_config', 60)
  
  if (!rateLimit.allowed) {
    return new Response(JSON.stringify({
      error: 'Rate limit exceeded',
      status: 429
    }), {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': rateLimit.retryAfter?.toString() || '60'
      }
    })
  }
  const url = new URL(req.url)
  const siteKey = url.searchParams.get('site_key')
  const originParam = url.searchParams.get('origin')
  const userId = url.searchParams.get('user_id')
  const timestamp = url.searchParams.get('timestamp')
  const signature = url.searchParams.get('signature')

  // Validate required parameters
  if (!siteKey) {
    return new Response(JSON.stringify({
      error: 'Missing site_key parameter',
      status: 400
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60'
      }
    })
  }

  if (!originParam) {
    return new Response(JSON.stringify({
      error: 'Missing origin parameter',
      status: 400
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60'
      }
    })
  }

  // Parse and validate origin
  const cleanOrigin = parseOrigin(originParam)
  if (!cleanOrigin) {
    return new Response(JSON.stringify({
      error: 'Malformed origin parameter',
      status: 400
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60'
      }
    })
  }

  try {
    // Find widget by site_key (include secret_hash for signature validation)
    const { data: widget, error } = await supabase
      .from('widgets')
      .select('id, name, site_key, theme, allowed_domains, secret_hash')
      .eq('site_key', siteKey)
      .single()

    if (error || !widget) {
      console.error('Widget lookup error:', error)
      return new Response(JSON.stringify({
        error: 'Widget not found',
        status: 404
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=60'
        }
      })
    }

    // Check if origin is in allowed_domains
    if (!widget.allowed_domains.includes(cleanOrigin)) {
      return new Response(JSON.stringify({
        error: `Origin ${cleanOrigin} is not allowed for this widget`,
        status: 403
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=60'
        }
      })
    }

    // Validate user identity if provided
    let user: { id: string } | null = null
    if (userId && timestamp && signature && widget.secret_hash) {
      try {
        // Check timestamp is within 5 minutes
        const now = Date.now()
        const requestTime = parseInt(timestamp)
        const timeDiff = Math.abs(now - requestTime)
        
        if (timeDiff <= 5 * 60 * 1000) { // 5 minutes in milliseconds
          // Derive secret from hash (simplified - in production use proper key derivation)
          const secret = widget.secret_hash.substring(0, 32) // Use part of hash as secret
          const isValid = await validateHmacSignature(userId, timestamp, signature, secret)
          
          if (isValid) {
            user = { id: userId }
          }
        }
      } catch (error) {
        // Invalid signature is ignored, no crash
        console.log('Signature validation failed:', error)
      }
    }

    // Return sanitized config (only id, name, site_key, theme, user if valid)
    const response: any = {
      id: widget.id,
      name: widget.name,
      site_key: widget.site_key,
      theme: widget.theme
    }

    if (user) {
      response.user = user
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60'
      }
    })

  } catch (error) {
    console.error('Widget config error:', error)
    return new Response(JSON.stringify({
      error: 'Internal server error',
      status: 500
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60'
      }
    })
  }
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  const url = new URL(req.url)
  let path = url.pathname
  
  console.log('Original URL:', req.url)
  console.log('Original pathname:', url.pathname)
  
  // Edge functions in Supabase receive the full path including function name
  // We need to extract just the API path portion
  // Example: /widget-admin-api/api/admin/widgets -> /api/admin/widgets
  // Example: /widget-admin-api/ -> /
  // Example: /widget-admin-api -> /
  
  const functionPrefix = '/widget-admin-api'
  if (path.startsWith(functionPrefix)) {
    // Remove the function prefix
    path = path.substring(functionPrefix.length)
    
    // If path is now empty, set it to root
    if (!path || path === '') {
      path = '/'
    }
  }
  
  console.log('Processed path:', path)
  console.log(`Widget Admin API called: ${req.method} ${path}`)

  try {
    // Public endpoint - no authentication required
    if (path === '/api/widget/config' && req.method === 'GET') {
      console.log('Routing to getWidgetConfig')
      return await getWidgetConfig(req)
    }

    // All other endpoints require authentication
    console.log('Attempting authentication...')
    const auth = await authenticateRequest(req)
    console.log('Auth result:', { valid: auth.valid, error: auth.error, customer_id: auth.customer_id })
    
    if (!auth.valid) {
      console.log('Authentication failed:', auth.error)
      return errorResponse(auth.error || 'Unauthorized', 401)
    }

    const customerId = auth.customer_id!
    const apiKeyId = auth.api_key_id

    console.log(`Authenticated user with customer_id: ${customerId}`)

    // Handle all widget admin operations - support both root and API paths
    if ((path === '/' || path === '/api/admin/widgets') && req.method === 'GET') {
      console.log('Routing to listWidgets')
      return await listWidgets(customerId)
    }
    
    if ((path === '/' || path === '/api/admin/widgets') && req.method === 'POST') {
      console.log('Routing to createWidget')
      return await createWidget(req, customerId, apiKeyId)
    }

    // Handle widget updates - both root level and API path
    if (path.startsWith('/api/admin/widgets/') && req.method === 'PATCH') {
      console.log('Routing to updateWidget')
      const widgetId = path.split('/').pop()
      if (!widgetId) {
        return errorResponse('Invalid widget ID', 400)
      }
      return await updateWidget(req, widgetId, customerId, apiKeyId)
    }

    // Handle widget updates at root level (for new style)
    if (path !== '/' && path !== '/api/widget/config' && !path.startsWith('/api/') && req.method === 'PATCH') {
      console.log('Routing to updateWidget (root level)')
      const widgetId = path.substring(1) // Remove leading slash
      if (widgetId) {
        return await updateWidget(req, widgetId, customerId, apiKeyId)
      }
    }

    console.log(`No route matched for ${req.method} ${path}`)
    return errorResponse(`Route not found: ${req.method} ${path}`, 404)

  } catch (error) {
    console.error('Request error:', error)
    return errorResponse('Internal server error', 500)
  }
})