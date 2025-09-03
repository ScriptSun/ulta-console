import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { SenderIdentityCard } from '@/components/email-branding/SenderIdentityCard';
import { EmailTemplatesTable } from '@/components/email-branding/EmailTemplatesTable';
import { EmailTemplateEditor } from '@/components/email-branding/EmailTemplateEditor';
import { EmailTemplate } from '@/types/emailBrandingTypes';

export default function EmailBranding() {
  const { 
    brandingSettings, 
    templates, 
    loading, 
    saving,
    saveBrandingSettings,
    saveTemplate,
    duplicateTemplate
  } = useEmailBranding();

  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setEditingTemplate(null);
    setEditorOpen(false);
  };

  const handleSaveTemplate = async (templateId: string, updates: Partial<EmailTemplate>) => {
    await saveTemplate(templateId, updates);
    setEditorOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Loading email branding...</h3>
            <p className="text-sm text-muted-foreground">Setting up your email templates</p>
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
          Email Branding
        </h1>
        <p className="text-muted-foreground">
          Configure sender identity and customize email templates for your organization
        </p>
      </div>

      {/* Sender Identity Card */}
      <SenderIdentityCard 
        settings={brandingSettings}
        onSave={saveBrandingSettings}
        saving={saving}
      />

      {/* Email Templates Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Email Templates
              </CardTitle>
              <CardDescription>
                Manage and customize email templates for different events
              </CardDescription>
            </div>
            <Button 
              variant="outline"
              onClick={() => {
                // Create new generic template
                const newTemplate: EmailTemplate = {
                  id: 'new',
                  name: 'New Template',
                  slug: 'new-template',
                  subject: 'New Email Template',
                  preheader: 'Your new email template',
                  category: 'transactional',
                  colors: { useTheme: true },
                  mjml: `<mjml>
<mj-head>
<mj-attributes>
<mj-all font-family="Inter, Arial, sans-serif" />
<mj-text color="{{colors.text}}" font-size="14px" />
<mj-button background-color="{{colors.accent}}" color="#ffffff" border-radius="8px" />
</mj-attributes>
</mj-head>
<mj-body background-color="#ffffff">
<mj-section><mj-column>
<mj-text font-size="16px" font-weight="600">Your New Template</mj-text>
<mj-text>This is your new email template. Edit the content as needed.</mj-text>
</mj-column></mj-section>
</mj-body>
</mjml>`,
                  variables: {},
                  version: 1,
                  updatedAt: new Date().toISOString(),
                  updatedBy: { id: 'current', name: 'You' }
                };
                handleEditTemplate(newTemplate);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <EmailTemplatesTable 
            templates={templates}
            onEdit={handleEditTemplate}
            onDuplicate={duplicateTemplate}
            loading={saving}
          />
        </CardContent>
      </Card>

      {/* Template Editor */}
      {editingTemplate && (
        <EmailTemplateEditor
          template={editingTemplate}
          open={editorOpen}
          onClose={handleCloseEditor}
          onSave={handleSaveTemplate}
          brandingSettings={brandingSettings}
        />
      )}
    </div>
  );
}