import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('Widget API - Incoming request:', {
    method: req.method,
    url: req.url,
    origin: req.headers.get('origin'),
    userAgent: req.headers.get('user-agent')
  })

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Widget API - CORS preflight request handled')
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('Widget API - Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseServiceKey: !!supabaseServiceKey
    })
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Widget API - Missing environment variables')
      return Response.json(
        { success: false, error: 'Server configuration error', code: 'ENV_MISSING' },
        { status: 500, headers: corsHeaders }
      )
    }
    
    // Create Supabase client with service role key to bypass RLS for public widget access
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let requestBody
    try {
      requestBody = await req.json()
    } catch (parseError) {
      console.error('Widget API - JSON parse error:', parseError)
      return Response.json(
        { success: false, error: 'Invalid JSON in request body', code: 'JSON_PARSE_ERROR' },
        { status: 400, headers: corsHeaders }
      )
    }

    const { action, site_key, domain } = requestBody
    
    console.log('Widget API - Parsed request:', { action, site_key, domain, requestOrigin: req.headers.get('origin') })

    if (action === 'get_config') {
      // Fetch widget by site key directly from database
      const { data: widget, error } = await supabase
        .from('widgets')
        .select('*')
        .eq('site_key', site_key)
        .maybeSingle()

      if (error) {
        console.error('Widget API - Database error:', error)
        return Response.json(
          { success: false, error: 'Database error', details: error.message, code: 'DB_ERROR' },
          { status: 500, headers: corsHeaders }
        )
      }
      
      if (!widget) {
        console.log('Widget API - Widget not found:', { site_key, searchedTable: 'widgets' })
        return Response.json(
          { success: false, error: 'Widget not found', site_key, code: 'WIDGET_NOT_FOUND' },
          { status: 404, headers: corsHeaders }
        )
      }

      // Check if domain is allowed
      const requestDomain = domain || req.headers.get('origin')
      const isAllowedDomain = widget.allowed_domains.some((allowedDomain: string) => {
        // Handle exact matches and wildcard patterns
        if (allowedDomain === '*') return true
        if (allowedDomain === requestDomain) return true
        
        // Handle wildcard domains like *.example.com
        if (allowedDomain.includes('*')) {
          const pattern = allowedDomain.replace(/\*/g, '.*')
          const regex = new RegExp(`^${pattern}$`)
          return regex.test(requestDomain || '')
        }
        
        return false
      })

      if (!isAllowedDomain && requestDomain) {
        console.log('Widget API - Domain not authorized:', { 
          requestDomain, 
          allowedDomains: widget.allowed_domains,
          widget_id: widget.id
        })
        return Response.json(
          { 
            success: false, 
            error: 'Domain not authorized', 
            domain: requestDomain, 
            allowed_domains: widget.allowed_domains,
            code: 'DOMAIN_NOT_AUTHORIZED'
          },
          { status: 403, headers: corsHeaders }
        )
      }

      console.log('Widget configuration found and validated:', { 
        widget_name: widget.name, 
        domain: requestDomain,
        allowed: isAllowedDomain 
      })

      // Return widget configuration
      return Response.json({
        success: true,
        widget: {
          id: widget.id,
          name: widget.name,
          site_key: widget.site_key,
          theme: widget.theme || {},
          allowed_domains: widget.allowed_domains
        }
      }, { headers: corsHeaders })
    }

    // Handle other actions like message sending, etc.
    if (action === 'send_message') {
      const { message, conversation_id } = await req.json()
      
      // TODO: Implement message sending logic
      // For now, return a simple response
      return Response.json({
        success: true,
        response: "Thank you for your message! Our team will get back to you soon.",
        conversation_id: conversation_id || crypto.randomUUID()
      }, { headers: corsHeaders })
    }

    return Response.json(
      { success: false, error: 'Invalid action' },
      { status: 400, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Widget API error:', error)
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
})