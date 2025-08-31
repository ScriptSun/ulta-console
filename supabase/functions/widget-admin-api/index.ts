// Widget Admin API - CRUD endpoints for widget configuration
// Requires admin API key authentication via X-API-Key header

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

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
  created_at?: string
  updated_at?: string
}

// Validate domain format (must be exact origins like https://client.whmcs.com)
function validateDomains(domains: string[]): string | null {
  const urlRegex = /^https?:\/\/[a-zA-Z0-9][a-zA-Z0-9\-._]*[a-zA-Z0-9]+(:\d+)?$/
  
  for (const domain of domains) {
    if (!urlRegex.test(domain)) {
      return `Invalid domain format: "${domain}". Must be exact origins like https://client.whmcs.com`
    }
  }
  return null
}

// Authenticate request using API key
async function authenticateApiKey(req: Request): Promise<{ valid: boolean, customer_id?: string, error?: string }> {
  const apiKey = req.headers.get('X-API-Key')
  
  if (!apiKey) {
    return { valid: false, error: 'Missing X-API-Key header' }
  }

  try {
    // Validate API key using existing function
    const { data, error } = await supabase.rpc('validate_api_key', {
      _api_key: apiKey
    })

    if (error) {
      console.error('API key validation error:', error)
      return { valid: false, error: 'Invalid API key' }
    }

    if (!data || data.length === 0) {
      return { valid: false, error: 'Invalid API key' }
    }

    const keyData = data[0]
    if (!keyData.valid) {
      return { valid: false, error: 'API key expired or revoked' }
    }

    // Check if key has admin permissions
    const { data: apiKeyData, error: keyError } = await supabase
      .from('api_keys')
      .select('permissions, id')
      .eq('customer_id', keyData.customer_id)
      .contains('permissions', ['admin'])
      .single()

    if (keyError || !apiKeyData) {
      return { valid: false, error: 'API key does not have admin permissions' }
    }

    // Track API key usage
    await supabase.rpc('track_api_key_usage', {
      _api_key_id: apiKeyData.id
    })

    return { valid: true, customer_id: keyData.customer_id }
  } catch (error) {
    console.error('Authentication error:', error)
    return { valid: false, error: 'Authentication failed' }
  }
}

// Handle POST /api/admin/widgets - Create new widget
async function createWidget(req: Request, customerId: string): Promise<Response> {
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

    // Insert widget
    const { data, error } = await supabase
      .from('widgets')
      .insert({
        name,
        allowed_domains,
        theme,
        customer_id: customerId
      })
      .select('id, site_key')
      .single()

    if (error) {
      console.error('Widget creation error:', error)
      return errorResponse('Failed to create widget', 500)
    }

    return jsonResponse({
      id: data.id,
      site_key: data.site_key
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
async function updateWidget(req: Request, widgetId: string, customerId: string): Promise<Response> {
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

    return jsonResponse(data)
  } catch (error) {
    console.error('Update widget error:', error)
    return errorResponse('Invalid request body', 400)
  }
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  const url = new URL(req.url)
  const path = url.pathname

  try {
    // All endpoints require admin API key authentication
    const auth = await authenticateApiKey(req)
    if (!auth.valid) {
      return errorResponse(auth.error || 'Unauthorized', 401)
    }

    const customerId = auth.customer_id!

    // Route handlers
    if (path === '/api/admin/widgets') {
      if (req.method === 'POST') {
        return await createWidget(req, customerId)
      } else if (req.method === 'GET') {
        return await listWidgets(customerId)
      }
    } else if (path.startsWith('/api/admin/widgets/')) {
      const widgetId = path.split('/').pop()
      if (!widgetId) {
        return errorResponse('Invalid widget ID', 400)
      }

      if (req.method === 'PATCH') {
        return await updateWidget(req, widgetId, customerId)
      }
    }

    return errorResponse('Not found', 404)
  } catch (error) {
    console.error('Request error:', error)
    return errorResponse('Internal server error', 500)
  }
})