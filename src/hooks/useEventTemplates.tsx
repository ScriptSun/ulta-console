import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EmailTemplate, EventInfo } from '@/types/eventTypes';
import { buildApiUrl, apiEndpoints, supabaseConfig } from '@/lib/supabaseConfig';

export function useEventTemplates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load templates and events in parallel
      const [templatesResult, eventsResult] = await Promise.all([
        fetch(buildApiUrl(`${apiEndpoints.functions}/api-templates/api/templates`), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'apikey': supabaseConfig.anonKey,
            'Content-Type': 'application/json'
          }
        }).then(res => res.json()),
        fetch(buildApiUrl(`${apiEndpoints.functions}/api-notify-events/api/notify/events`), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'apikey': supabaseConfig.anonKey,
            'Content-Type': 'application/json'
          }
        }).then(res => res.json())
      ]);

      setTemplates(templatesResult || []);
      setEvents(eventsResult || []);
    } catch (error) {
      console.error('Error loading templates and events:', error);
      toast({
        title: "Error loading data",
        description: "Failed to load email templates and events. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (template: Partial<EmailTemplate>) => {
    setSaving(true);
    try {
      const session = await supabase.auth.getSession();
      const response = await fetch(buildApiUrl(`${apiEndpoints.functions}/api-templates/api/templates`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session?.access_token}`,
          'apikey': supabaseConfig.anonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(template)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save template');

      if (template.id) {
        // Update existing template
        setTemplates(prev => prev.map(t => t.id === template.id ? data : t));
        toast({
          title: "Template updated",
          description: `Template "${template.name}" has been updated successfully.`,
        });
      } else {
        // Add new template
        setTemplates(prev => [...prev, data]);
        toast({
          title: "Template created",
          description: `Template "${template.name}" has been created successfully.`,
        });
      }

      return data;
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error saving template",
        description: "Failed to save template. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const duplicateTemplate = async (templateId: string) => {
    setSaving(true);
    try {
      const session = await supabase.auth.getSession();
      const response = await fetch(buildApiUrl(`${apiEndpoints.functions}/api-templates/api/templates/duplicate`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session?.access_token}`,
          'apikey': supabaseConfig.anonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ templateId })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to duplicate template');

      setTemplates(prev => [...prev, data.template]);
      toast({
        title: "Template duplicated",
        description: `Template has been duplicated successfully.`,
      });

      return data.template;
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast({
        title: "Error duplicating template",
        description: "Failed to duplicate template. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const archiveTemplate = async (templateId: string) => {
    setSaving(true);
    try {
      const session = await supabase.auth.getSession();
      const response = await fetch(buildApiUrl(`${apiEndpoints.functions}/api-templates/api/templates/${templateId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.data.session?.access_token}`,
          'apikey': supabaseConfig.anonKey,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to archive template');
      }

      setTemplates(prev => prev.map(t => 
        t.id === templateId ? { ...t, status: 'archived' as const } : t
      ));

      toast({
        title: "Template archived",
        description: "Template has been archived successfully.",
      });
    } catch (error) {
      console.error('Error archiving template:', error);
      toast({
        title: "Error archiving template",
        description: error instanceof Error ? error.message : "Failed to archive template. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const testTemplate = async (templateId: string, to: string, variables: Record<string, any>) => {
    setSaving(true);
    try {
      const session = await supabase.auth.getSession();
      const response = await fetch(buildApiUrl(`${apiEndpoints.functions}/api-templates/api/templates/test`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session?.access_token}`,
          'apikey': supabaseConfig.anonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ templateId, to, variables })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send test email');

      toast({
        title: "Test email sent",
        description: `Test email has been sent to ${to}`,
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        title: "Error sending test email",
        description: "Failed to send test email. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const seedTemplates = async () => {
    setSaving(true);
    try {
      const session = await supabase.auth.getSession();
      const response = await fetch(buildApiUrl(`${apiEndpoints.functions}/api-templates/api/templates/seed`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session?.access_token}`,
          'apikey': supabaseConfig.anonKey,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to seed templates');

      if (data.created && data.created.length > 0) {
        await loadData(); // Reload templates
        toast({
          title: "Templates seeded",
          description: `Created ${data.created.length} default templates.`,
        });
      } else {
        toast({
          title: "No templates needed",
          description: "All default templates already exist.",
        });
      }

      return data.created || [];
    } catch (error) {
      console.error('Error seeding templates:', error);
      toast({
        title: "Error seeding templates",
        description: "Failed to create default templates. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const getTemplateUsage = (templateId: string) => {
    // This would need to be implemented based on notification policies
    // For now, return empty array
    return [];
  };

  const getTemplatesForCategory = (category: string, locale: string = 'en') => {
    return templates.filter(t => 
      t.category === category && 
      t.locale === locale && 
      t.status !== 'archived'
    );
  };

  return {
    templates,
    events,
    loading,
    saving,
    saveTemplate,
    duplicateTemplate,
    archiveTemplate,
    testTemplate,
    seedTemplates,
    getTemplateUsage,
    getTemplatesForCategory,
    reload: loadData
  };
}