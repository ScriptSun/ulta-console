import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SessionInfo {
  id: string
  user_id: string
  session_start: string
  session_end?: string
  ip_address?: string
  user_agent?: string
  device_type?: string
  browser?: string
  os?: string
  location?: string
  is_active: boolean
  last_seen?: string
  created_at: string
}

function parseUserAgent(userAgent: string) {
  const browserRegex = /(Chrome|Firefox|Safari|Edge|Opera)\/?([\d.]+)/i
  const osRegex = /(Windows|Mac OS|Linux|Android|iOS)/i
  
  const browserMatch = userAgent.match(browserRegex)
  const osMatch = userAgent.match(osRegex)
  
  return {
    browser: browserMatch ? `${browserMatch[1]} ${browserMatch[2] || ''}`.trim() : 'Unknown Browser',
    os: osMatch ? osMatch[1] : 'Unknown OS'
  }
}

function getDeviceType(userAgent: string): string {
  if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) {
    if (/iPad/i.test(userAgent)) return 'Tablet'
    return 'Mobile'
  }
  if (/Tablet/i.test(userAgent)) return 'Tablet'
  return 'Desktop'
}

async function getLocationFromIP(ip: string): Promise<string> {
  try {
    // Using ipapi.co for IP geolocation (free tier available)
    const response = await fetch(`https://ipapi.co/${ip}/json/`)
    if (response.ok) {
      const data = await response.json()
      if (data.city && data.country_name) {
        return `${data.city}, ${data.country_name}`
      }
      if (data.country_name) {
        return data.country_name
      }
    }
  } catch (error) {
    console.log('Location lookup failed:', error)
  }
  return 'Unknown Location'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { method } = req
    const url = new URL(req.url)

    if (method === 'GET') {
      // Clean up inactive sessions first - delete sessions inactive for more than 1 hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', user.id)
        .lt('updated_at', oneHourAgo)
      
      console.log('Fetching sessions for user:', user.id)
      
      // Get only active sessions (updated within 1 hour)
      const { data: userSessions, error: sessionsError } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('updated_at', oneHourAgo)
        .order('created_at', { ascending: false })

      if (sessionsError) {
        console.error('Error fetching user sessions:', sessionsError)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch sessions' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Enhance sessions with parsed user agent info and location
      const enhancedSessions: SessionInfo[] = await Promise.all(
        (userSessions || []).map(async (session) => {
          const { browser, os } = parseUserAgent(session.user_agent || '')
          const deviceType = getDeviceType(session.user_agent || '')
          
          let location = session.location || 'Unknown Location'
          if (session.ip_address && session.ip_address !== 'Unknown Location') {
            location = await getLocationFromIP(session.ip_address)
          }

          return {
            id: session.id,
            user_id: session.user_id,
            session_start: session.session_start || session.created_at,
            session_end: session.session_end,
            ip_address: session.ip_address,
            user_agent: session.user_agent,
            device_type: deviceType,
            browser,
            os,
            location,
            is_active: session.is_active,
            last_seen: session.updated_at,
            created_at: session.created_at
          }
        })
      )

      return new Response(
        JSON.stringify({ sessions: enhancedSessions }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (method === 'POST') {
      const { action, sessionId } = await req.json()

      if (action === 'revoke' && sessionId) {
        console.log('Revoking session:', sessionId, 'for user:', user.id)
        
        // Mark session as inactive in user_sessions table
        const { error: revokeError } = await supabase
          .from('user_sessions')
          .update({ 
            is_active: false, 
            session_end: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId)
          .eq('user_id', user.id) // Ensure user can only revoke their own sessions

        if (revokeError) {
          console.error('Error revoking session:', revokeError)
          return new Response(
            JSON.stringify({ error: 'Failed to revoke session' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Log the session revocation for audit purposes
        const { error: auditError } = await supabase
          .from('audit_logs')
          .insert({
            customer_id: user.id, // Using user.id as customer_id for personal audit
            actor: user.email || 'Unknown',
            action: 'session_revoked',
            target: `session:${sessionId}`,
            meta: {
              session_id: sessionId,
              revoked_by: user.id,
              revoked_at: new Date().toISOString()
            }
          })

        if (auditError) {
          console.error('Error logging audit event:', auditError)
          // Don't fail the request if audit logging fails
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Session revoked successfully' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (action === 'revoke_all') {
        console.log('Revoking all sessions for user:', user.id)
        
        // Get all active sessions for this user
        const { data: currentSessions } = await supabase
          .from('user_sessions')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)

        if (currentSessions && currentSessions.length > 0) {
          const sessionIds = currentSessions.map(s => s.id)
          
          // Mark all sessions as inactive and delete them
          const { error: revokeAllError } = await supabase
            .from('user_sessions')
            .update({ 
              is_active: false, 
              session_end: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .in('id', sessionIds)
            .eq('user_id', user.id)

          if (revokeAllError) {
            console.error('Error revoking all sessions:', revokeAllError)
            return new Response(
              JSON.stringify({ error: 'Failed to revoke all sessions' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // Log the bulk session revocation
          const { error: auditError } = await supabase
            .from('audit_logs')
            .insert({
              customer_id: user.id,
              actor: user.email || 'Unknown',
              action: 'all_sessions_revoked',
              target: 'sessions:all',
              meta: {
                revoked_count: sessionIds.length,
                revoked_by: user.id,
                revoked_at: new Date().toISOString()
              }
            })

          if (auditError) {
            console.error('Error logging bulk revocation audit event:', auditError)
          }

          console.log(`Successfully revoked ${sessionIds.length} sessions`)
        }

        return new Response(
          JSON.stringify({ success: true, message: 'All sessions revoked successfully' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (action === 'create' || action === 'heartbeat') {
        // Create/track or update a session
        const clientIP = req.headers.get('x-forwarded-for') || 
                        req.headers.get('x-real-ip') || 
                        'Unknown'
        const userAgent = req.headers.get('user-agent') || 'Unknown'
        
        const { browser, os } = parseUserAgent(userAgent)
        const deviceType = getDeviceType(userAgent)
        
        console.log('Processing session for user:', user.id)
        
        // Check if an active session exists for this device (using user_agent + ip as identifier)
        const { data: existingSession, error: findError } = await supabase
          .from('user_sessions')
          .select('*')
          .eq('user_id', user.id)
          .eq('user_agent', userAgent)
          .eq('ip_address', clientIP)
          .eq('is_active', true)
          .maybeSingle()
        
        if (findError) {
          console.error('Error finding existing session:', findError)
          return new Response(
            JSON.stringify({ error: 'Failed to check existing sessions' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        let sessionData: any

        if (existingSession) {
          // Update existing session with new heartbeat
          console.log('Updating existing session:', existingSession.id)
          
          const { data: updatedSession, error: updateError } = await supabase
            .from('user_sessions')
            .update({
              updated_at: new Date().toISOString(),
              location: await getLocationFromIP(clientIP)
            })
            .eq('id', existingSession.id)
            .select()
            .single()

          if (updateError) {
            console.error('Error updating session:', updateError)
            return new Response(
              JSON.stringify({ error: 'Failed to update session' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          sessionData = updatedSession
        } else {
          // Create new session for this device
          console.log('Creating new session for device')
          
          const location = await getLocationFromIP(clientIP)

          const { data: newSession, error: createError } = await supabase
            .from('user_sessions')
            .insert({
              user_id: user.id,
              ip_address: clientIP,
              user_agent: userAgent,
              device_type: deviceType,
              location,
              is_active: true,
              session_start: new Date().toISOString()
            })
            .select()
            .single()

          if (createError) {
            console.error('Error creating session:', createError)
            return new Response(
              JSON.stringify({ error: 'Failed to create session' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          sessionData = newSession
        }

        const enhancedSession: SessionInfo = {
          ...sessionData,
          browser,
          os,
          device_type: deviceType,
          location: sessionData.location,
          last_seen: sessionData.updated_at
        }

        return new Response(
          JSON.stringify({ 
            session: enhancedSession, 
            action: existingSession ? 'updated' : 'created' 
          }),
          { status: existingSession ? 200 : 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Session management error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})