-- Add email logo and favicon fields to company_themes table
ALTER TABLE public.company_themes 
ADD COLUMN IF NOT EXISTS email_logo_url TEXT,
ADD COLUMN IF NOT EXISTS favicon_source_url TEXT;