-- Fix search path issues for the new functions
CREATE OR REPLACE FUNCTION public.generate_api_key(_customer_id UUID, _name TEXT, _permissions TEXT[] DEFAULT ARRAY['read'])
RETURNS TABLE(id UUID, api_key TEXT, key_prefix TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.validate_api_key(_api_key TEXT)
RETURNS TABLE(customer_id UUID, api_key_id UUID, valid BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _key_hash TEXT;
BEGIN
  -- Hash the provided API key
  _key_hash := encode(digest(_api_key, 'sha256'), 'hex');
  
  -- Check if the key exists and is active
  RETURN QUERY
  SELECT 
    ak.customer_id,
    ak.id as api_key_id,
    (ak.status = 'active' AND (ak.expires_at IS NULL OR ak.expires_at > now())) as valid
  FROM public.api_keys ak
  WHERE ak.key_hash = _key_hash;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_api_key_usage(_api_key_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.api_keys
  SET 
    last_used_at = now(),
    request_count = request_count + 1,
    daily_request_count = CASE 
      WHEN daily_request_date = CURRENT_DATE THEN daily_request_count + 1
      ELSE 1
    END,
    daily_request_date = CURRENT_DATE,
    updated_at = now()
  WHERE id = _api_key_id;
END;
$$;