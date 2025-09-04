-- Step 1: Clean up existing duplicates by keeping only the first one of each type per customer
DELETE FROM public.email_providers 
WHERE id NOT IN (
  SELECT DISTINCT ON (customer_id, type) id 
  FROM public.email_providers 
  ORDER BY customer_id, type, created_at ASC
);

DELETE FROM public.channel_providers 
WHERE id NOT IN (
  SELECT DISTINCT ON (customer_id, type) id 
  FROM public.channel_providers 
  ORDER BY customer_id, type, created_at ASC
);