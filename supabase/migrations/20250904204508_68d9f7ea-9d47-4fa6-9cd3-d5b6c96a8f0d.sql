-- Drop the existing per-customer constraints
ALTER TABLE public.email_providers 
DROP CONSTRAINT IF EXISTS unique_email_provider_type_per_customer;

ALTER TABLE public.channel_providers 
DROP CONSTRAINT IF EXISTS unique_channel_provider_type_per_customer;

-- Clean up existing duplicates by keeping only the first one of each type globally
DELETE FROM public.email_providers 
WHERE id NOT IN (
  SELECT DISTINCT ON (type) id 
  FROM public.email_providers 
  ORDER BY type, created_at ASC
);

DELETE FROM public.channel_providers 
WHERE id NOT IN (
  SELECT DISTINCT ON (type) id 
  FROM public.channel_providers 
  ORDER BY type, created_at ASC
);

-- Add global unique constraints (one provider type per entire system)
ALTER TABLE public.email_providers 
ADD CONSTRAINT unique_email_provider_type_global 
UNIQUE (type);

ALTER TABLE public.channel_providers 
ADD CONSTRAINT unique_channel_provider_type_global 
UNIQUE (type);