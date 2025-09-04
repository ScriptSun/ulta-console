import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DomainHealthRequest {
  domain: string;
}

interface DNSRecord {
  name: string;
  type: string;
  content: string;
}

interface DomainHealthResult {
  domain: string;
  spf: {
    status: 'valid' | 'invalid' | 'missing';
    record?: string;
    suggestion?: string;
  };
  dkim: {
    status: 'valid' | 'invalid' | 'missing';
    record?: string;
    suggestion?: string;
  };
  dmarc: {
    status: 'valid' | 'invalid' | 'missing';
    record?: string;
    suggestion?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain }: DomainHealthRequest = await req.json();
    
    if (!domain || !isValidDomain(domain)) {
      throw new Error('Invalid domain provided');
    }

    console.log(`Checking domain health for: ${domain}`);

    const healthResult = await checkDomainHealth(domain);

    return new Response(JSON.stringify(healthResult), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('Domain health check error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to check domain health',
        domain: ''
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

function isValidDomain(domain: string): boolean {
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return domainRegex.test(domain);
}

async function checkDomainHealth(domain: string): Promise<DomainHealthResult> {
  const result: DomainHealthResult = {
    domain,
    spf: { status: 'missing' },
    dkim: { status: 'missing' },
    dmarc: { status: 'missing' }
  };

  try {
    // Check SPF record
    const spfRecord = await lookupDNSRecord(domain, 'TXT');
    const spfMatch = spfRecord.find(record => record.content.toLowerCase().includes('v=spf1'));
    
    if (spfMatch) {
      result.spf.status = 'valid';
      result.spf.record = spfMatch.content;
    } else {
      result.spf.status = 'missing';
      result.spf.suggestion = `v=spf1 include:_spf.google.com ~all`;
    }

    // Check DMARC record
    const dmarcDomain = `_dmarc.${domain}`;
    const dmarcRecord = await lookupDNSRecord(dmarcDomain, 'TXT');
    const dmarcMatch = dmarcRecord.find(record => record.content.toLowerCase().includes('v=dmarc1'));
    
    if (dmarcMatch) {
      result.dmarc.status = 'valid';
      result.dmarc.record = dmarcMatch.content;
    } else {
      result.dmarc.status = 'missing';
      result.dmarc.suggestion = `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@${domain}`;
    }

    // Check DKIM (common selectors)
    const dkimSelectors = ['default', 'selector1', 'selector2', 'google', 'k1'];
    let dkimFound = false;

    for (const selector of dkimSelectors) {
      try {
        const dkimDomain = `${selector}._domainkey.${domain}`;
        const dkimRecord = await lookupDNSRecord(dkimDomain, 'TXT');
        
        if (dkimRecord.length > 0) {
          const dkimMatch = dkimRecord.find(record => 
            record.content.toLowerCase().includes('v=dkim1') || 
            record.content.toLowerCase().includes('k=rsa')
          );
          
          if (dkimMatch) {
            result.dkim.status = 'valid';
            result.dkim.record = `${selector}._domainkey.${domain}: ${dkimMatch.content}`;
            dkimFound = true;
            break;
          }
        }
      } catch (e) {
        // Continue checking other selectors
        continue;
      }
    }

    if (!dkimFound) {
      result.dkim.status = 'missing';
      result.dkim.suggestion = 'Configure DKIM with your email provider (Google Workspace, Microsoft 365, etc.)';
    }

  } catch (error: any) {
    console.error('Error checking domain health:', error);
    throw new Error(`Failed to check DNS records for ${domain}`);
  }

  return result;
}

async function lookupDNSRecord(domain: string, recordType: string): Promise<DNSRecord[]> {
  try {
    // Use Google's DNS over HTTPS API for DNS lookups
    const url = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${recordType}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/dns-json'
      }
    });

    if (!response.ok) {
      throw new Error(`DNS lookup failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.Status !== 0) {
      return []; // No records found
    }

    if (!data.Answer) {
      return [];
    }

    return data.Answer.map((answer: any) => ({
      name: answer.name,
      type: recordType,
      content: answer.data
    }));

  } catch (error: any) {
    console.error(`DNS lookup error for ${domain}:`, error);
    return [];
  }
}

serve(handler);