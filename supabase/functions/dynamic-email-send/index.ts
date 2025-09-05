import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  templateKey: string;
  to: string;
  variables?: Record<string, any>;
  customer_id?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { templateKey, to, variables = {}, customer_id }: EmailRequest = await req.json();

    if (!templateKey || !to) {
      return new Response(
        JSON.stringify({ 
          error: 'Template key and recipient are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Processing email send request for template: ${templateKey}, to: ${to}`);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Use the render_email_template function to get rendered content
    const { data: templateData, error: renderError } = await supabase
      .rpc('render_email_template', {
        _template_key: templateKey,
        _variables: variables,
        _customer_id: customer_id || '00000000-0000-0000-0000-000000000001'
      });

    if (renderError) {
      console.error('Error rendering template:', renderError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to render email template',
          details: renderError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!templateData || templateData.length === 0 || !templateData[0].success) {
      console.error('Template rendering failed:', templateData?.[0]?.error_message);
      return new Response(
        JSON.stringify({ 
          error: templateData?.[0]?.error_message || 'Template not found or rendering failed'
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const renderedTemplate = templateData[0];
    console.log('Template rendered successfully:', {
      subject: renderedTemplate.subject,
      hasHtml: !!renderedTemplate.html
    });

    // Get email provider configuration
    const { data: emailProviders, error: providerError } = await supabase
      .from('email_providers')
      .select('config, from_email, from_name, type')
      .eq('enabled', true)
      .eq('is_primary', true)
      .single();

    if (providerError || !emailProviders) {
      console.error('No email provider configured:', providerError);
      return new Response(
        JSON.stringify({ 
          error: 'No email provider configured. Please configure an email provider first.' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Send email based on provider type
    let emailResponse;
    if (emailProviders.type === 'sendgrid') {
      // SendGrid implementation
      const sendgridApiKey = emailProviders.config?.apiKey;
      if (!sendgridApiKey) {
        return new Response(
          JSON.stringify({ 
            error: 'SendGrid API key not found in provider configuration' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const sendgridData = {
        personalizations: [
          {
            to: [{ email: to }],
            subject: renderedTemplate.subject,
          },
        ],
        from: {
          email: emailProviders.from_email || "noreply@yourdomain.com",
          name: emailProviders.from_name || "UltaAI System"
        },
        content: [
          {
            type: "text/html",
            value: renderedTemplate.html,
          },
        ],
      };

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sendgridData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('SendGrid API Error:', errorData);
        throw new Error(`SendGrid API error: ${response.status} - ${errorData}`);
      }

      emailResponse = { provider: 'sendgrid', status: 'sent' };

    } else if (emailProviders.type === 'resend') {
      // Resend implementation (if you want to add Resend support)
      const resendApiKey = emailProviders.config?.apiKey;
      if (!resendApiKey) {
        return new Response(
          JSON.stringify({ 
            error: 'Resend API key not found in provider configuration' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const resendData = {
        from: `${emailProviders.from_name || "UltaAI System"} <${emailProviders.from_email || "noreply@yourdomain.com"}>`,
        to: [to],
        subject: renderedTemplate.subject,
        html: renderedTemplate.html,
      };

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resendData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Resend API Error:', errorData);
        throw new Error(`Resend API error: ${response.status} - ${errorData}`);
      }

      const resendResponse = await response.json();
      emailResponse = { provider: 'resend', status: 'sent', id: resendResponse.id };

    } else {
      throw new Error(`Unsupported email provider: ${emailProviders.type}`);
    }

    // Log email send event
    await supabase
      .from('email_logs')
      .insert({
        email: to,
        type: templateKey,
        subject: renderedTemplate.subject,
        status: 'sent',
        sent_at: new Date().toISOString(),
        provider: emailProviders.type,
        template_key: templateKey
      });

    console.log('Email sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        templateKey,
        recipient: to,
        subject: renderedTemplate.subject,
        provider: emailProviders.type
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in dynamic-email-send function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});