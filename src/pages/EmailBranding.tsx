import React from 'react';
import { useNavigate } from 'react-router-dom';
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
              onClick={() => navigate('/system-settings/brand/email/edit/new')}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <EmailTemplatesTable 
            templates={templates}
            onDuplicate={duplicateTemplate}
            loading={saving}
          />
        </CardContent>
      </Card>
    </div>
  );
}