-- First, let's clean up duplicate user_roles and ensure proper constraints

-- Remove duplicate user_roles entries (keep the highest priority role per customer)
WITH ranked_roles AS (
  SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, customer_id 
      ORDER BY 
        CASE role 
          WHEN 'owner' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'approver' THEN 3
          WHEN 'editor' THEN 4
          WHEN 'viewer' THEN 5
          ELSE 6
        END
    ) as rn
  FROM user_roles
),
duplicates_to_delete AS (
  SELECT id FROM ranked_roles WHERE rn > 1
)
DELETE FROM user_roles 
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- Add unique constraint on user_id + customer_id (one role per user per customer)
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_customer_unique;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_customer_unique 
  UNIQUE (user_id, customer_id);

-- Ensure email_providers have unique emails per customer
ALTER TABLE email_providers DROP CONSTRAINT IF EXISTS email_providers_customer_email_unique;
ALTER TABLE email_providers ADD CONSTRAINT email_providers_customer_email_unique 
  UNIQUE (customer_id, name);

-- Ensure channel_providers have unique names per customer  
ALTER TABLE channel_providers DROP CONSTRAINT IF EXISTS channel_providers_customer_name_unique;
ALTER TABLE channel_providers ADD CONSTRAINT channel_providers_customer_name_unique 
  UNIQUE (customer_id, type);

-- Create a function to get user's primary customer ID
CREATE OR REPLACE FUNCTION get_user_primary_customer_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT customer_id 
  FROM user_roles 
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'owner' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'approver' THEN 3
      WHEN 'editor' THEN 4
      WHEN 'viewer' THEN 5
      ELSE 6
    END
  LIMIT 1;
$$;

-- Create a function to ensure user has default customer setup
CREATE OR REPLACE FUNCTION ensure_user_customer_setup(_user_id uuid, _user_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _customer_id uuid;
BEGIN
  -- Check if user already has a customer relationship
  SELECT customer_id INTO _customer_id
  FROM user_roles 
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'owner' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'approver' THEN 3
      WHEN 'editor' THEN 4
      WHEN 'viewer' THEN 5
      ELSE 6
    END
  LIMIT 1;
  
  -- If no customer relationship exists, create one
  IF _customer_id IS NULL THEN
    -- Use system default customer ID for individual users
    _customer_id := '00000000-0000-0000-0000-000000000001';
    
    -- Insert user role (ignore if already exists)
    INSERT INTO user_roles (user_id, customer_id, role)
    VALUES (_user_id, _customer_id, 'admin')
    ON CONFLICT (user_id, customer_id) DO NOTHING;
  END IF;
  
  RETURN _customer_id;
END;
$$;