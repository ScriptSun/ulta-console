import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Save,
  ArrowLeft,
  Eye,
  Send,
  Settings,
  TestTube,
  Loader2,
  FileText,
  Variable,
  Plus,
  X
} from 'lucide-react';
import { EmailTemplate } from '@/types/eventTypes';
import { useEventTemplates } from '@/hooks/useEventTemplates';
import { useToast } from '@/hooks/use-toast';

const CATEGORIES = [
  { key: 'security', label: 'Security', color: 'bg-red-100 text-red-800' },
  { key: 'account', label: 'Account', color: 'bg-blue-100 text-blue-800' },
  { key: 'agents', label: 'Agents', color: 'bg-green-100 text-green-800' },
  { key: 'billing', label: 'Billing', color: 'bg-purple-100 text-purple-800' },
  { key: 'system', label: 'System', color: 'bg-gray-100 text-gray-800' },
  { key: 'notifications', label: 'Notifications', color: 'bg-yellow-100 text-yellow-800' }
];

const STATUSES = [
  { key: 'active', label: 'Active' },
  { key: 'draft', label: 'Draft' },
  { key: 'archived', label: 'Archived' }
];

const LOCALES = [
  { key: 'en', label: 'English' },
  { key: 'es', label: 'Spanish' },
  { key: 'fr', label: 'French' },
  { key: 'de', label: 'German' }
];

const PROVIDERS = [
  { key: 'sendgrid', label: 'SendGrid' },
  { key: 'postmark', label: 'Postmark' },
  { key: 'mailgun', label: 'Mailgun' },
  { key: 'ses', label: 'Amazon SES' }
];

export default function EventTemplateEdit() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { templates, saveTemplate, testTemplate, loading } = useEventTemplates();
  const { toast } = useToast();
  
  const isNew = templateId === 'new';
  const [saving, setSaving] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testData, setTestData] = useState<Record<string, any>>({});
  const [previewHtml, setPreviewHtml] = useState('');
  
  const [editedTemplate, setEditedTemplate] = useState<Partial<EmailTemplate>>({
    name: '',
    key: '',
    category: 'system',
    locale: 'en',
    status: 'draft',
    subject: '',
    html: '',
    preheader: '',
    variables: [],
    provider: {}
  });

  // Extract variables from template content
  const extractedVariables = React.useMemo(() => {
    const variables = new Set<string>();
    const content = `${editedTemplate.subject || ''} ${editedTemplate.html || ''} ${editedTemplate.preheader || ''}`;
    const matches = content.match(/\{\{\s*([^}]+)\s*\}\}/g);
    
    if (matches) {
      matches.forEach(match => {
        const variable = match.replace(/[{}]/g, '').trim();
        variables.add(variable);
      });
    }
    
    return Array.from(variables);
  }, [editedTemplate.subject, editedTemplate.html, editedTemplate.preheader]);

  useEffect(() => {
    if (!isNew && !loading && templates.length > 0) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setEditedTemplate(template);
        // Initialize test data with example values
        const initialTestData: Record<string, any> = {};
        extractedVariables.forEach(variable => {
          initialTestData[variable] = `Sample ${variable}`;
        });
        setTestData(initialTestData);
      }
    }
  }, [templateId, templates, loading, isNew, extractedVariables]);

  // Generate preview HTML by replacing variables
  useEffect(() => {
    let html = editedTemplate.html || '';
    
    // Replace variables with test data
    extractedVariables.forEach(variable => {
      const testValue = testData[variable] || `{{${variable}}}`;
      const regex = new RegExp(`\\{\\{\\s*${variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}\\}`, 'g');
      html = html.replace(regex, testValue);
    });
    
    setPreviewHtml(html);
  }, [editedTemplate.html, testData, extractedVariables]);

  const handleSave = async () => {
    if (!editedTemplate.name || !editedTemplate.key || !editedTemplate.subject) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setSaving(true);
      const savedTemplate = await saveTemplate(editedTemplate);
      toast({
        title: "Template saved",
        description: `Template "${editedTemplate.name}" has been saved successfully`,
      });
      
      if (isNew) {
        navigate(`/system-settings/brand/email/events/edit/${savedTemplate.id}`);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!templateId || isNew) {
      toast({
        title: "Error",
        description: "Please save the template before testing",
        variant: "destructive"
      });
      return;
    }

    if (!testEmail) {
      toast({
        title: "Error",
        description: "Please enter a test email address",
        variant: "destructive"
      });
      return;
    }

    try {
      await testTemplate(templateId, testEmail, testData);
      toast({
        title: "Test email sent",
        description: `Test email sent to ${testEmail}`,
      });
      setShowTestDialog(false);
    } catch (error) {
      console.error('Error sending test:', error);
      toast({
        title: "Error",
        description: "Failed to send test email",
        variant: "destructive"
      });
    }
  };

  const handleTestDataChange = (variable: string, value: string) => {
    setTestData(prev => ({
      ...prev,
      [variable]: value
    }));
  };

  if (loading && !isNew) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Loading template...</h3>
            <p className="text-sm text-muted-foreground">Setting up the editor</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/system-settings/brand/email')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Templates
              </Button>
              <div>
                <h1 className="text-xl font-semibold">
                  {isNew ? 'New Event Template' : editedTemplate.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isNew ? 'Create a new email template' : 'Edit email template'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {!isNew && (
                <Button variant="outline" size="sm" onClick={() => setShowTestDialog(true)}>
                  <Send className="h-4 w-4 mr-2" />
                  Test
                </Button>
              )}
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="content">
              <FileText className="h-4 w-4 mr-2" />
              Content
            </TabsTrigger>
            <TabsTrigger value="variables">
              <Variable className="h-4 w-4 mr-2" />
              Variables
            </TabsTrigger>
            <TabsTrigger value="provider">
              <Settings className="h-4 w-4 mr-2" />
              Provider
            </TabsTrigger>
          </TabsList>

          <div className="mt-8">
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Configure the template's basic properties</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Template Name *</Label>
                      <Input
                        id="name"
                        value={editedTemplate.name || ''}
                        onChange={(e) => setEditedTemplate(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Template name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="key">Template Key *</Label>
                      <Input
                        id="key"
                        value={editedTemplate.key || ''}
                        onChange={(e) => setEditedTemplate(prev => ({ ...prev, key: e.target.value }))}
                        placeholder="template_key"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={editedTemplate.category || 'system'}
                        onValueChange={(value) => setEditedTemplate(prev => ({ ...prev, category: value as "security" | "account" | "agents" | "billing" | "system" }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(category => (
                            <SelectItem key={category.key} value={category.key}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="locale">Locale</Label>
                      <Select
                        value={editedTemplate.locale || 'en'}
                        onValueChange={(value) => setEditedTemplate(prev => ({ ...prev, locale: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LOCALES.map(locale => (
                            <SelectItem key={locale.key} value={locale.key}>
                              {locale.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={editedTemplate.status || 'draft'}
                        onValueChange={(value) => setEditedTemplate(prev => ({ ...prev, status: value as 'active' | 'draft' | 'archived' }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map(status => (
                            <SelectItem key={status.key} value={status.key}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject Line *</Label>
                    <Input
                      id="subject"
                      value={editedTemplate.subject || ''}
                      onChange={(e) => setEditedTemplate(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Email subject line"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preheader">Preheader</Label>
                    <Input
                      id="preheader"
                      value={editedTemplate.preheader || ''}
                      onChange={(e) => setEditedTemplate(prev => ({ ...prev, preheader: e.target.value }))}
                      placeholder="Preview text that appears after the subject line"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="content" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>HTML Content</CardTitle>
                    <CardDescription>Edit the template's HTML content</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={editedTemplate.html || ''}
                      onChange={(e) => setEditedTemplate(prev => ({ ...prev, html: e.target.value }))}
                      placeholder="HTML content of the email template..."
                      className="min-h-[400px] font-mono text-sm"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Preview
                    </CardTitle>
                    <CardDescription>Preview of the rendered template</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="border rounded-lg p-4 min-h-[400px] bg-background"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="variables" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Available Template Variables</CardTitle>
                  <CardDescription>Variables detected in your template content</CardDescription>
                </CardHeader>
                <CardContent>
                  {extractedVariables.length > 0 ? (
                    <div className="space-y-4">
                      {extractedVariables.map(variable => (
                        <div key={variable} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="font-mono">
                              {`{{${variable}}}`}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {variable.charAt(0).toUpperCase() + variable.slice(1).replace(/[_-]/g, ' ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Variable className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No variables detected in your template content</p>
                      <p className="text-sm">Add variables using the format: <code className="bg-muted px-1 rounded">{'{{variable_name}}'}</code></p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="provider" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Provider Overrides</CardTitle>
                  <CardDescription>Specify provider-specific template IDs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {PROVIDERS.filter(provider => provider.key !== 'ses').map(provider => (
                    <div key={provider.key} className="space-y-2">
                      <Label htmlFor={`provider-${provider.key}`}>
                        {provider.label} Template ID
                      </Label>
                      <Input
                        id={`provider-${provider.key}`}
                        value={
                          provider.key === 'sendgrid' ? editedTemplate.provider?.sendgridTemplateId || '' :
                          provider.key === 'postmark' ? editedTemplate.provider?.postmarkTemplateId || '' :
                          provider.key === 'mailgun' ? editedTemplate.provider?.mailgunTemplate || '' :
                          ''
                        }
                        onChange={(e) => setEditedTemplate(prev => ({
                          ...prev,
                          provider: {
                            ...prev.provider,
                            ...(provider.key === 'sendgrid' && { sendgridTemplateId: e.target.value }),
                            ...(provider.key === 'postmark' && { postmarkTemplateId: e.target.value }),
                            ...(provider.key === 'mailgun' && { mailgunTemplate: e.target.value })
                          }
                        }))}
                        placeholder={`${provider.label} template ID`}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Test Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test email to verify the template rendering
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Test Email Address</Label>
              <Input
                id="test-email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>

            {extractedVariables.length > 0 && (
              <div className="space-y-2">
                <Label>Test Data</Label>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {extractedVariables.map(variable => (
                    <div key={variable} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center">
                      <Label className="font-mono text-sm">
                        {`{{${variable}}}`}
                      </Label>
                      <Input
                        value={testData[variable] || ''}
                        onChange={(e) => handleTestDataChange(variable, e.target.value)}
                        placeholder={`Test value for ${variable}`}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleTest}>
              <Send className="h-4 w-4 mr-2" />
              Send Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}