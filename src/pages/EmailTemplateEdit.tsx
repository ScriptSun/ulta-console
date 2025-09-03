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
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Save,
  ArrowLeft,
  Eye,
  Send,
  Palette,
  Code,
  Settings,
  TestTube,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { EmailTemplate, EmailBrandingSpec } from '@/types/emailBrandingTypes';
import { useEmailBranding } from '@/hooks/useEmailBranding';
import { useToast } from '@/hooks/use-toast';

export default function EmailTemplateEdit() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { templates, brandingSettings, saveTemplate, loading } = useEmailBranding();
  const { toast } = useToast();
  
  const [editedTemplate, setEditedTemplate] = useState<EmailTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testData, setTestData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && templates.length > 0) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setEditedTemplate(template);
        // Initialize test data with example values
        const initialTestData: Record<string, string> = {};
        Object.entries(template.variables).forEach(([key, config]) => {
          if (config.example) {
            initialTestData[key] = config.example;
          }
        });
        setTestData(initialTestData);
      } else if (templateId === 'new') {
        // Create new template
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
        setEditedTemplate(newTemplate);
      }
    }
  }, [templateId, templates, loading]);

  // Mock MJML rendering - in real app this would call an API
  useEffect(() => {
    if (!editedTemplate) return;
    
    const renderPreview = () => {
      try {
        // Simple mock conversion of MJML to HTML
        let html = editedTemplate.mjml
          .replace(/<mjml>/g, '<div style="max-width: 600px; margin: 0 auto; font-family: Inter, Arial, sans-serif;">')
          .replace(/<\/mjml>/g, '</div>')
          .replace(/<mj-body[^>]*>/g, '<div>')
          .replace(/<\/mj-body>/g, '</div>')
          .replace(/<mj-section[^>]*>/g, '<div style="padding: 20px;">')
          .replace(/<\/mj-section>/g, '</div>')
          .replace(/<mj-column[^>]*>/g, '<div>')
          .replace(/<\/mj-column>/g, '</div>')
          .replace(/<mj-text[^>]*>/g, '<p>')
          .replace(/<\/mj-text>/g, '</p>')
          .replace(/<mj-button[^>]*href="([^"]*)"[^>]*>/g, '<a href="$1" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">')
          .replace(/<\/mj-button>/g, '</a>')
          .replace(/<mj-image[^>]*src="([^"]*)"[^>]*>/g, '<img src="$1" style="max-width: 100%; height: auto;" />')
          .replace(/<mj-head>[\s\S]*?<\/mj-head>/g, '');

        // Replace variables with test data
        Object.entries(testData).forEach(([key, value]) => {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          html = html.replace(regex, value);
        });

        // Replace brand variables
        if (brandingSettings) {
          html = html.replace(/\{\{brand\.name\}\}/g, 'Your Company');
          html = html.replace(/\{\{assets\.emailLogo\}\}/g, brandingSettings.senderEmail);
          
          if (editedTemplate.colors.useTheme) {
            html = html.replace(/\{\{colors\.headerBg\}\}/g, brandingSettings.colors.headerBg);
            html = html.replace(/\{\{colors\.text\}\}/g, brandingSettings.colors.text);
            html = html.replace(/\{\{colors\.accent\}\}/g, brandingSettings.colors.accent);
          } else {
            html = html.replace(/\{\{colors\.headerBg\}\}/g, editedTemplate.colors.headerBg || '#000000');
            html = html.replace(/\{\{colors\.text\}\}/g, editedTemplate.colors.text || '#333333');
            html = html.replace(/\{\{colors\.accent\}\}/g, editedTemplate.colors.accent || '#2563eb');
          }
        }

        setPreviewHtml(html);
        
        // Check for warnings
        const newWarnings: string[] = [];
        if (html.includes('{{')) {
          newWarnings.push('Some variables are not defined in test data');
        }
        if (html.includes('http://')) {
          newWarnings.push('Non-HTTPS images detected');
        }
        setWarnings(newWarnings);
      } catch (error) {
        setPreviewHtml('<p style="color: red;">Error rendering preview</p>');
        setWarnings(['Failed to render MJML template']);
      }
    };

    renderPreview();
  }, [editedTemplate, testData, brandingSettings]);

  const handleSave = async () => {
    if (!editedTemplate) return;
    
    try {
      setSaving(true);
      await saveTemplate(templateId!, {
        name: editedTemplate.name,
        subject: editedTemplate.subject,
        preheader: editedTemplate.preheader,
        category: editedTemplate.category,
        colors: editedTemplate.colors,
        mjml: editedTemplate.mjml,
        variables: editedTemplate.variables,
        slug: editedTemplate.slug
      });
      toast({
        title: "Template saved",
        description: "Email template has been updated successfully",
      });
      navigate('/system-settings/brand/email');
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleColorChange = (colorType: 'headerBg' | 'text' | 'accent', value: string) => {
    if (!editedTemplate) return;
    setEditedTemplate(prev => prev ? ({
      ...prev,
      colors: {
        ...prev.colors,
        [colorType]: value
      }
    }) : prev);
  };

  const handleTestDataChange = (key: string, value: string) => {
    setTestData(prev => ({ ...prev, [key]: value }));
  };

  const isHexColor = (color: string) => /^#[0-9A-F]{6}$/i.test(color);

  if (loading || !editedTemplate) {
    return (
      <div className="flex items-center justify-center py-12">
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/system-settings/brand/email')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Template: {editedTemplate.name}</h1>
            <p className="text-muted-foreground">
              Customize your email template with MJML editor and live preview
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Template
        </Button>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="colors">
            <Palette className="h-4 w-4 mr-2" />
            Colors
          </TabsTrigger>
          <TabsTrigger value="content">
            <Code className="h-4 w-4 mr-2" />
            Content
          </TabsTrigger>
          <TabsTrigger value="variables">
            <TestTube className="h-4 w-4 mr-2" />
            Variables
          </TabsTrigger>
          <TabsTrigger value="test">
            <Send className="h-4 w-4 mr-2" />
            Test
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Template Settings</CardTitle>
                <CardDescription>Configure basic template properties</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject Line</Label>
                  <Input
                    id="subject"
                    value={editedTemplate.subject}
                    onChange={(e) => setEditedTemplate(prev => prev ? ({ ...prev, subject: e.target.value }) : prev)}
                    placeholder="Email subject line"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="preheader">Preheader Text</Label>
                  <Input
                    id="preheader"
                    value={editedTemplate.preheader || ''}
                    onChange={(e) => setEditedTemplate(prev => prev ? ({ ...prev, preheader: e.target.value }) : prev)}
                    placeholder="Preview text shown in email clients"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={editedTemplate.category} 
                    onValueChange={(value: 'transactional' | 'marketing') => 
                      setEditedTemplate(prev => prev ? ({ ...prev, category: value }) : prev)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transactional">Transactional</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="colors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Color Configuration</CardTitle>
                <CardDescription>Customize the colors for your email template</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="use-theme"
                    checked={editedTemplate.colors.useTheme}
                    onCheckedChange={(checked) => setEditedTemplate(prev => prev ? ({
                      ...prev,
                      colors: { ...prev.colors, useTheme: checked }
                    }) : prev)}
                  />
                  <Label htmlFor="use-theme">Use theme colors</Label>
                </div>

                {!editedTemplate.colors.useTheme && (
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="header-bg">Header Background</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="header-bg"
                          type="color"
                          value={editedTemplate.colors.headerBg || '#000000'}
                          onChange={(e) => handleColorChange('headerBg', e.target.value)}
                          className="w-20 h-10"
                        />
                        <Input
                          value={editedTemplate.colors.headerBg || '#000000'}
                          onChange={(e) => handleColorChange('headerBg', e.target.value)}
                          placeholder="#000000"
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="text-color">Text Color</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="text-color"
                          type="color"
                          value={editedTemplate.colors.text || '#333333'}
                          onChange={(e) => handleColorChange('text', e.target.value)}
                          className="w-20 h-10"
                        />
                        <Input
                          value={editedTemplate.colors.text || '#333333'}
                          onChange={(e) => handleColorChange('text', e.target.value)}
                          placeholder="#333333"
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accent-color">Accent Color</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="accent-color"
                          type="color"
                          value={editedTemplate.colors.accent || '#2563eb'}
                          onChange={(e) => handleColorChange('accent', e.target.value)}
                          className="w-20 h-10"
                        />
                        <Input
                          value={editedTemplate.colors.accent || '#2563eb'}
                          onChange={(e) => handleColorChange('accent', e.target.value)}
                          placeholder="#2563eb"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>MJML Editor</CardTitle>
                  <CardDescription>Edit your email template using MJML</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={editedTemplate.mjml}
                    onChange={(e) => setEditedTemplate(prev => prev ? ({ ...prev, mjml: e.target.value }) : prev)}
                    className="min-h-[500px] font-mono text-sm"
                    placeholder="Enter your MJML code here..."
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Live Preview</CardTitle>
                  <CardDescription>See how your email will look</CardDescription>
                </CardHeader>
                <CardContent>
                  {warnings.length > 0 && (
                    <div className="mb-4 space-y-2">
                      {warnings.map((warning, index) => (
                        <div key={index} className="flex items-center gap-2 text-amber-600 text-sm">
                          <AlertTriangle className="h-4 w-4" />
                          {warning}
                        </div>
                      ))}
                    </div>
                  )}
                  <div 
                    className="border rounded-lg p-4 min-h-[500px] bg-white overflow-auto"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="variables" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Template Variables</CardTitle>
                <CardDescription>Configure variables and test data for preview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(editedTemplate.variables).length > 0 ? (
                  Object.entries(editedTemplate.variables).map(([key, config]) => (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label>{key}</Label>
                        {config.required && (
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <Input
                        value={testData[key] || ''}
                        onChange={(e) => handleTestDataChange(key, e.target.value)}
                        placeholder={config.example || `Enter ${key}`}
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No variables defined for this template</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="test" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Send Test Email</CardTitle>
                <CardDescription>Send a test email to verify the template</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="test-email">To Email</Label>
                  <Input
                    id="test-email"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                  />
                </div>
                <Button disabled>
                  <Send className="h-4 w-4 mr-2" />
                  Send Test (Coming Soon)
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}