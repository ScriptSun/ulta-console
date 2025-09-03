import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EmailBrandingSpec, EmailTemplate, EmailTemplateVersion } from '@/types/emailBrandingTypes';

export function useEmailBranding() {
  const [brandingSettings, setBrandingSettings] = useState<EmailBrandingSpec | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadBrandingSettings = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get user's customer ID (simplified - in real app you'd get this from user context)
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('customer_id')
        .limit(1)
        .single();

      if (!userRoles) {
        throw new Error('No customer found');
      }

      const customerId = userRoles.customer_id;

      // Load branding settings
      const { data: settings, error: settingsError } = await supabase
        .from('email_branding_settings')
        .select('*')
        .eq('customer_id', customerId)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }

      if (settings) {
        setBrandingSettings({
          id: settings.id,
          senderName: settings.sender_name,
          senderEmail: settings.sender_email,
          colors: settings.colors as { headerBg: string; text: string; accent: string; useTheme: boolean },
          spf: {
            status: settings.spf_status as "ok" | "pending" | "missing",
            record: settings.spf_record
          },
          dkim: {
            status: settings.dkim_status as "ok" | "pending" | "missing",
            selector: settings.dkim_selector,
            host: settings.dkim_host,
            record: settings.dkim_record
          },
          updatedAt: settings.updated_at,
          customerId: settings.customer_id
        });
      } else {
        // Initialize default templates if none exist
        await supabase.rpc('initialize_default_email_templates', {
          _customer_id: customerId
        });

        // Load the newly created settings
        const { data: newSettings } = await supabase
          .from('email_branding_settings')
          .select('*')
          .eq('customer_id', customerId)
          .single();

        if (newSettings) {
          setBrandingSettings({
            id: newSettings.id,
            senderName: newSettings.sender_name,
            senderEmail: newSettings.sender_email,
            colors: newSettings.colors as { headerBg: string; text: string; accent: string; useTheme: boolean },
            spf: {
              status: newSettings.spf_status as "ok" | "pending" | "missing",
              record: newSettings.spf_record
            },
            dkim: {
              status: newSettings.dkim_status as "ok" | "pending" | "missing",
              selector: newSettings.dkim_selector,
              host: newSettings.dkim_host,
              record: newSettings.dkim_record
            },
            updatedAt: newSettings.updated_at,
            customerId: newSettings.customer_id
          });
        }
      }

      // Load templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('email_templates')
        .select(`
          id,
          name,
          slug,
          subject,
          preheader,
          category,
          colors,
          mjml,
          variables,
          version,
          updated_at,
          updated_by,
          customer_id,
          status
        `)
        .eq('customer_id', customerId)
        .eq('status', 'active')
        .order('name');

      if (templatesError) {
        throw templatesError;
      }

      if (templatesData) {
        setTemplates(templatesData.map(template => ({
          id: template.id,
          name: template.name,
          slug: template.slug,
          subject: template.subject,
          preheader: template.preheader,
          category: template.category as "transactional" | "marketing",
          colors: template.colors as { headerBg?: string; text?: string; accent?: string; useTheme: boolean },
          mjml: template.mjml,
          variables: template.variables as Record<string, { required: boolean; example?: string }>,
          version: template.version,
          updatedAt: template.updated_at,
          updatedBy: {
            id: template.updated_by,
            name: 'User' // In real app, you'd join with profiles table
          },
          customerId: template.customer_id,
          status: template.status as "active" | "archived"
        })));
      }
    } catch (error: any) {
      console.error('Error loading email branding:', error);
      toast({
        title: "Loading error",
        description: "Failed to load email branding settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const saveBrandingSettings = useCallback(async (settings: Partial<EmailBrandingSpec>) => {
    try {
      setSaving(true);
      
      if (!brandingSettings?.customerId) {
        throw new Error('No customer ID found');
      }

      const updateData: any = {};
      
      if (settings.senderName !== undefined) updateData.sender_name = settings.senderName;
      if (settings.senderEmail !== undefined) updateData.sender_email = settings.senderEmail;
      if (settings.colors !== undefined) updateData.colors = settings.colors;

      const { error } = await supabase
        .from('email_branding_settings')
        .update(updateData)
        .eq('customer_id', brandingSettings.customerId);

      if (error) throw error;

      // Reload settings
      await loadBrandingSettings();

      toast({
        title: "Settings saved",
        description: "Email branding settings have been updated",
      });
    } catch (error: any) {
      console.error('Error saving branding settings:', error);
      toast({
        title: "Save error",
        description: "Failed to save email branding settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [brandingSettings, loadBrandingSettings, toast]);

  const saveTemplate = useCallback(async (templateId: string, updates: Partial<EmailTemplate>) => {
    try {
      setSaving(true);
      
      // Handle new template creation
      if (templateId === 'new') {
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('customer_id')
          .limit(1)
          .single();

        if (!userRoles) {
          throw new Error('No customer found');
        }

        const { data, error } = await supabase
          .from('email_templates')
          .insert({
            customer_id: userRoles.customer_id,
            name: updates.name || 'New Template',
            slug: updates.slug || 'new-template',
            subject: updates.subject || 'New Email Template',
            preheader: updates.preheader || 'Your new email template',
            category: updates.category || 'transactional',
            colors: updates.colors || { useTheme: true },
            mjml: updates.mjml || '<mjml><mj-body><mj-section><mj-column><mj-text>Your new template content</mj-text></mj-column></mj-section></mj-body></mjml>',
            variables: updates.variables || {},
            created_by: userRoles.customer_id,
            updated_by: userRoles.customer_id
          })
          .select()
          .single();

        if (error) throw error;
      } else {
        // Update existing template
        const updateData: any = {};
        
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.subject !== undefined) updateData.subject = updates.subject;
        if (updates.preheader !== undefined) updateData.preheader = updates.preheader;
        if (updates.category !== undefined) updateData.category = updates.category;
        if (updates.colors !== undefined) updateData.colors = updates.colors;
        if (updates.mjml !== undefined) updateData.mjml = updates.mjml;
        if (updates.variables !== undefined) updateData.variables = updates.variables;
        
        // Increment version for content changes
        if (updates.mjml !== undefined || updates.subject !== undefined) {
          const currentTemplate = templates.find(t => t.id === templateId);
          if (currentTemplate) {
            updateData.version = currentTemplate.version + 1;
          }
        }

        const { error } = await supabase
          .from('email_templates')
          .update(updateData)
          .eq('id', templateId);

        if (error) throw error;
      }

      // Reload templates
      await loadBrandingSettings();

      toast({
        title: "Template saved",
        description: "Email template has been updated",
      });
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast({
        title: "Save error",
        description: "Failed to save email template",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [templates, loadBrandingSettings, toast]);

  const duplicateTemplate = useCallback(async (templateId: string) => {
    try {
      setSaving(true);
      
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');

      const { data, error } = await supabase
        .from('email_templates')
        .insert({
          customer_id: template.customerId,
          name: `${template.name} (Copy)`,
          slug: `${template.slug}-copy-${Date.now()}`,
          subject: template.subject,
          preheader: template.preheader,
          category: template.category,
          colors: template.colors,
          mjml: template.mjml,
          variables: template.variables
        })
        .select()
        .single();

      if (error) throw error;

      await loadBrandingSettings();

      toast({
        title: "Template duplicated",
        description: "Email template has been duplicated",
      });

      return data.id;
    } catch (error: any) {
      console.error('Error duplicating template:', error);
      toast({
        title: "Duplicate error",
        description: "Failed to duplicate email template",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [templates, loadBrandingSettings, toast]);

  useEffect(() => {
    loadBrandingSettings();
  }, [loadBrandingSettings]);

  return {
    brandingSettings,
    templates,
    loading,
    saving,
    loadBrandingSettings,
    saveBrandingSettings,
    saveTemplate,
    duplicateTemplate
  };
}