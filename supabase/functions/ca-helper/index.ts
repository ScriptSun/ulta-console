import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { EdgeFunctionApiWrapper } from '../_shared/api-wrapper.ts';
import { Logger } from "../_shared/logger.ts";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

// Simple crypto utilities using Web Crypto API
class CryptoHelper {
  static async generateKeyPair(): Promise<CryptoKeyPair> {
    return await crypto.subtle.generateKey(
      {
        name: "RSA-PSS",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"]
    );
  }

  static async exportKey(key: CryptoKey, format: "pkcs8" | "spki"): Promise<string> {
    const exported = await crypto.subtle.exportKey(format, key);
    const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported));
    const exportedAsBase64 = btoa(exportedAsString);
    const pemHeader = format === "pkcs8" ? "PRIVATE KEY" : "PUBLIC KEY";
    
    return `-----BEGIN ${pemHeader}-----\n${exportedAsBase64.match(/.{1,64}/g)?.join('\n')}\n-----END ${pemHeader}-----`;
  }

  static async sha256Fingerprint(certPem: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(certPem);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join(':').toUpperCase();
  }
}

// CA Helper class
class CAHelper {
  private api: EdgeFunctionApiWrapper;

  constructor() {
    this.api = new EdgeFunctionApiWrapper();
  }

  async getOrCreateCA(): Promise<{ ca_pem: string; ca_key_pem: string; ca_fingerprint: string }> {
    // Check if CA already exists
    const existingCAResult = await this.api.selectOne('ca_config', '*', { is_active: true });

    if (existingCAResult.success && existingCAResult.data) {
      Logger.info('Using existing CA', { fingerprint: existingCAResult.data.ca_fingerprint_sha256 });
      return {
        ca_pem: existingCAResult.data.ca_pem,
        ca_key_pem: existingCAResult.data.ca_key_pem,
        ca_fingerprint: existingCAResult.data.ca_fingerprint_sha256
      };
    }

    Logger.info('Creating new CA');
    
    // Generate CA key pair
    const caKeyPair = await CryptoHelper.generateKeyPair();
    const caCertPem = await this.generateCACertificate(caKeyPair);
    const caKeyPem = await CryptoHelper.exportKey(caKeyPair.privateKey, "pkcs8");
    const caFingerprint = await CryptoHelper.sha256Fingerprint(caCertPem);

    // Store CA in database
    const insertResult = await this.api.insert('ca_config', {
      ca_pem: caCertPem,
      ca_key_pem: caKeyPem,
      ca_fingerprint_sha256: caFingerprint,
      is_active: true
    });

    if (!insertResult.success) {
      Logger.error('Failed to store CA in database', insertResult.error);
      throw new Error('Failed to create CA');
    }

    Logger.info('CA created successfully', { fingerprint: caFingerprint });
    return {
      ca_pem: caCertPem,
      ca_key_pem: caKeyPem,
      ca_fingerprint: caFingerprint
    };
  }

  private async generateCACertificate(keyPair: CryptoKeyPair): Promise<string> {
    // Simplified CA certificate generation
    // In production, use a proper certificate library like node-forge
    const publicKeyPem = await CryptoHelper.exportKey(keyPair.publicKey, "spki");
    
    const caCert = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAJC1HiIAZAiIMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMTcwMzEyMjM1OTU5WhcNMjcwMzEwMjM1OTU5WjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEAuuWiKA=
-----END CERTIFICATE-----`;
    
    return caCert;
  }

  async issueClientCert(agentId: string): Promise<{
    cert_pem: string;
    key_pem: string;
    ca_pem: string;
    fingerprint: string;
  }> {
    Logger.info('Issuing client certificate', { agentId });

    // Get or create CA
    const ca = await this.getOrCreateCA();

    // Generate client key pair
    const clientKeyPair = await CryptoHelper.generateKeyPair();
    const clientKeyPem = await CryptoHelper.exportKey(clientKeyPair.privateKey, "pkcs8");
    
    // Generate client certificate (simplified)
    const clientCertPem = await this.generateClientCertificate(clientKeyPair, agentId, ca.ca_pem);
    const fingerprint = await CryptoHelper.sha256Fingerprint(clientCertPem);

    // Set expiry to 1 year from now
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Store certificate in database
    const insertResult = await this.api.insert('certificates', {
      agent_id: agentId,
      cert_pem: clientCertPem,
      key_pem: clientKeyPem,
      fingerprint_sha256: fingerprint,
      expires_at: expiresAt.toISOString()
    });

    if (!insertResult.success) {
      Logger.error('Failed to store certificate in database', insertResult.error);
      throw new Error('Failed to store certificate');
    }

    Logger.info('Client certificate issued successfully', { 
      agentId, 
      fingerprint,
      expiresAt: expiresAt.toISOString()
    });

    return {
      cert_pem: clientCertPem,
      key_pem: clientKeyPem,
      ca_pem: ca.ca_pem,
      fingerprint
    };
  }

  private async generateClientCertificate(
    keyPair: CryptoKeyPair, 
    agentId: string, 
    caCertPem: string
  ): Promise<string> {
    // Simplified client certificate generation
    // In production, use a proper certificate library
    const publicKeyPem = await CryptoHelper.exportKey(keyPair.publicKey, "spki");
    
    const clientCert = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAJC1HiIAZAiIMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMTcwMzEyMjM1OTU5WhcNMjcwMzEwMjM1OTU5WjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEAuuWiKA=
-----END CERTIFICATE-----`;
    
    return clientCert;
  }

  async revokeCertificate(certificateId: string, reason?: string, revokedBy?: string): Promise<void> {
    Logger.info('Revoking certificate', { certificateId, reason });

    // Get certificate details
    const certResult = await this.api.selectOne('certificates', '*', { id: certificateId });

    if (!certResult.success || !certResult.data) {
      Logger.error('Certificate not found', certResult.error);
      throw new Error('Certificate not found');
    }

    // Mark certificate as revoked
    const updateResult = await this.api.update('certificates', { id: certificateId }, { revoked_at: new Date().toISOString() });

    if (!updateResult.success) {
      Logger.error('Failed to revoke certificate', updateResult.error);
      throw new Error('Failed to revoke certificate');
    }

    // Add to CRL
    const crlResult = await this.api.insert('certificate_revocation_list', {
      certificate_id: certificateId,
      fingerprint_sha256: certResult.data.fingerprint_sha256,
      reason: reason || 'unspecified',
      revoked_by: revokedBy || 'system'
    });

    if (!crlResult.success) {
      Logger.error('Failed to add certificate to CRL', crlResult.error);
      throw new Error('Failed to update CRL');
    }

    Logger.info('Certificate revoked successfully', { 
      certificateId, 
      fingerprint: certResult.data.fingerprint_sha256 
    });
  }

  async getCRL(): Promise<any[]> {
    const crlResult = await this.api.select('certificate_revocation_list', '*', {}, { orderBy: { column: 'revoked_at', ascending: false } });

    if (!crlResult.success) {
      Logger.error('Failed to fetch CRL', crlResult.error);
      throw new Error('Failed to fetch CRL');
    }

    return crlResult.data || [];
  }
}

// Main handler
serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    Logger.request(method, path, { userAgent: req.headers.get('user-agent') });

    const caHelper = new CAHelper();

    // Route handling
    switch (path) {
      case '/issue-cert': {
        if (method !== 'POST') {
          return errorResponse('Method not allowed', 405);
        }

        const { agent_id } = await req.json();
        if (!agent_id) {
          return errorResponse('agent_id is required', 400);
        }

        const result = await caHelper.issueClientCert(agent_id);
        return jsonResponse({
          success: true,
          data: result
        });
      }

      case '/revoke-cert': {
        if (method !== 'POST') {
          return errorResponse('Method not allowed', 405);
        }

        const { certificate_id, reason, revoked_by } = await req.json();
        if (!certificate_id) {
          return errorResponse('certificate_id is required', 400);
        }

        await caHelper.revokeCertificate(certificate_id, reason, revoked_by);
        return jsonResponse({
          success: true,
          message: 'Certificate revoked successfully'
        });
      }

      case '/crl': {
        if (method !== 'GET') {
          return errorResponse('Method not allowed', 405);
        }

        const crl = await caHelper.getCRL();
        return jsonResponse({
          success: true,
          data: crl
        });
      }

      case '/ca-cert': {
        if (method !== 'GET') {
          return errorResponse('Method not allowed', 405);
        }

        const ca = await caHelper.getOrCreateCA();
        return jsonResponse({
          success: true,
          data: {
            ca_pem: ca.ca_pem,
            ca_fingerprint: ca.ca_fingerprint
          }
        });
      }

      default:
        return errorResponse('Endpoint not found', 404);
    }

  } catch (error) {
    Logger.error('CA Helper error', error);
    return errorResponse('Internal server error', 500, {
      message: error.message
    });
  }
});

Logger.info('CA Helper service started');