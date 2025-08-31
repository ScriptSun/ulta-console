import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'
import { Logger } from '../_shared/logger.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyticsEvent {
  event_type: string
  site_key: string
  origin: string
  hashed_page_url: string
  metadata?: Record<string, any>
}

// Simple SHA-256 hash function for page URLs
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const { event_type, site_key, origin, page_url, metadata } = body

    // Validate required fields
    if (!event_type || !site_key || !origin || !page_url) {
      Logger.warn('Missing required analytics fields', { 
        event_type, 
        site_key: site_key?.substring(0, 8) + '...', 
        origin,
        has_page_url: !!page_url 
      })
      return new Response(
        JSON.stringify({ error: 'Missing required fields: event_type, site_key, origin, page_url' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Hash the page URL to avoid storing PII
    const hashed_page_url = await hashString(page_url)

    // Verify the widget exists and get tenant info
    const { data: widget, error: widgetError } = await supabase
      .from('widgets')
      .select('id, tenant_id, name')
      .eq('site_key', site_key)
      .single()

    if (widgetError || !widget) {
      Logger.warn('Widget not found for analytics event', { 
        site_key: site_key.substring(0, 8) + '...',
        event_type 
      })
      return new Response(
        JSON.stringify({ error: 'Widget not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log the analytics event
    Logger.info('Widget analytics event', {
      event_type,
      site_key: site_key.substring(0, 8) + '...',
      origin,
      hashed_page_url,
      widget_id: widget.id,
      widget_name: widget.name,
      tenant_id: widget.tenant_id,
      metadata: metadata || {}
    })

    // Store in widget_metrics table if it exists, otherwise just log
    try {
      await supabase.rpc('increment_widget_metric', {
        _tenant_id: widget.tenant_id,
        _metric_type: `widget_${event_type}`,
        _increment: 1,
        _metadata: {
          widget_id: widget.id,
          origin,
          hashed_page_url,
          ...metadata
        }
      })
    } catch (metricsError) {
      // If metrics function doesn't exist, that's fine - we still have logs
      Logger.debug('Metrics function not available, event logged only', { metricsError })
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    Logger.error('Widget analytics error', error, { 
      method: req.method,
      url: req.url 
    })
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})