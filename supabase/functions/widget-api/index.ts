import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

interface Database {
  public: {
    Tables: {
      widget_tickets: {
        Row: {
          id: string
          tenant_id: string
          user_id: string | null
          agent_id: string
          origin: string
          ua_hash: string | null
          expires_at: string
          used_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id?: string | null
          agent_id: string
          origin: string
          ua_hash?: string | null
          expires_at?: string
          used_at?: string | null
          created_at?: string
        }
      }
      agents: {
        Row: {
          id: string
          customer_id: string
          status: string
        }
      }
    }
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log(`Widget API: ${req.method} ${req.url}`)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

    if (path === '/widget/tickets' && req.method === 'POST') {
      return await handleCreateTicket(req, supabase)
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Widget API Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function handleCreateTicket(req: Request, supabase: any) {
  try {
    // Verify server-to-server authentication
    const authHeader = req.headers.get('authorization')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!authHeader || !authHeader.includes(serviceKey)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Server-to-server auth required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const body = await req.json()
    const { tenant_id, user_id, agent_id, origin } = body

    // Validate required fields
    if (!tenant_id || !agent_id || !origin) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: tenant_id, agent_id, origin' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate agent ownership - agent must belong to tenant
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, customer_id, status')
      .eq('id', agent_id)
      .eq('customer_id', tenant_id)
      .single()

    if (agentError || !agent) {
      console.log('Agent validation error:', agentError)
      return new Response(
        JSON.stringify({ error: 'Agent not found or does not belong to tenant' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate User-Agent hash for additional security
    const userAgent = req.headers.get('user-agent') || ''
    const encoder = new TextEncoder()
    const data = encoder.encode(userAgent)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const ua_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Create ticket with 2-5 minute TTL (default 5 minutes from DB schema)
    const { data: ticket, error: ticketError } = await supabase
      .from('widget_tickets')
      .insert({
        tenant_id,
        user_id: user_id || null,
        agent_id,
        origin,
        ua_hash
      })
      .select('id')
      .single()

    if (ticketError) {
      console.error('Error creating ticket:', ticketError)
      return new Response(
        JSON.stringify({ error: 'Failed to create ticket' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Created widget ticket ${ticket.id} for tenant ${tenant_id}, agent ${agent_id}`)

    return new Response(
      JSON.stringify({ ticket_id: ticket.id }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Error in handleCreateTicket:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}