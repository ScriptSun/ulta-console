import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DnsRecord {
  type: string
  value: string
}

async function queryDNS(domain: string, recordType: string): Promise<string[]> {
  try {
    // Using Google's DNS-over-HTTPS API
    const response = await fetch(
      `https://dns.google/resolve?name=${domain}&type=${recordType}`,
      {
        headers: {
          'Accept': 'application/dns-json',
        },
      }
    )
    
    const data = await response.json()
    
    if (data.Answer) {
      return data.Answer.map((record: any) => record.data)
    }
    
    return []
  } catch (error) {
    console.error(`DNS query failed for ${domain} ${recordType}:`, error)
    return []
  }
}

function checkSPFRecord(txtRecords: string[]): { status: 'ok' | 'pending' | 'missing', record: string } {
  const spfRecord = txtRecords.find(record => 
    record.includes('v=spf1') || record.includes('"v=spf1')
  )
  
  if (spfRecord) {
    // Clean up the record (remove quotes)
    const cleanRecord = spfRecord.replace(/"/g, '')
    
    // Check if it includes common email services or has proper mechanisms
    if (cleanRecord.includes('include:') || cleanRecord.includes('a:') || cleanRecord.includes('mx') || cleanRecord.includes('ip4:')) {
      return { status: 'ok', record: cleanRecord }
    } else {
      return { status: 'pending', record: cleanRecord }
    }
  }
  
  return { status: 'missing', record: '' }
}

function checkDKIMRecord(txtRecords: string[], selector: string): { status: 'ok' | 'pending' | 'missing', record: string } {
  const dkimRecord = txtRecords.find(record => 
    record.includes('v=DKIM1') || record.includes('"v=DKIM1')
  )
  
  if (dkimRecord) {
    // Clean up the record (remove quotes)
    const cleanRecord = dkimRecord.replace(/"/g, '')
    
    // Check if it has a public key
    if (cleanRecord.includes('p=') && !cleanRecord.includes('p=;')) {
      return { status: 'ok', record: cleanRecord }
    } else {
      return { status: 'pending', record: cleanRecord }
    }
  }
  
  return { status: 'missing', record: '' }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { domain, dkimSelector } = await req.json()
    
    if (!domain) {
      return new Response(
        JSON.stringify({ error: 'Domain is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Checking DNS records for domain: ${domain}`)

    // Check SPF record
    const txtRecords = await queryDNS(domain, 'TXT')
    const spfResult = checkSPFRecord(txtRecords)
    
    // Check DKIM record if selector is provided
    let dkimResult = { status: 'missing' as const, record: '' }
    if (dkimSelector) {
      const dkimDomain = `${dkimSelector}._domainkey.${domain}`
      const dkimRecords = await queryDNS(dkimDomain, 'TXT')
      dkimResult = checkDKIMRecord(dkimRecords, dkimSelector)
    }

    const result = {
      domain,
      spf: spfResult,
      dkim: {
        ...dkimResult,
        selector: dkimSelector || '',
        host: dkimSelector ? `${dkimSelector}._domainkey.${domain}` : ''
      },
      checkedAt: new Date().toISOString()
    }

    console.log('DNS check result:', result)

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in check-email-dns function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})