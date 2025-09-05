import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EmailTemplate, TEMPLATE_VARIABLES, HTML_SKELETON } from '@/types/eventTypes';
import { Save, Send, X, Eye, Code, TestTube, Loader2 } from 'lucide-react';

interface EventTemplateEditorProps {
  template?: EmailTemplate;
  open: boolean;
  onClose: () => void;
  onSave: (template: Partial<EmailTemplate>) => Promise<EmailTemplate>;
  onTest: (templateId: string, to: string, variables: Record<string, any>) => Promise<void>;
}

const CATEGORIES = [
  { key: 'security', label: 'Security' },
  { key: 'account', label: 'Account' },
  { key: 'agents', label: 'Agents' },
  { key: 'billing', label: 'Billing' },
  { key: 'system', label: 'System' },
];

export default function EventTemplateEditor({
  template,
  open,
  onClose,
  onSave,
  onTest
}: EventTemplateEditorProps) {
  const [editedTemplate, setEditedTemplate] = useState<Partial<EmailTemplate>>({});
  const [previewHtml, setPreviewHtml] = useState('');
  const [saving, setSaving] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testData, setTestData] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (template) {
      setEditedTemplate(template);
    } else {
      setEditedTemplate({
        name: '',
        key: '',
        category: 'system',
        locale: 'en',
        status: 'draft',
        subject: '',
        preheader: '',
        html: '',
        text: '',
        variables: [],
        version: 1
      });
    }
  }, [template]);

  useEffect(() => {
    // Generate preview HTML
    if (editedTemplate.html) {
      let html = HTML_SKELETON.replace('{{content}}', editedTemplate.html);
      
      // Replace variables with sample data
      Object.entries(testData).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g');
        html = html.replace(regex, value);
      });
      
      setPreviewHtml(html);
    }
  }, [editedTemplate.html, testData]);

  useEffect(() => {
    // Initialize test data with sample values
    const initialTestData: Record<string, string> = {};
    Object.entries(TEMPLATE_VARIABLES).forEach(([key, description]) => {
      switch (key) {
        case 'org.name':
          initialTestData[key] = 'Acme Corp';
          break;
        case 'org.url':
          initialTestData[key] = 'https://acme.com';
          break;
        case 'user.name':
          initialTestData[key] = 'John Doe';
          break;
        case 'user.email':
          initialTestData[key] = 'john@example.com';
          break;
        case 'event.time':
          initialTestData[key] = new Date().toLocaleString();
          break;
        case 'action.url':
          initialTestData[key] = 'https://acme.com/action';
          break;
        case 'agent.name':
          initialTestData[key] = 'Agent-001';
          break;
        case 'api.key.prefix':
          initialTestData[key] = 'sk_test_123...';
          break;
        case 'invoice.id':
          initialTestData[key] = 'INV-2024-001';
          break;
        case 'invoice.amount':
          initialTestData[key] = '$99.00';
          break;
        case 'security.banCount':
          initialTestData[key] = '5';
          break;
        case 'security.window':
          initialTestData[key] = '15';
          break;
        case 'assets.emailLogo':
          initialTestData[key] = 'https://via.placeholder.com/120x40/007bff/ffffff?text=LOGO';
          break;
        case 'year':
          initialTestData[key] = new Date().getFullYear().toString();
          break;
        default:
          initialTestData[key] = key;
      }
    });
    setTestData(initialTestData);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(editedTemplate);
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!editedTemplate.id || !testEmail) return;
    
    setTesting(true);
    try {
      await onTest(editedTemplate.id, testEmail, testData);
      setShowTestDialog(false);
    } catch (error) {
      console.error('Error sending test:', error);
    } finally {
      setTesting(false);
    }
  };

  const handleTestDataChange = (key: string, value: string) => {
    setTestData(prev => ({ ...prev, [key]: value }));
  };

  const extractedVariables = React.useMemo(() => {
    const text = `${editedTemplate.subject || ''} ${editedTemplate.html || ''} ${editedTemplate.preheader || ''}`;
    const regex = /\{\{([^}]+)\}\}/g;
    const variables = new Set<string>();
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      variables.add(match[1].trim());
    }
    
    return Array.from(variables);
  }, [editedTemplate.subject, editedTemplate.html, editedTemplate.preheader]);

  return (
    <>
      <Sheet open={open} onOpenChange={() => onClose()}>
        <SheetContent className="w-[40%] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {template ? 'Edit Template' : 'New Template'}
            </SheetTitle>
            <SheetDescription>
              Create or modify email templates for notification events
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            <Tabs defaultValue="settings" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="variables">Variables</TabsTrigger>
                <TabsTrigger value="provider">Provider</TabsTrigger>
              </TabsList>

              <TabsContent value="settings" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      value={editedTemplate.name || ''}
                      onChange={(e) => setEditedTemplate({ ...editedTemplate, name: e.target.value })}
                      placeholder="e.g., API Key Created"
                    />
                  </div>
                  <div>
                    <Label htmlFor="key">Event Key</Label>
                    <Input
                      id="key"
                      value={editedTemplate.key || ''}
                      onChange={(e) => setEditedTemplate({ ...editedTemplate, key: e.target.value })}
                      placeholder="e.g., api.key.created"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={editedTemplate.category || ''} 
                      onValueChange={(value) => setEditedTemplate({ ...editedTemplate, category: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
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
                  <div>
                    <Label htmlFor="locale">Locale</Label>
                    <Select 
                      value={editedTemplate.locale || 'en'} 
                      onValueChange={(value) => setEditedTemplate({ ...editedTemplate, locale: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English (EN)</SelectItem>
                        <SelectItem value="es">Spanish (ES)</SelectItem>
                        <SelectItem value="fr">French (FR)</SelectItem>
                        <SelectItem value="ar">Arabic (AR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={editedTemplate.status || 'draft'} 
                      onValueChange={(value) => setEditedTemplate({ ...editedTemplate, status: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="subject">Subject Line</Label>
                  <Input
                    id="subject"
                    value={editedTemplate.subject || ''}
                    onChange={(e) => setEditedTemplate({ ...editedTemplate, subject: e.target.value })}
                    placeholder="e.g., Your API key was created"
                  />
                </div>

                <div>
                  <Label htmlFor="preheader">Preheader (Optional)</Label>
                  <Input
                    id="preheader"
                    value={editedTemplate.preheader || ''}
                    onChange={(e) => setEditedTemplate({ ...editedTemplate, preheader: e.target.value })}
                    placeholder="Preview text that appears in email clients"
                  />
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-4">
                <div className="grid grid-cols-2 gap-4 h-96">
                  <div>
                    <Label htmlFor="html">HTML Content</Label>
                    <Textarea
                      id="html"
                      value={editedTemplate.html || ''}
                      onChange={(e) => setEditedTemplate({ ...editedTemplate, html: e.target.value })}
                      placeholder="Enter HTML content with {{variable}} placeholders"
                      className="h-80 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <Label>Preview</Label>
                    <div className="border rounded-md h-80 overflow-auto bg-muted p-4">
                      <div 
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                        className="max-w-full"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="variables" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Available Variables</CardTitle>
                    <CardDescription>
                      Use these variables in your templates by wrapping them in double curly braces
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(TEMPLATE_VARIABLES).map(([key, description]) => (
                        <div key={key} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <code className="text-sm">{'{{' + key + '}}'}</code>
                            <p className="text-xs text-muted-foreground">{description}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const textarea = document.getElementById('html') as HTMLTextAreaElement;
                              if (textarea) {
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const currentValue = editedTemplate.html || '';
                                const newValue = currentValue.substring(0, start) + 
                                  `{{${key}}}` + 
                                  currentValue.substring(end);
                                setEditedTemplate({ ...editedTemplate, html: newValue });
                              }
                            }}
                          >
                            Insert
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Detected Variables</CardTitle>
                    <CardDescription>
                      Variables found in your template content
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {extractedVariables.map(variable => (
                        <Badge key={variable} variant="secondary">
                          {'{{' + variable + '}}'}
                        </Badge>
                      ))}
                      {extractedVariables.length === 0 && (
                        <p className="text-sm text-muted-foreground">No variables detected</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="provider" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Provider Overrides</CardTitle>
                    <CardDescription>
                      Optional: Specify provider-specific template IDs for native template support
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="sendgrid">SendGrid Template ID</Label>
                      <Input
                        id="sendgrid"
                        value={editedTemplate.provider?.sendgridTemplateId || ''}
                        onChange={(e) => setEditedTemplate({ 
                          ...editedTemplate, 
                          provider: { 
                            ...editedTemplate.provider, 
                            sendgridTemplateId: e.target.value 
                          } 
                        })}
                        placeholder="d-1234567890abcdef"
                      />
                    </div>
                    <div>
                      <Label htmlFor="postmark">Postmark Template ID</Label>
                      <Input
                        id="postmark"
                        value={editedTemplate.provider?.postmarkTemplateId || ''}
                        onChange={(e) => setEditedTemplate({ 
                          ...editedTemplate, 
                          provider: { 
                            ...editedTemplate.provider, 
                            postmarkTemplateId: e.target.value 
                          } 
                        })}
                        placeholder="12345678"
                      />
                    </div>
                    <div>
                      <Label htmlFor="mailgun">Mailgun Template</Label>
                      <Input
                        id="mailgun"
                        value={editedTemplate.provider?.mailgunTemplate || ''}
                        onChange={(e) => setEditedTemplate({ 
                          ...editedTemplate, 
                          provider: { 
                            ...editedTemplate.provider, 
                            mailgunTemplate: e.target.value 
                          } 
                        })}
                        placeholder="template-name"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {editedTemplate.id && (
              <Button variant="outline" onClick={() => setShowTestDialog(true)}>
                <TestTube className="h-4 w-4 mr-2" />
                Send Test
              </Button>
            )}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Template
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Test Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test email with sample data to verify the template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="test-email">Recipient Email</Label>
              <Input
                id="test-email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>
            <div>
              <Label>Sample Variables</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {extractedVariables.map(variable => (
                  <div key={variable} className="flex items-center gap-2">
                    <Label className="w-32 text-xs">{variable}:</Label>
                    <Input
                      value={testData[variable] || ''}
                      onChange={(e) => handleTestDataChange(variable, e.target.value)}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleTest} disabled={testing || !testEmail}>
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Test
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}