-- Create certificates table to store issued certificates
CREATE TABLE public.certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL,
  cert_pem TEXT NOT NULL,
  key_pem TEXT NOT NULL,
  fingerprint_sha256 TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create CRL (Certificate Revocation List) table
CREATE TABLE public.certificate_revocation_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  certificate_id UUID NOT NULL REFERENCES public.certificates(id) ON DELETE CASCADE,
  fingerprint_sha256 TEXT NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reason TEXT,
  revoked_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create CA configuration table
CREATE TABLE public.ca_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ca_pem TEXT NOT NULL,
  ca_key_pem TEXT NOT NULL,
  ca_fingerprint_sha256 TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_revocation_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ca_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for certificates
CREATE POLICY "Service role can manage certificates" 
ON public.certificates 
FOR ALL 
USING (true);

-- RLS Policies for CRL
CREATE POLICY "Service role can manage CRL" 
ON public.certificate_revocation_list 
FOR ALL 
USING (true);

-- RLS Policies for CA config
CREATE POLICY "Service role can manage CA config" 
ON public.ca_config 
FOR ALL 
USING (true);

-- Indexes for performance
CREATE INDEX idx_certificates_agent_id ON public.certificates(agent_id);
CREATE INDEX idx_certificates_fingerprint ON public.certificates(fingerprint_sha256);
CREATE INDEX idx_certificates_expires_at ON public.certificates(expires_at);
CREATE INDEX idx_crl_fingerprint ON public.certificate_revocation_list(fingerprint_sha256);
CREATE INDEX idx_crl_revoked_at ON public.certificate_revocation_list(revoked_at);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_certificates_updated_at
    BEFORE UPDATE ON public.certificates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();