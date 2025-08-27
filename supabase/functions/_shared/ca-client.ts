// CA Helper client utility for other edge functions
import { Logger } from "./logger.ts";

export interface CertificateData {
  cert_pem: string;
  key_pem: string;
  ca_pem: string;
  fingerprint: string;
}

export class CAClient {
  private baseUrl: string;

  constructor(supabaseUrl: string) {
    this.baseUrl = `${supabaseUrl}/functions/v1/ca-helper`;
  }

  async issueClientCert(agentId: string): Promise<CertificateData> {
    Logger.info('Requesting client certificate', { agentId });
    
    const response = await fetch(`${this.baseUrl}/issue-cert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({ agent_id: agentId })
    });

    if (!response.ok) {
      const error = await response.text();
      Logger.error('Failed to issue certificate', { status: response.status, error });
      throw new Error(`Failed to issue certificate: ${error}`);
    }

    const result = await response.json();
    Logger.info('Certificate issued successfully', { 
      agentId, 
      fingerprint: result.data.fingerprint 
    });
    
    return result.data;
  }

  async revokeCertificate(certificateId: string, reason?: string, revokedBy?: string): Promise<void> {
    Logger.info('Revoking certificate', { certificateId, reason });
    
    const response = await fetch(`${this.baseUrl}/revoke-cert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({ 
        certificate_id: certificateId, 
        reason, 
        revoked_by: revokedBy 
      })
    });

    if (!response.ok) {
      const error = await response.text();
      Logger.error('Failed to revoke certificate', { status: response.status, error });
      throw new Error(`Failed to revoke certificate: ${error}`);
    }

    Logger.info('Certificate revoked successfully', { certificateId });
  }

  async getCRL(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/crl`, {
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      Logger.error('Failed to fetch CRL', { status: response.status, error });
      throw new Error(`Failed to fetch CRL: ${error}`);
    }

    const result = await response.json();
    return result.data;
  }

  async getCACert(): Promise<{ ca_pem: string; ca_fingerprint: string }> {
    const response = await fetch(`${this.baseUrl}/ca-cert`, {
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      Logger.error('Failed to fetch CA certificate', { status: response.status, error });
      throw new Error(`Failed to fetch CA certificate: ${error}`);
    }

    const result = await response.json();
    return result.data;
  }
}

// Utility function for easy access
export const createCAClient = (): CAClient => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required');
  }
  return new CAClient(supabaseUrl);
};