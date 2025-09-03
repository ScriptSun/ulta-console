-- Create email branding settings table
CREATE TABLE public.email_branding_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  sender_name TEXT NOT NULL DEFAULT '',
  sender_email TEXT NOT NULL DEFAULT '',
  colors JSONB NOT NULL DEFAULT '{"headerBg": "#000000", "text": "#333333", "accent": "#2563eb", "useTheme": true}'::jsonb,
  spf_status TEXT NOT NULL DEFAULT 'pending' CHECK (spf_status IN ('ok', 'pending', 'missing')),
  spf_record TEXT NOT NULL DEFAULT '',
  dkim_status TEXT NOT NULL DEFAULT 'pending' CHECK (dkim_status IN ('ok', 'pending', 'missing')),
  dkim_selector TEXT NOT NULL DEFAULT '',
  dkim_host TEXT NOT NULL DEFAULT '',
  dkim_record TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL DEFAULT auth.uid(),
  updated_by UUID NOT NULL DEFAULT auth.uid()
);

-- Create email templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  subject TEXT NOT NULL,
  preheader TEXT,
  category TEXT NOT NULL DEFAULT 'transactional' CHECK (category IN ('transactional', 'marketing')),
  colors JSONB NOT NULL DEFAULT '{"headerBg": null, "text": null, "accent": null, "useTheme": true}'::jsonb,
  mjml TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL DEFAULT auth.uid(),
  updated_by UUID NOT NULL DEFAULT auth.uid(),
  UNIQUE(customer_id, slug)
);

-- Create email template versions table for history
CREATE TABLE public.email_template_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  subject TEXT NOT NULL,
  preheader TEXT,
  category TEXT NOT NULL,
  colors JSONB NOT NULL,
  mjml TEXT NOT NULL,
  variables JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL DEFAULT auth.uid(),
  UNIQUE(template_id, version)
);

-- Enable RLS
ALTER TABLE public.email_branding_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_template_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_branding_settings
CREATE POLICY "Admins can manage all email_branding_settings" 
ON public.email_branding_settings 
FOR ALL 
USING (is_admin());

CREATE POLICY "Users can manage email_branding_settings in their tenant" 
ON public.email_branding_settings 
FOR ALL 
USING ((customer_id = ANY (get_user_customer_ids())) OR is_admin())
WITH CHECK ((customer_id = ANY (get_user_customer_ids())) AND (created_by = auth.uid()));

-- RLS Policies for email_templates
CREATE POLICY "Admins can manage all email_templates" 
ON public.email_templates 
FOR ALL 
USING (is_admin());

CREATE POLICY "Users can manage email_templates in their tenant" 
ON public.email_templates 
FOR ALL 
USING ((customer_id = ANY (get_user_customer_ids())) OR is_admin())
WITH CHECK ((customer_id = ANY (get_user_customer_ids())) AND (updated_by = auth.uid()));

-- RLS Policies for email_template_versions
CREATE POLICY "Admins can manage all email_template_versions" 
ON public.email_template_versions 
FOR ALL 
USING (is_admin());

CREATE POLICY "Users can view email_template_versions in their tenant" 
ON public.email_template_versions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.email_templates et 
  WHERE et.id = email_template_versions.template_id 
  AND ((et.customer_id = ANY (get_user_customer_ids())) OR is_admin())
));

CREATE POLICY "Users can insert email_template_versions in their tenant" 
ON public.email_template_versions 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.email_templates et 
  WHERE et.id = email_template_versions.template_id 
  AND et.customer_id = ANY (get_user_customer_ids())
) AND created_by = auth.uid());

-- Create indexes
CREATE INDEX idx_email_branding_settings_customer_id ON public.email_branding_settings(customer_id);
CREATE INDEX idx_email_templates_customer_id ON public.email_templates(customer_id);
CREATE INDEX idx_email_templates_slug ON public.email_templates(customer_id, slug);
CREATE INDEX idx_email_template_versions_template_id ON public.email_template_versions(template_id);

-- Create function to initialize default email templates for a customer
CREATE OR REPLACE FUNCTION public.initialize_default_email_templates(_customer_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _template_data RECORD;
  _template_id UUID;
BEGIN
  -- Default templates data
  FOR _template_data IN
    SELECT * FROM (VALUES
      ('Forgot Password', 'forgot-password', 'Reset your password', 'Reset your password for your account', '<mjml>
<mj-head>
<mj-attributes>
<mj-all font-family="Inter, Arial, sans-serif" />
<mj-text color="{{colors.text}}" font-size="14px" />
<mj-button background-color="{{colors.accent}}" color="#ffffff" border-radius="8px" />
</mj-attributes>
</mj-head>
<mj-body background-color="#ffffff">
<mj-section background-color="{{colors.headerBg}}" padding="24px">
<mj-column>
<mj-image width="140px" src="{{assets.emailLogo}}" alt="{{brand.name}}" />
</mj-column>
</mj-section>
<mj-section padding-top="20px">
<mj-column>
<mj-text font-size="18px" font-weight="600">Password reset</mj-text>
<mj-text>Hi {{user_name}}, use the button below to reset your password.</mj-text>
<mj-button href="{{reset_url}}">Reset password</mj-button>
<mj-text font-size="12px" color="#64748b">This link expires in {{expire_hours}} hours.</mj-text>
</mj-column>
</mj-section>
<mj-section>
<mj-column>
<mj-text align="center" color="#94a3b8" font-size="12px">You did not request this? Ignore this email.</mj-text>
</mj-column>
</mj-section>
</mj-body>
</mjml>', '{"user_name": {"required": true, "example": "John Doe"}, "reset_url": {"required": true, "example": "https://app.example.com/reset"}, "expire_hours": {"required": true, "example": "24"}}'),
      ('Welcome', 'welcome', 'Welcome to {{brand.name}}', 'Your account is ready', '<mjml>
<mj-head>
<mj-attributes>
<mj-all font-family="Inter, Arial, sans-serif" />
<mj-text color="{{colors.text}}" font-size="14px" />
<mj-button background-color="{{colors.accent}}" color="#ffffff" border-radius="8px" />
</mj-attributes>
</mj-head>
<mj-body background-color="#ffffff">
<mj-section background-color="{{colors.headerBg}}" padding="24px">
<mj-column><mj-image width="140px" src="{{assets.emailLogo}}" alt="{{brand.name}}"/></mj-column>
</mj-section>
<mj-section><mj-column>
<mj-text font-size="18px" font-weight="600">Welcome, {{user_name}}</mj-text>
<mj-text>Your workspace is ready. Open your dashboard to get started.</mj-text>
<mj-button background-color="{{colors.accent}}" href="{{dashboard_url}}">Open dashboard</mj-button>
</mj-column></mj-section>
</mj-body>
</mjml>', '{"user_name": {"required": true, "example": "John Doe"}, "dashboard_url": {"required": true, "example": "https://app.example.com/dashboard"}}'),
      ('System Update', 'system-update', 'System Update: {{update_title}}', 'Important system update notification', '<mjml>
<mj-head>
<mj-attributes>
<mj-all font-family="Inter, Arial, sans-serif" />
<mj-text color="{{colors.text}}" font-size="14px" />
<mj-button background-color="{{colors.accent}}" color="#ffffff" border-radius="8px" />
</mj-attributes>
</mj-head>
<mj-body background-color="#ffffff">
<mj-section padding="16px 24px" background-color="{{colors.headerBg}}">
<mj-column><mj-image width="140px" src="{{assets.emailLogo}}" /></mj-column>
</mj-section>
<mj-section><mj-column>
<mj-text font-size="16px" font-weight="600">{{update_title}}</mj-text>
<mj-text>{{update_summary}}</mj-text>
<mj-text color="#64748b">Status: {{status}}</mj-text>
<mj-button href="{{learn_more_url}}" background-color="{{colors.accent}}">Learn more</mj-button>
</mj-column></mj-section>
</mj-body>
</mjml>', '{"update_title": {"required": true, "example": "Maintenance Window"}, "update_summary": {"required": true, "example": "System will be offline for updates"}, "status": {"required": true, "example": "Scheduled"}, "learn_more_url": {"required": false, "example": "https://status.example.com"}}'),
      ('Agent Notification', 'agent-notification', 'New ticket #{{ticket_id}}', 'A new support ticket requires attention', '<mjml>
<mj-head>
<mj-attributes>
<mj-all font-family="Inter, Arial, sans-serif" />
<mj-text color="{{colors.text}}" font-size="14px" />
<mj-button background-color="{{colors.accent}}" color="#ffffff" border-radius="8px" />
</mj-attributes>
</mj-head>
<mj-body background-color="#ffffff">
<mj-section><mj-column>
<mj-text font-size="16px" font-weight="600">New ticket #{{ticket_id}}</mj-text>
<mj-text>Subject: {{ticket_subject}}</mj-text>
<mj-text>Priority: {{priority}}</mj-text>
<mj-button href="{{ticket_url}}" background-color="{{colors.accent}}">Open ticket</mj-button>
</mj-column></mj-section>
</mj-body>
</mjml>', '{"agent_name": {"required": true, "example": "John Agent"}, "ticket_id": {"required": true, "example": "12345"}, "ticket_subject": {"required": true, "example": "Login Issue"}, "ticket_url": {"required": true, "example": "https://support.example.com/ticket/12345"}, "priority": {"required": false, "example": "High"}}'),
      ('Generic Notification', 'generic', '{{title}}', 'General notification message', '<mjml>
<mj-head>
<mj-attributes>
<mj-all font-family="Inter, Arial, sans-serif" />
<mj-text color="{{colors.text}}" font-size="14px" />
<mj-button background-color="{{colors.accent}}" color="#ffffff" border-radius="8px" />
</mj-attributes>
</mj-head>
<mj-body background-color="#ffffff">
<mj-section><mj-column>
<mj-text font-size="16px" font-weight="600">{{title}}</mj-text>
<mj-text>{{message}}</mj-text>
<mj-button href="{{action_url}}" background-color="{{colors.accent}}">{{action_text}}</mj-button>
</mj-column></mj-section>
</mj-body>
</mjml>', '{"title": {"required": true, "example": "Important Notification"}, "message": {"required": true, "example": "This is an important message for you."}, "action_text": {"required": false, "example": "Take Action"}, "action_url": {"required": false, "example": "https://app.example.com/action"}}')
    ) AS t(name, slug, subject, preheader, mjml, variables)
  LOOP
    -- Insert template if it doesn't exist
    INSERT INTO public.email_templates (
      customer_id,
      name,
      slug,
      subject,
      preheader,
      mjml,
      variables,
      created_by,
      updated_by
    ) VALUES (
      _customer_id,
      _template_data.name,
      _template_data.slug,
      _template_data.subject,
      _template_data.preheader,
      _template_data.mjml,
      _template_data.variables::jsonb,
      auth.uid(),
      auth.uid()
    ) ON CONFLICT (customer_id, slug) DO NOTHING
    RETURNING id INTO _template_id;
    
    -- Create initial version if template was created
    IF _template_id IS NOT NULL THEN
      INSERT INTO public.email_template_versions (
        template_id,
        version,
        subject,
        preheader,
        category,
        colors,
        mjml,
        variables,
        created_by
      ) VALUES (
        _template_id,
        1,
        _template_data.subject,
        _template_data.preheader,
        'transactional',
        '{"headerBg": null, "text": null, "accent": null, "useTheme": true}'::jsonb,
        _template_data.mjml,
        _template_data.variables::jsonb,
        auth.uid()
      );
    END IF;
  END LOOP;
  
  -- Create default email branding settings if they don't exist
  INSERT INTO public.email_branding_settings (
    customer_id,
    sender_name,
    sender_email,
    created_by,
    updated_by
  ) VALUES (
    _customer_id,
    'Support Team',
    'support@example.com',
    auth.uid(),
    auth.uid()
  ) ON CONFLICT DO NOTHING;
END;
$function$;

-- Create trigger to automatically create version entries when templates are updated
CREATE OR REPLACE FUNCTION public.create_email_template_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create version on updates, not inserts (initial version is created in initialize function)
  IF TG_OP = 'UPDATE' AND (
    OLD.subject IS DISTINCT FROM NEW.subject OR
    OLD.preheader IS DISTINCT FROM NEW.preheader OR
    OLD.category IS DISTINCT FROM NEW.category OR
    OLD.colors IS DISTINCT FROM NEW.colors OR
    OLD.mjml IS DISTINCT FROM NEW.mjml OR
    OLD.variables IS DISTINCT FROM NEW.variables
  ) THEN
    INSERT INTO public.email_template_versions (
      template_id,
      version,
      subject,
      preheader,
      category,
      colors,
      mjml,
      variables,
      created_by
    ) VALUES (
      NEW.id,
      NEW.version,
      NEW.subject,
      NEW.preheader,
      NEW.category,
      NEW.colors,
      NEW.mjml,
      NEW.variables,
      NEW.updated_by
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER email_template_version_trigger
  AFTER UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.create_email_template_version();

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER update_email_branding_settings_updated_at
  BEFORE UPDATE ON public.email_branding_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();