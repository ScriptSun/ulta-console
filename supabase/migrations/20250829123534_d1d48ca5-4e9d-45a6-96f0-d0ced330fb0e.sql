-- Create API keys table for company integrations
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE, -- Store hash of the API key for security
  key_prefix TEXT NOT NULL, -- Store first 12 chars for display
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  permissions TEXT[] NOT NULL DEFAULT ARRAY['read'],
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  request_count INTEGER NOT NULL DEFAULT 0,
  daily_request_count INTEGER NOT NULL DEFAULT 0,
  daily_request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all api_keys" 
ON public.api_keys 
FOR ALL 
USING (is_admin());

CREATE POLICY "Users can manage api_keys in their customer" 
ON public.api_keys 
FOR ALL 
USING (customer_id = ANY (get_user_customer_ids()) OR is_admin())
WITH CHECK (customer_id = ANY (get_user_customer_ids()) AND created_by = auth.uid());

CREATE POLICY "System can update api_keys for usage tracking" 
ON public.api_keys 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Add trigger for timestamps
CREATE TRIGGER update_api_keys_updated_at
BEFORE UPDATE ON public.api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate API key
CREATE OR REPLACE FUNCTION public.generate_api_key(_customer_id UUID, _name TEXT, _permissions TEXT[] DEFAULT ARRAY['read'])
RETURNS TABLE(id UUID, api_key TEXT, key_prefix TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create function to validate API key
CREATE OR REPLACE FUNCTION public.validate_api_key(_api_key TEXT)
RETURNS TABLE(customer_id UUID, api_key_id UUID, valid BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create function to track API key usage
CREATE OR REPLACE FUNCTION public.track_api_key_usage(_api_key_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
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