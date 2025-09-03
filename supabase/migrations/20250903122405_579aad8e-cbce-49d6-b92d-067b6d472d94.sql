-- Enable the pgcrypto extension for gen_random_bytes function
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update the generate_api_key function to ensure it works properly
CREATE OR REPLACE FUNCTION public.generate_api_key(_customer_id uuid, _name text, _permissions text[] DEFAULT ARRAY['read'::text])
 RETURNS TABLE(id uuid, api_key text, key_prefix text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _key_id UUID;
  _api_key TEXT;
  _key_hash TEXT;
  _key_prefix TEXT;
BEGIN
  -- Generate a secure API key (32 random bytes encoded as hex)
  _api_key := 'sk-' || encode(gen_random_bytes(32), 'hex');
  _key_prefix := substring(_api_key, 1, 12);
  
  -- Hash the API key for storage
  _key_hash := encode(digest(_api_key, 'sha256'), 'hex');
  
  -- Insert the API key record
  INSERT INTO public.api_keys (customer_id, name, key_hash, key_prefix, permissions, created_by)
  VALUES (_customer_id, _name, _key_hash, _key_prefix, _permissions, auth.uid())
  RETURNING api_keys.id INTO _key_id;
  
  -- Return the key details (API key is only returned once)
  RETURN QUERY SELECT _key_id, _api_key, _key_prefix;
END;
$function$