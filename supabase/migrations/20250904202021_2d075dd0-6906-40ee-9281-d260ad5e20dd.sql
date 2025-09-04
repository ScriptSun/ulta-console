-- Create email providers table
CREATE TABLE public.email_providers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('smtp', 'sendgrid', 'mailgun', 'ses', 'postmark', 'resend')),
  enabled boolean NOT NULL DEFAULT false,
  is_primary boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}',
  status text DEFAULT 'disconnected' CHECK (status IN ('connected', 'error', 'disconnected', 'testing')),
  last_tested_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  updated_by uuid NOT NULL DEFAULT auth.uid(),
  
  -- Ensure only one primary provider per customer
  CONSTRAINT unique_primary_per_customer UNIQUE (customer_id, is_primary) DEFERRABLE INITIALLY DEFERRED
);

-- Create channel providers table  
CREATE TABLE public.channel_providers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('slack', 'telegram', 'discord', 'twilio')),
  enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}',
  status text DEFAULT 'disconnected' CHECK (status IN ('connected', 'error', 'disconnected', 'testing')),
  last_tested_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  updated_by uuid NOT NULL DEFAULT auth.uid()
);

-- Create notification settings table for global settings
CREATE TABLE public.notification_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL UNIQUE,
  failover_order jsonb DEFAULT '[]',
  domain_health jsonb DEFAULT '[]',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  updated_by uuid NOT NULL DEFAULT auth.uid()
);

-- Enable RLS on all tables
ALTER TABLE public.email_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_providers
CREATE POLICY "Users can manage email providers in their customer"
ON public.email_providers
FOR ALL
USING ((customer_id = ANY (get_user_customer_ids())) OR is_admin())
WITH CHECK ((customer_id = ANY (get_user_customer_ids())) AND (created_by = auth.uid() OR updated_by = auth.uid()));

-- RLS Policies for channel_providers  
CREATE POLICY "Users can manage channel providers in their customer"
ON public.channel_providers
FOR ALL
USING ((customer_id = ANY (get_user_customer_ids())) OR is_admin())
WITH CHECK ((customer_id = ANY (get_user_customer_ids())) AND (created_by = auth.uid() OR updated_by = auth.uid()));

-- RLS Policies for notification_settings
CREATE POLICY "Users can manage notification settings in their customer"
ON public.notification_settings
FOR ALL
USING ((customer_id = ANY (get_user_customer_ids())) OR is_admin())
WITH CHECK ((customer_id = ANY (get_user_customer_ids())) AND (created_by = auth.uid() OR updated_by = auth.uid()));

-- Function to ensure only one primary email provider per customer
CREATE OR REPLACE FUNCTION public.ensure_single_primary_email_provider()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a provider as primary, unset others
  IF NEW.is_primary = true THEN
    UPDATE public.email_providers 
    SET is_primary = false 
    WHERE customer_id = NEW.customer_id 
      AND id != NEW.id 
      AND is_primary = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to maintain single primary provider
CREATE TRIGGER ensure_single_primary_email_provider_trigger
  BEFORE INSERT OR UPDATE ON public.email_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_primary_email_provider();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_notification_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for timestamp updates
CREATE TRIGGER update_email_providers_timestamp
  BEFORE UPDATE ON public.email_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notification_timestamps();

CREATE TRIGGER update_channel_providers_timestamp
  BEFORE UPDATE ON public.channel_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notification_timestamps();

CREATE TRIGGER update_notification_settings_timestamp
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notification_timestamps();

-- Create indexes for performance
CREATE INDEX idx_email_providers_customer_id ON public.email_providers(customer_id);
CREATE INDEX idx_email_providers_primary ON public.email_providers(customer_id, is_primary) WHERE is_primary = true;
CREATE INDEX idx_channel_providers_customer_id ON public.channel_providers(customer_id);
CREATE INDEX idx_notification_settings_customer_id ON public.notification_settings(customer_id);