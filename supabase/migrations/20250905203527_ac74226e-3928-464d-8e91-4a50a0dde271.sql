-- Create event_email_templates table
CREATE TABLE public.event_email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  key TEXT NOT NULL, -- event key like "api.key.created"
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('security', 'account', 'agents', 'billing', 'system')),
  locale TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'archived')),
  subject TEXT NOT NULL,
  preheader TEXT,
  html TEXT NOT NULL,
  text TEXT,
  variables TEXT[] NOT NULL DEFAULT '{}',
  provider JSONB DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  CONSTRAINT unique_customer_key_locale UNIQUE (customer_id, key, locale)
);

-- Enable RLS
ALTER TABLE public.event_email_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for event_email_templates
CREATE POLICY "Admins can manage all templates" 
ON public.event_email_templates 
FOR ALL 
USING (is_admin());

CREATE POLICY "Users can view templates in their customer" 
ON public.event_email_templates 
FOR SELECT 
USING (customer_id = ANY (get_user_customer_ids()) OR is_admin());

CREATE POLICY "Editors can manage templates in their customer" 
ON public.event_email_templates 
FOR ALL 
USING (
  (customer_id = ANY (get_user_customer_ids()) AND 
   (get_user_role_in_customer(customer_id, 'editor'::app_role) OR 
    get_user_role_in_customer(customer_id, 'approver'::app_role) OR 
    is_admin()))
);

-- Add email_template_id column to notification_policies
ALTER TABLE public.notification_policies 
ADD COLUMN email_template_id UUID;

-- Add foreign key constraint (optional, allows NULL for non-email notifications)
ALTER TABLE public.notification_policies 
ADD CONSTRAINT fk_notification_policies_email_template
FOREIGN KEY (email_template_id) 
REFERENCES public.event_email_templates(id) 
ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_event_email_templates_customer_category 
ON public.event_email_templates(customer_id, category);

CREATE INDEX idx_event_email_templates_key 
ON public.event_email_templates(key);

CREATE INDEX idx_notification_policies_email_template 
ON public.notification_policies(email_template_id);

-- Add updated_at trigger for event_email_templates
CREATE TRIGGER update_event_email_templates_updated_at
BEFORE UPDATE ON public.event_email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();