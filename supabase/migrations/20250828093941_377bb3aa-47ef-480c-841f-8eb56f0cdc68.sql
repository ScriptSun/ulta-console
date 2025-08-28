-- Create customers table that's referenced in the system
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert the customer that's referenced in user_roles
INSERT INTO public.customers (id, name) 
VALUES ('22222222-2222-2222-2222-222222222222', 'Default Customer')
ON CONFLICT (id) DO NOTHING;

-- Create agent_deployment_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.agent_deployment_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on the new tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_deployment_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for customers table
CREATE POLICY "Users can view their customers" 
ON public.customers FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND customer_id = customers.id
  )
);

-- Create policies for agent_deployment_tokens table
CREATE POLICY "Users can view their deployment tokens" 
ON public.agent_deployment_tokens FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND customer_id = agent_deployment_tokens.customer_id
  )
);

CREATE POLICY "Users can create deployment tokens for their customers" 
ON public.agent_deployment_tokens FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND customer_id = agent_deployment_tokens.customer_id
  )
);

-- Update timestamp trigger
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();