-- Add secret field to widgets table for HMAC signature validation
ALTER TABLE public.widgets ADD COLUMN secret_hash TEXT;

-- Add index for performance
CREATE INDEX idx_widgets_site_key ON public.widgets(site_key);