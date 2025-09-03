import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Save,
  X,
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

interface EmailTemplateEditorProps {
  template: EmailTemplate;
  open: boolean;
  onClose: () => void;
  onSave: (templateId: string, updates: Partial<EmailTemplate>) => Promise<void>;
  brandingSettings: EmailBrandingSpec | null;
}

export function EmailTemplateEditor({ 
  template, 
  open, 
  onClose, 
  onSave,
  brandingSettings 
}: EmailTemplateEditorProps) {
  const [editedTemplate, setEditedTemplate] = useState<EmailTemplate>(template);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testData, setTestData] = useState<Record<string, string>>({});

  useEffect(() => {
    setEditedTemplate(template);
    // Initialize test data with example values
    const initialTestData: Record<string, string> = {};
    Object.entries(template.variables).forEach(([key, config]) => {
      if (config.example) {
        initialTestData[key] = config.example;
      }
    });
    setTestData(initialTestData);
  }, [template]);

  // Mock MJML rendering - in real app this would call an API
  useEffect(() => {
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
    try {
      setSaving(true);
      await onSave(template.id, editedTemplate);
    } finally {
      setSaving(false);
    }
  };

  const handleColorChange = (colorType: 'headerBg' | 'text' | 'accent', value: string) => {
    setEditedTemplate(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [colorType]: value
      }
    }));
  };

  const handleTestDataChange = (key: string, value: string) => {
    setTestData(prev => ({ ...prev, [key]: value }));
  };

  const isHexColor = (color: string) => /^#[0-9A-F]{6}$/i.test(color);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full max-w-7xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Edit Template: {template.name}
          </SheetTitle>
          <SheetDescription>
            Customize your email template with MJML editor and live preview
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="settings" className="h-full flex flex-col">
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
                Variables
              </TabsTrigger>
              <TabsTrigger value="test">
                <TestTube className="h-4 w-4 mr-2" />
                Test
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="settings" className="space-y-4 mt-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject Line</Label>
                    <Input
                      id="subject"
                      value={editedTemplate.subject}
                      onChange={(e) => setEditedTemplate(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Email subject line"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="preheader">Preheader Text</Label>
                    <Input
                      id="preheader"
                      value={editedTemplate.preheader || ''}
                      onChange={(e) => setEditedTemplate(prev => ({ ...prev, preheader: e.target.value }))}
                      placeholder="Preview text shown in email clients"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={editedTemplate.category} 
                      onValueChange={(value: 'transactional' | 'marketing') => 
                        setEditedTemplate(prev => ({ ...prev, category: value }))
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
                </div>
              </TabsContent>

              <TabsContent value="colors" className="space-y-4 mt-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="use-theme"
                    checked={editedTemplate.colors.useTheme}
                    onCheckedChange={(checked) => 
                      setEditedTemplate(prev => ({
                        ...prev,
                        colors: { ...prev.colors, useTheme: checked }
                      }))
                    }
                  />
                  <Label htmlFor="use-theme">Use theme colors</Label>
                </div>

                {!editedTemplate.colors.useTheme && (
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="header-bg">Header Background</Label>
                      <div className="flex gap-2">
                        <Input
                          id="header-bg"
                          type="color"
                          value={editedTemplate.colors.headerBg || '#000000'}
                          onChange={(e) => handleColorChange('headerBg', e.target.value)}
                          className="w-20"
                        />
                        <Input
                          value={editedTemplate.colors.headerBg || '#000000'}
                          onChange={(e) => handleColorChange('headerBg', e.target.value)}
                          placeholder="#000000"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="text-color">Text Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="text-color"
                          type="color"
                          value={editedTemplate.colors.text || '#333333'}
                          onChange={(e) => handleColorChange('text', e.target.value)}
                          className="w-20"
                        />
                        <Input
                          value={editedTemplate.colors.text || '#333333'}
                          onChange={(e) => handleColorChange('text', e.target.value)}
                          placeholder="#333333"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accent-color">Accent Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="accent-color"
                          type="color"
                          value={editedTemplate.colors.accent || '#2563eb'}
                          onChange={(e) => handleColorChange('accent', e.target.value)}
                          className="w-20"
                        />
                        <Input
                          value={editedTemplate.colors.accent || '#2563eb'}
                          onChange={(e) => handleColorChange('accent', e.target.value)}
                          placeholder="#2563eb"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="content" className="mt-4 h-full">
                <div className="grid grid-cols-2 gap-4 h-full">
                  <div className="space-y-2">
                    <Label>MJML Code</Label>
                    <Textarea
                      value={editedTemplate.mjml}
                      onChange={(e) => setEditedTemplate(prev => ({ ...prev, mjml: e.target.value }))}
                      className="font-mono text-sm min-h-[500px] resize-none"
                      placeholder="Enter MJML code here..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Live Preview</Label>
                    <div className="border rounded-lg p-4 min-h-[500px] overflow-auto bg-white">
                      <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                    </div>
                    {warnings.length > 0 && (
                      <div className="space-y-2">
                        {warnings.map((warning, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm text-amber-600">
                            <AlertTriangle className="h-4 w-4" />
                            {warning}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="variables" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Required Variables</h4>
                    <div className="grid gap-2">
                      {Object.entries(template.variables)
                        .filter(([, config]) => config.required)
                        .map(([key, config]) => (
                          <div key={key} className="flex items-center gap-2">
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                            <code className="text-sm">{"{{" + key + "}}"}</code>
                            <span className="text-sm text-muted-foreground">
                              {config.example && `(e.g., ${config.example})`}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2">Optional Variables</h4>
                    <div className="grid gap-2">
                      {Object.entries(template.variables)
                        .filter(([, config]) => !config.required)
                        .map(([key, config]) => (
                          <div key={key} className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">Optional</Badge>
                            <code className="text-sm">{"{{" + key + "}}"}</code>
                            <span className="text-sm text-muted-foreground">
                              {config.example && `(e.g., ${config.example})`}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="test" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="test-email">Test Email Address</Label>
                    <Input
                      id="test-email"
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="your@email.com"
                    />
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2">Test Data</h4>
                    <div className="grid gap-3">
                      {Object.entries(template.variables).map(([key, config]) => (
                        <div key={key} className="space-y-1">
                          <Label htmlFor={`test-${key}`} className="flex items-center gap-2">
                            <code>{"{{" + key + "}}"}</code>
                            {config.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                          </Label>
                          <Input
                            id={`test-${key}`}
                            value={testData[key] || ''}
                            onChange={(e) => handleTestDataChange(key, e.target.value)}
                            placeholder={config.example || `Enter ${key}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button className="w-full" disabled={!testEmail}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Test Email
                  </Button>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Template
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}