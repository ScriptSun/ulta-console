import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { supabaseAdmin } from "../_shared/supabase-admin.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface EmailTemplate {
  id?: string;
  key: string;
  name: string;
  category: "security" | "account" | "agents" | "billing" | "system";
  locale: string;
  status: "active" | "draft" | "archived";
  subject: string;
  preheader?: string;
  html: string;
  text?: string;
  variables: string[];
  provider?: any;
  version: number;
  customer_id?: string;
}

const DEFAULT_TEMPLATES: Record<string, { subject: string; htmlContent: string; category: string }> = {
  "api.key.created": {
    subject: "Your API key was created",
    htmlContent: `<h1>API key created</h1><p>Hello {{user.name}}, an API key ending with {{api.key.prefix}} was created at {{event.time}}.</p><p><a href='{{org.url}}/settings/api-keys'>Manage API keys</a></p>`,
    category: "security"
  },
  "agent.created": {
    subject: "New agent created", 
    htmlContent: `<h1>Agent created</h1><p>Agent <b>{{agent.name}}</b> was created by {{user.name}} at {{event.time}}.</p><p><a href='{{org.url}}/agents'>Open agents</a></p>`,
    category: "agents"
  },
  "security.login.bans.threshold": {
    subject: "Login bans threshold reached",
    htmlContent: `<h1>Security alert</h1><p>{{security.banCount}} bans in {{security.window}} minutes.</p><p><a href='{{org.url}}/security'>Review security events</a></p>`,
    category: "security"
  },
  "billing.invoice.created": {
    subject: "New invoice available",
    htmlContent: `<h1>Invoice {{invoice.id}}</h1><p>A new invoice for {{invoice.amount}} is available.</p><p><a href='{{org.url}}/billing'>View invoice</a></p>`,
    category: "billing"
  },
  "user.created": {
    subject: "Welcome to {{org.name}}",
    htmlContent: `<h1>Welcome {{user.name}}</h1><p>Your account has been created successfully.</p><p><a href='{{org.url}}/dashboard'>Get started</a></p>`,
    category: "account"
  },
  "agent.heartbeat.lost": {
    subject: "Agent {{agent.name}} offline", 
    htmlContent: `<h1>Agent offline</h1><p>Agent <b>{{agent.name}}</b> has not sent a heartbeat since {{event.time}}.</p><p><a href='{{org.url}}/agents'>Check agent status</a></p>`,
    category: "agents"
  },
  "system.maintenance.scheduled": {
    subject: "Scheduled maintenance",
    htmlContent: `<h1>Maintenance scheduled</h1><p>System maintenance is scheduled at {{event.time}}.</p><p><a href='{{org.url}}/status'>View status page</a></p>`,
    category: "system"
  },
  "security.suspicious.activity": {
    subject: "Suspicious activity detected",
    htmlContent: `<h1>Security alert</h1><p>Suspicious activity detected at {{event.time}}.</p><p><a href='{{org.url}}/security'>Review security events</a></p>`,
    category: "security"
  }
};

const HTML_SKELETON = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff">
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
</table>`;

function extractVariables(text: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const variables = new Set<string>();
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    variables.add(match[1].trim());
  }
  
  return Array.from(variables);
}

function getSystemCustomerId(): string {
  return '00000000-0000-0000-0000-000000000001';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // GET /api/templates -> EmailTemplate[]
    if (req.method === 'GET' && path.endsWith('/api/templates')) {
      const { data: templates, error } = await supabaseAdmin
        .from('event_email_templates')
        .select('*')
        .eq('customer_id', getSystemCustomerId())
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      return new Response(JSON.stringify(templates || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /api/templates -> create or update EmailTemplate
    if (req.method === 'POST' && path.endsWith('/api/templates')) {
      const template: EmailTemplate = await req.json();
      
      // Extract variables from HTML content
      const variables = extractVariables(template.html + ' ' + template.subject + ' ' + (template.preheader || ''));
      
      const templateData = {
        ...template,
        variables,
        customer_id: getSystemCustomerId(),
        updated_at: new Date().toISOString()
      };

      if (template.id) {
        // Update existing template
        const { data, error } = await supabaseAdmin
          .from('event_email_templates')
          .update(templateData)
          .eq('id', template.id)
          .eq('customer_id', getSystemCustomerId())
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        // Create new template
        const { data, error } = await supabaseAdmin
          .from('event_email_templates')
          .insert(templateData)
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // POST /api/templates/duplicate -> { template: EmailTemplate }
    if (req.method === 'POST' && path.endsWith('/api/templates/duplicate')) {
      const { templateId } = await req.json();
      
      const { data: original, error: fetchError } = await supabaseAdmin
        .from('event_email_templates')
        .select('*')
        .eq('id', templateId)
        .eq('customer_id', getSystemCustomerId())
        .single();

      if (fetchError) throw fetchError;

      const duplicate = {
        ...original,
        id: undefined,
        name: `${original.name} (Copy)`,
        key: `${original.key}.copy`,
        status: 'draft',
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabaseAdmin
        .from('event_email_templates')
        .insert(duplicate)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ template: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // DELETE /api/templates/:id -> { ok: true } (archive)
    if (req.method === 'DELETE' && path.includes('/api/templates/')) {
      const templateId = path.split('/').pop();
      
      // Check if template is in use
      const { data: policies, error: policyError } = await supabaseAdmin
        .from('notification_policies')
        .select('id')
        .eq('email_template_id', templateId);

      if (policyError) throw policyError;

      if (policies && policies.length > 0) {
        return new Response(
          JSON.stringify({ 
            error: 'Template is in use and cannot be archived. Please reassign or duplicate first.' 
          }), 
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const { error } = await supabaseAdmin
        .from('event_email_templates')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', templateId)
        .eq('customer_id', getSystemCustomerId());

      if (error) throw error;

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /api/templates/test -> { ok: true }
    if (req.method === 'POST' && path.endsWith('/api/templates/test')) {
      const { templateId, to, variables } = await req.json();
      
      const { data: template, error: fetchError } = await supabaseAdmin
        .from('event_email_templates')
        .select('*')
        .eq('id', templateId)
        .eq('customer_id', getSystemCustomerId())
        .single();

      if (fetchError) throw fetchError;

      // Replace variables in template
      let html = HTML_SKELETON.replace('{{content}}', template.html);
      let subject = template.subject;
      
      // Replace all variables
      Object.entries(variables || {}).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g');
        html = html.replace(regex, String(value));
        subject = subject.replace(regex, String(value));
      });

      // Send test email via new dynamic email system
      const { error: emailError } = await supabaseAdmin.functions.invoke('dynamic-email-send', {
        body: {
          templateKey: template.key,
          to,
          variables: variables || {},
          customer_id: template.customer_id
        }
      });

      if (emailError) throw emailError;

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /api/templates/seed -> { created: Array<{key:string, id:string}> }
    if (req.method === 'POST' && path.endsWith('/api/templates/seed')) {
      const created = [];
      
      for (const [key, template] of Object.entries(DEFAULT_TEMPLATES)) {
        // Check if template already exists
        const { data: existing } = await supabaseAdmin
          .from('event_email_templates')
          .select('id')
          .eq('key', key)
          .eq('customer_id', getSystemCustomerId())
          .single();

        if (!existing) {
          const html = HTML_SKELETON.replace('{{content}}', template.htmlContent);
          const variables = extractVariables(html + ' ' + template.subject);
          
          const { data, error } = await supabaseAdmin
            .from('event_email_templates')
            .insert({
              key,
              name: template.subject,
              category: template.category,
              locale: 'en',
              status: 'draft',
              subject: template.subject,
              html,
              variables,
              version: 1,
              customer_id: getSystemCustomerId(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (error) {
            console.error(`Error creating template ${key}:`, error);
            continue;
          }

          created.push({ key, id: data.id });
        }
      }

      return new Response(JSON.stringify({ created }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });

  } catch (error) {
    console.error('Templates API error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);