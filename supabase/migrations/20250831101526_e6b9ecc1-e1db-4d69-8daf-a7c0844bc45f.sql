-- Add secret field to widgets table for HMAC signature validation
ALTER TABLE public.widgets ADD COLUMN secret_hash TEXT;