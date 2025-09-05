import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { supabaseAdmin } from "../_shared/supabase-admin.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface EventRule {
  key: string;
  category: "security" | "account" | "agents" | "billing" | "system";
  severity: "critical" | "warning" | "info";
  channels: Partial<Record<"email"|"telegram"|"slack"|"discord"|"sms"|"webhook"|"inapp", boolean>>;
  emailTemplateId?: string;
}

interface NotificationPolicy {
  version: number;
  updatedAt: string;
  rules: EventRule[];
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
    
    // GET /api/notify/policy -> NotificationPolicy
    if (req.method === 'GET' && url.pathname.endsWith('/api/notify/policy')) {
      const { data: policies, error } = await supabaseAdmin
        .from('notification_policies')
        .select('*')
        .eq('customer_id', getSystemCustomerId())
        .order('category', { ascending: true })
        .order('event_name', { ascending: true });

      if (error) throw error;

      const rules: EventRule[] = (policies || []).map(policy => ({
        key: policy.event_key,
        category: policy.category,
        severity: policy.severity,
        channels: policy.channels || {},
        emailTemplateId: policy.email_template_id
      }));

      const notificationPolicy: NotificationPolicy = {
        version: 1,
        updatedAt: new Date().toISOString(),
        rules
      };

      return new Response(JSON.stringify(notificationPolicy), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /api/notify/policy -> NotificationPolicy (validate template links)
    if (req.method === 'POST' && url.pathname.endsWith('/api/notify/policy')) {
      const policy: NotificationPolicy = await req.json();
      
      // Validate that all email-enabled rules have templates
      const validationErrors = [];
      
      for (const rule of policy.rules) {
        if (rule.channels.email && !rule.emailTemplateId) {
          validationErrors.push(`Rule ${rule.key} has email enabled but no template selected`);
        }
        
        // Validate template exists if specified
        if (rule.emailTemplateId) {
          const { data: template, error } = await supabaseAdmin
            .from('event_email_templates')
            .select('id')
            .eq('id', rule.emailTemplateId)
            .eq('customer_id', getSystemCustomerId())
            .single();
            
          if (error || !template) {
            validationErrors.push(`Template ${rule.emailTemplateId} not found for rule ${rule.key}`);
          }
        }
      }
      
      if (validationErrors.length > 0) {
        return new Response(
          JSON.stringify({ error: 'Validation failed', details: validationErrors }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Update notification policies
      const { data: { user } } = await req.json();
      const userId = user?.id;

      for (const rule of policy.rules) {
        const { error } = await supabaseAdmin
          .from('notification_policies')
          .upsert({
            customer_id: getSystemCustomerId(),
            event_key: rule.key,
            category: rule.category,
            severity: rule.severity,
            channels: rule.channels,
            email_template_id: rule.emailTemplateId,
            updated_by: userId,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'customer_id,event_key'
          });

        if (error) throw error;
      }

      const updatedPolicy: NotificationPolicy = {
        version: policy.version + 1,
        updatedAt: new Date().toISOString(),
        rules: policy.rules
      };

      return new Response(JSON.stringify(updatedPolicy), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });

  } catch (error) {
    console.error('Policy API error:', error);
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