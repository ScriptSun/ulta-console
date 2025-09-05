-- Create a comprehensive variable replacement system for email templates

-- Create organization settings table for storing logo, name, etc.
CREATE TABLE IF NOT EXISTS public.organization_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  organization_name TEXT NOT NULL DEFAULT 'UltaAI',
  email_logo_url TEXT,
  website_url TEXT DEFAULT 'https://app.ultaai.com',
  support_email TEXT DEFAULT 'support@ultaai.com',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view organization settings in their customer"
  ON public.organization_settings
  FOR SELECT
  USING (customer_id = ANY (get_user_customer_ids()) OR is_admin());

CREATE POLICY "Admins can manage organization settings"
  ON public.organization_settings
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Editors can update organization settings in their customer"
  ON public.organization_settings
  FOR UPDATE
  USING (customer_id = ANY (get_user_customer_ids()) AND (get_user_role_in_customer(customer_id, 'editor'::app_role) OR get_user_role_in_customer(customer_id, 'approver'::app_role) OR is_admin()))
  WITH CHECK (updated_by = auth.uid());

-- Insert default settings if none exist
INSERT INTO public.organization_settings (customer_id, organization_name, website_url, support_email)
VALUES ('00000000-0000-0000-0000-000000000001', 'UltaAI', 'https://app.ultaai.com', 'support@ultaai.com')
ON CONFLICT DO NOTHING;

-- Create email template rendering function
CREATE OR REPLACE FUNCTION public.render_email_template(
  _template_key TEXT,
  _variables JSONB DEFAULT '{}'::JSONB,
  _customer_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'
)
RETURNS TABLE(
  subject TEXT,
  html TEXT,
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _template RECORD;
  _org_settings RECORD;
  _rendered_subject TEXT;
  _rendered_html TEXT;
  _skeleton_html TEXT;
  _var_key TEXT;
  _var_value TEXT;
BEGIN
  -- Get the template
  SELECT * INTO _template
  FROM event_email_templates
  WHERE key = _template_key
    AND customer_id = _customer_id
    AND status = 'active'
  LIMIT 1;
  
  IF _template IS NULL THEN
    RETURN QUERY SELECT 
      ''::TEXT,
      ''::TEXT,
      FALSE,
      'Template not found or not active: ' || _template_key;
    RETURN;
  END IF;
  
  -- Get organization settings
  SELECT * INTO _org_settings
  FROM organization_settings
  WHERE customer_id = _customer_id
  LIMIT 1;
  
  -- Start with template content
  _rendered_subject := _template.subject;
  _rendered_html := _template.html;
  
  -- Replace organization variables
  IF _org_settings IS NOT NULL THEN
    _rendered_subject := replace(_rendered_subject, '{{org.name}}', COALESCE(_org_settings.organization_name, 'UltaAI'));
    _rendered_subject := replace(_rendered_subject, '{{org.url}}', COALESCE(_org_settings.website_url, 'https://app.ultaai.com'));
    
    _rendered_html := replace(_rendered_html, '{{org.name}}', COALESCE(_org_settings.organization_name, 'UltaAI'));
    _rendered_html := replace(_rendered_html, '{{org.url}}', COALESCE(_org_settings.website_url, 'https://app.ultaai.com'));
    _rendered_html := replace(_rendered_html, '{{assets.emailLogo}}', COALESCE(_org_settings.email_logo_url, 'https://via.placeholder.com/120x40/7c3aed/ffffff?text=UltaAI'));
  END IF;
  
  -- Replace current year
  _rendered_subject := replace(_rendered_subject, '{{year}}', EXTRACT(YEAR FROM now())::TEXT);
  _rendered_html := replace(_rendered_html, '{{year}}', EXTRACT(YEAR FROM now())::TEXT);
  
  -- Replace custom variables from the _variables parameter
  FOR _var_key, _var_value IN SELECT * FROM jsonb_each_text(_variables)
  LOOP
    _rendered_subject := replace(_rendered_subject, '{{' || _var_key || '}}', _var_value);
    _rendered_html := replace(_rendered_html, '{{' || _var_key || '}}', _var_value);
  END LOOP;
  
  -- Get HTML skeleton and replace content
  SELECT html_skeleton INTO _skeleton_html
  FROM (VALUES (
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0">
<tr><td style="padding:24px 0;text-align:center">
<img src="{{assets.emailLogo}}" alt="{{org.name}}" height="40">
</td></tr>
<tr><td style="padding:16px 24px;color:#0f172a;font:16px/24px Inter,Arial">
{{content}}
</td></tr>
<tr><td style="padding:24px;color:#64748b;font:12px/18px Inter,Arial;text-align:center">
© {{year}} {{org.name}} · <a href="{{org.url}}/settings/notifications">Notification settings</a>
</td></tr>
</table>
</td></tr>
</table>'
  )) AS skeleton(html_skeleton);
  
  -- Replace skeleton variables and content
  _skeleton_html := replace(_skeleton_html, '{{content}}', _rendered_html);
  
  IF _org_settings IS NOT NULL THEN
    _skeleton_html := replace(_skeleton_html, '{{org.name}}', COALESCE(_org_settings.organization_name, 'UltaAI'));
    _skeleton_html := replace(_skeleton_html, '{{org.url}}', COALESCE(_org_settings.website_url, 'https://app.ultaai.com'));
    _skeleton_html := replace(_skeleton_html, '{{assets.emailLogo}}', COALESCE(_org_settings.email_logo_url, 'https://via.placeholder.com/120x40/7c3aed/ffffff?text=UltaAI'));
  END IF;
  
  _skeleton_html := replace(_skeleton_html, '{{year}}', EXTRACT(YEAR FROM now())::TEXT);
  
  RETURN QUERY SELECT 
    _rendered_subject,
    _skeleton_html,
    TRUE,
    NULL::TEXT;
END;
$$;