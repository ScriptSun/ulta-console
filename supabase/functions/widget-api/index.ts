import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { action, site_key, domain } = await req.json()
    
    console.log('Widget API request:', { action, site_key, domain })

    if (action === 'get_config') {
      // Fetch widget by site key directly from database
      const { data: widget, error } = await supabase
        .from('widgets')
        .select('*')
        .eq('site_key', site_key)
        .maybeSingle()

      if (error) {
        console.error('Error fetching widget:', error)
        return Response.json(
          { success: false, error: 'Failed to fetch widget configuration' },
          { status: 500, headers: corsHeaders }
        )
      }
      
      if (!widget) {
        console.log('Widget not found for site key:', site_key)
        return Response.json(
          { success: false, error: 'Invalid site key' },
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
        console.log('Domain not allowed:', requestDomain, 'Allowed domains:', widget.allowed_domains)
        return Response.json(
          { success: false, error: 'Domain not authorized' },
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