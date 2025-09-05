import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mail,
  Settings,
  Plus,
  FileText,
  Copy,
  Download,
  RotateCcw,
  Edit,
  Loader2
} from 'lucide-react';
import { useEmailBranding } from '@/hooks/useEmailBranding';
import { useEventTemplates } from '@/hooks/useEventTemplates';
import { SenderIdentityCard } from '@/components/email-branding/SenderIdentityCard';
import { EmailTemplatesTable } from '@/components/email-branding/EmailTemplatesTable';
import EventTemplatesTable from '@/components/email-templates/EventTemplatesTable';
import EventTemplateEditor from '@/components/email-templates/EventTemplateEditor';
import { EmailTemplate } from '@/types/eventTypes';

export default function EmailBranding() {
  const navigate = useNavigate();
  const { 
    brandingSettings, 
    templates, 
    loading, 
    saving,
    saveBrandingSettings,
    duplicateTemplate
  } = useEmailBranding();

  const {
    templates: eventTemplates,
    events,
    loading: templatesLoading,
    saving: templatesSaving,
    saveTemplate,
    duplicateTemplate: duplicateEventTemplate,
    archiveTemplate,
    testTemplate,
    seedTemplates
  } = useEventTemplates();

  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);

  const handleEditTemplate = (template: EmailTemplate | {}) => {
    if ('id' in template) {
      setSelectedTemplate(template as EmailTemplate);
    } else {
      setSelectedTemplate(null);
    }
    setShowTemplateEditor(true);
  };

  const handleCloseEditor = () => {
    setShowTemplateEditor(false);
    setSelectedTemplate(null);
  };

  const handleSaveTemplate = async (template: Partial<EmailTemplate>) => {
    const savedTemplate = await saveTemplate(template);
    return savedTemplate;
  };

  if (loading || templatesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Loading email system...</h3>
            <p className="text-sm text-muted-foreground">Setting up email branding and templates</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Mail className="h-8 w-8 text-primary" />
          Email Branding & Templates
        </h1>
        <p className="text-muted-foreground">
          Configure sender identity and manage email templates for notification events
        </p>
      </div>

      {/* Sender Identity Card */}
      <SenderIdentityCard 
        settings={brandingSettings}
        onSave={saveBrandingSettings}
        saving={saving}
      />

      {/* Templates Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Email Templates
          </CardTitle>
          <CardDescription>
            Manage notification email templates and traditional email templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="event-templates" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="event-templates">Event Templates</TabsTrigger>
              <TabsTrigger value="traditional-templates">Traditional Templates</TabsTrigger>
            </TabsList>
            
            <TabsContent value="event-templates" className="mt-6">
              <EventTemplatesTable
                templates={eventTemplates}
                onEdit={handleEditTemplate}
                onDuplicate={duplicateEventTemplate}
                onArchive={archiveTemplate}
                onTest={(template) => {
                  // Open test dialog
                  setSelectedTemplate(template);
                  setShowTemplateEditor(true);
                }}
                onSeedTemplates={seedTemplates}
                loading={templatesLoading}
              />
            </TabsContent>
            
            <TabsContent value="traditional-templates" className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium">Traditional Email Templates</h3>
                  <p className="text-sm text-muted-foreground">
                    MJML-based templates for general email communications
                  </p>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/system-settings/brand/email/edit/new')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </div>
              <EmailTemplatesTable 
                templates={templates}
                onDuplicate={duplicateTemplate}
                loading={saving}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Template Editor */}
      <EventTemplateEditor
        template={selectedTemplate || undefined}
        open={showTemplateEditor}
        onClose={handleCloseEditor}
        onSave={handleSaveTemplate}
        onTest={testTemplate}
      />
    </div>
  );
}