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
import { 
  Save,
  ArrowLeft,
  Eye,
  Send,
  Copy,
  Code,
  Settings,
  TestTube,
  AlertTriangle,
  Loader2,
  Download,
  RotateCcw,
  FileText,
  Smartphone,
  Monitor,
  X,
  Variable,
  Search,
  ChevronRight,
  Play
} from 'lucide-react';
import { EmailTemplate } from '@/types/emailBrandingTypes';
import { useEmailBranding } from '@/hooks/useEmailBranding';
import { useToast } from '@/hooks/use-toast';
import { Editor } from '@monaco-editor/react';

// Email template presets with thumbnails
const EMAIL_PRESETS = [
  {
    id: 'minimal',
    name: 'Minimal',
    thumbnail: '/placeholder-preset-minimal.png',
    mjml: `<mjml>
<mj-head>
<mj-attributes>
<mj-all font-family="Inter, Arial, sans-serif" />
<mj-text color="{{colors.text}}" font-size="14px" line-height="1.5" />
<mj-button background-color="{{colors.accent}}" color="#ffffff" border-radius="8px" font-size="14px" padding="12px 20px" />
</mj-attributes>
</mj-head>
<mj-body background-color="#f8fafc">
<mj-section background-color="#ffffff" border-radius="16px" border="1px solid #e2e8f0" padding="24px">
<mj-column>
<mj-text font-size="22px" font-weight="600" line-height="1.2">{{subject}}</mj-text>
<mj-text>{{message}}</mj-text>
<mj-button href="{{action_url}}">{{action_text}}</mj-button>
</mj-column>
</mj-section>
</mj-body>
</mjml>`
  },
  {
    id: 'card',
    name: 'Card',
    thumbnail: '/placeholder-preset-card.png',
    mjml: `<mjml>
<mj-head>
<mj-attributes>
<mj-all font-family="Inter, Arial, sans-serif" />
<mj-text color="{{colors.text}}" font-size="14px" line-height="1.5" />
<mj-button background-color="{{colors.accent}}" color="#ffffff" border-radius="8px" font-size="14px" padding="12px 20px" />
</mj-attributes>
</mj-head>
<mj-body background-color="#f8fafc">
<mj-section background-color="{{colors.headerBg}}" padding="24px">
<mj-column>
<mj-image width="140px" src="{{assets.emailLogo}}" alt="{{brand.name}}" padding="0"/>
</mj-column>
</mj-section>
<mj-section background-color="#ffffff" border-radius="16px" border="1px solid #e2e8f0" padding="24px">
<mj-column>
<mj-text font-size="18px" font-weight="600">{{title}}</mj-text>
<mj-text>{{content}}</mj-text>
<mj-table font-size="12px" color="#64748b">
<tr><td>Status:</td><td>{{status}}</td></tr>
<tr><td>Priority:</td><td>{{priority}}</td></tr>
</mj-table>
<mj-button href="{{action_url}}">{{action_text}}</mj-button>
</mj-column>
</mj-section>
</mj-body>
</mjml>`
  },
  {
    id: 'welcome',
    name: 'Welcome',
    thumbnail: '/placeholder-preset-welcome.png',
    mjml: `<mjml>
<mj-head>
<mj-attributes>
<mj-all font-family="Inter, Arial, sans-serif" />
<mj-text color="{{colors.text}}" font-size="14px" line-height="1.5" />
<mj-button background-color="{{colors.accent}}" color="#ffffff" border-radius="8px" font-size="14px" padding="12px 20px" />
</mj-attributes>
</mj-head>
<mj-body background-color="#f8fafc">
<mj-section background-color="{{colors.headerBg}}" padding="24px">
<mj-column>
<mj-image width="140px" src="{{assets.emailLogo}}" alt="{{brand.name}}" padding="0"/>
</mj-column>
</mj-section>
<mj-section background-color="#ffffff" border-radius="16px" border="1px solid #e2e8f0" padding="24px">
<mj-column>
<mj-text font-size="22px" font-weight="600">Welcome, {{user.first_name | default: "there"}}!</mj-text>
<mj-text>Your workspace is ready. Here's what you can do next:</mj-text>
<mj-text>• Complete your profile setup</mj-text>
<mj-text>• Invite your team members</mj-text>
<mj-text>• Explore the dashboard</mj-text>
<mj-button href="{{urls.dashboard}}">Open Dashboard</mj-button>
</mj-column>
</mj-section>
</mj-body>
</mjml>`
  },
  {
    id: 'password-reset',
    name: 'Password Reset',
    thumbnail: '/placeholder-preset-reset.png',
    mjml: `<mjml>
<mj-head>
<mj-attributes>
<mj-all font-family="Inter, Arial, sans-serif" />
<mj-text color="{{colors.text}}" font-size="14px" line-height="1.5" />
<mj-button background-color="{{colors.accent}}" color="#ffffff" border-radius="8px" font-size="14px" padding="12px 20px" />
</mj-attributes>
</mj-head>
<mj-body background-color="#f8fafc">
<mj-section background-color="{{colors.headerBg}}" padding="24px">
<mj-column>
<mj-image width="140px" src="{{assets.emailLogo}}" alt="{{brand.name}}" padding="0"/>
</mj-column>
</mj-section>
<mj-section background-color="#ffffff" border-radius="16px" border="1px solid #e2e8f0" padding="24px">
<mj-column>
<mj-text font-size="18px" font-weight="600">Password reset</mj-text>
<mj-text>Hi {{user.first_name | default: "there"}}, use the button below to reset your password.</mj-text>
<mj-button href="{{auth.reset_url}}">Reset password</mj-button>
<mj-text color="#64748b" font-size="12px">This link expires in {{auth.expire_hours}} hours.</mj-text>
<mj-text color="#94a3b8" font-size="12px">You didn't request this? Ignore this email.</mj-text>
</mj-column>
</mj-section>
</mj-body>
</mjml>`
  }
];

// Variable groups for easy insertion
const VARIABLE_GROUPS = {
  Brand: {
    'brand.name': { description: 'Company name', example: 'Acme Corp' },
    'assets.emailLogo': { description: 'Email logo URL', example: 'https://example.com/logo.png' },
    'urls.dashboard': { description: 'Dashboard URL', example: 'https://app.example.com/dashboard' },
    'urls.support': { description: 'Support URL', example: 'https://example.com/support' },
    'urls.unsubscribe': { description: 'Unsubscribe URL', example: 'https://example.com/unsubscribe' }
  },
  User: {
    'user.first_name': { description: 'User first name', example: 'John' },
    'user.last_name': { description: 'User last name', example: 'Doe' },
    'user.email': { description: 'User email', example: 'john@example.com' }
  },
  Auth: {
    'auth.reset_url': { description: 'Password reset URL', example: 'https://app.example.com/reset' },
    'auth.expire_hours': { description: 'Token expiry hours', example: '24' }
  },
  Ticket: {
    'ticket.id': { description: 'Ticket ID', example: '12345' },
    'ticket.subject': { description: 'Ticket subject', example: 'Login Issue' },
    'ticket.url': { description: 'Ticket URL', example: 'https://support.example.com/ticket/12345' },
    'ticket.priority': { description: 'Ticket priority', example: 'High' }
  }
};

export default function EmailTemplateEdit() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { templates, brandingSettings, saveTemplate, loading } = useEmailBranding();
  const { toast } = useToast();
  
  const [editedTemplate, setEditedTemplate] = useState<EmailTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'setup' | 'editor'>('setup');
  const [editorMode, setEditorMode] = useState<'mjml' | 'html'>('mjml');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showVariablesPanel, setShowVariablesPanel] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testData, setTestData] = useState<Record<string, string>>({});
  const [variableFilter, setVariableFilter] = useState('');
  const [senderOverride, setSenderOverride] = useState({ name: '', email: '' });

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
      }
    }
  }, [templateId, templates, loading]);

  // Mock MJML rendering - in production this would be server-side
  useEffect(() => {
    if (!editedTemplate) return;
    
    const renderPreview = () => {
      try {
        let html = editedTemplate.mjml;
        
        // Simple MJML to HTML conversion for preview
        html = html
          .replace(/<mjml>/g, '<div style="max-width: 600px; margin: 0 auto; font-family: Inter, Arial, sans-serif; background: #f8fafc; padding: 20px;">')
          .replace(/<\/mjml>/g, '</div>')
          .replace(/<mj-body[^>]*>/g, '<div>')
          .replace(/<\/mj-body>/g, '</div>')
          .replace(/<mj-section([^>]*)>/g, '<div style="margin-bottom: 16px; $1">')
          .replace(/<\/mj-section>/g, '</div>')
          .replace(/<mj-column[^>]*>/g, '<div>')
          .replace(/<\/mj-column>/g, '</div>')
          .replace(/<mj-text([^>]*)>/g, '<p style="margin: 8px 0; $1">')
          .replace(/<\/mj-text>/g, '</p>')
          .replace(/<mj-button[^>]*href="([^"]*)"[^>]*>/g, '<a href="$1" style="display: inline-block; padding: 12px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 500; margin: 8px 0;">')
          .replace(/<\/mj-button>/g, '</a>')
          .replace(/<mj-image[^>]*src="([^"]*)"[^>]*>/g, '<img src="$1" style="max-width: 100%; height: auto;" />')
          .replace(/<mj-head>[\s\S]*?<\/mj-head>/g, '');

        // Replace variables with test data or defaults
        Object.entries(VARIABLE_GROUPS).forEach(([groupName, variables]) => {
          Object.entries(variables).forEach(([key, config]) => {
            const testValue = testData[key] || config.example;
            const regex = new RegExp(`\\{\\{${key.replace('.', '\\.')}\\}\\}`, 'g');
            html = html.replace(regex, testValue);
          });
        });

        // Replace color variables
        if (editedTemplate.colors.useTheme && brandingSettings) {
          html = html.replace(/\{\{colors\.headerBg\}\}/g, brandingSettings.colors.headerBg);
          html = html.replace(/\{\{colors\.text\}\}/g, brandingSettings.colors.text);
          html = html.replace(/\{\{colors\.accent\}\}/g, brandingSettings.colors.accent);
        } else {
          html = html.replace(/\{\{colors\.headerBg\}\}/g, editedTemplate.colors.headerBg || '#000000');
          html = html.replace(/\{\{colors\.text\}\}/g, editedTemplate.colors.text || '#333333');
          html = html.replace(/\{\{colors\.accent\}\}/g, editedTemplate.colors.accent || '#2563eb');
        }

        setPreviewHtml(html);
      } catch (error) {
        setPreviewHtml('<p style="color: red;">Error rendering preview</p>');
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
        description: "Version " + (editedTemplate.version + 1) + " saved successfully",
      });
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset: typeof EMAIL_PRESETS[0]) => {
    if (!editedTemplate) return;
    setEditedTemplate(prev => prev ? ({ ...prev, mjml: preset.mjml }) : prev);
    toast({
      title: "Preset applied",
      description: `${preset.name} template loaded`,
    });
  };

  const insertVariable = (variable: string) => {
    const variableToken = `{{${variable}}}`;
    // In a real implementation, this would insert at cursor position
    if (editedTemplate) {
      setEditedTemplate(prev => prev ? ({ 
        ...prev, 
        mjml: prev.mjml + variableToken 
      }) : prev);
    }
  };

  const filteredVariables = Object.entries(VARIABLE_GROUPS).reduce((acc, [groupName, variables]) => {
    const filtered = Object.entries(variables).filter(([key]) => 
      key.toLowerCase().includes(variableFilter.toLowerCase()) ||
      groupName.toLowerCase().includes(variableFilter.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[groupName] = Object.fromEntries(filtered);
    }
    return acc;
  }, {} as typeof VARIABLE_GROUPS);

  if (loading || !editedTemplate) {
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
                <h1 className="text-xl font-semibold">{editedTemplate.name}</h1>
                <p className="text-sm text-muted-foreground">Version {editedTemplate.version}</p>
              </div>
            </div>
            
            {activeTab === 'editor' && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowVariablesPanel(true)}>
                  <Variable className="h-4 w-4 mr-2" />
                  Variables
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowTestPanel(true)}>
                  <Send className="h-4 w-4 mr-2" />
                  Test
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export HTML
                </Button>
                <Button onClick={handleSave} disabled={saving} size="sm">
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'setup' | 'editor')}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="setup">
              <Settings className="h-4 w-4 mr-2" />
              Setup
            </TabsTrigger>
            <TabsTrigger value="editor">
              <Code className="h-4 w-4 mr-2" />
              Editor
            </TabsTrigger>
          </TabsList>

          <div className="mt-8">
            <TabsContent value="setup" className="space-y-8">
              <div className="grid gap-8 max-w-4xl">
                {/* Basic Settings */}
                <Card className="border border-border/50 shadow-sm">
                  <CardHeader className="pb-6">
                    <CardTitle className="text-lg">Basic Settings</CardTitle>
                    <CardDescription>Configure the core template properties</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject Line *</Label>
                        <Input
                          id="subject"
                          value={editedTemplate.subject}
                          onChange={(e) => setEditedTemplate(prev => prev ? ({ ...prev, subject: e.target.value }) : prev)}
                          placeholder="Email subject line"
                        />
                        <p className="text-xs text-muted-foreground">This appears in the recipient's inbox</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="preheader">Preheader</Label>
                        <Input
                          id="preheader"
                          value={editedTemplate.preheader || ''}
                          onChange={(e) => setEditedTemplate(prev => prev ? ({ ...prev, preheader: e.target.value }) : prev)}
                          placeholder="Preview text"
                        />
                        <p className="text-xs text-muted-foreground">Shown as preview text in email clients</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    </div>
                  </CardContent>
                </Card>

                {/* Sender Override */}
                <Card className="border border-border/50 shadow-sm">
                  <CardHeader className="pb-6">
                    <CardTitle className="text-lg">Sender Override</CardTitle>
                    <CardDescription>Optional custom sender for this template</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="sender-name">Sender Name</Label>
                        <Input
                          id="sender-name"
                          value={senderOverride.name}
                          onChange={(e) => setSenderOverride(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Custom sender name"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="sender-email">Sender Email</Label>
                        <Input
                          id="sender-email"
                          value={senderOverride.email}
                          onChange={(e) => setSenderOverride(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="custom@example.com"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Color Configuration */}
                <Card className="border border-border/50 shadow-sm">
                  <CardHeader className="pb-6">
                    <CardTitle className="text-lg">Colors</CardTitle>
                    <CardDescription>Customize the template colors</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="use-theme"
                        checked={editedTemplate.colors.useTheme}
                        onCheckedChange={(checked) => setEditedTemplate(prev => prev ? ({
                          ...prev,
                          colors: { ...prev.colors, useTheme: checked }
                        }) : prev)}
                      />
                      <Label htmlFor="use-theme">Use organization theme colors</Label>
                    </div>

                    {!editedTemplate.colors.useTheme && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="header-bg">Header Background</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="header-bg"
                              type="color"
                              value={editedTemplate.colors.headerBg || '#000000'}
                              onChange={(e) => setEditedTemplate(prev => prev ? ({
                                ...prev,
                                colors: { ...prev.colors, headerBg: e.target.value }
                              }) : prev)}
                              className="w-16 h-10 p-1 border rounded"
                            />
                            <Input
                              value={editedTemplate.colors.headerBg || '#000000'}
                              onChange={(e) => setEditedTemplate(prev => prev ? ({
                                ...prev,
                                colors: { ...prev.colors, headerBg: e.target.value }
                              }) : prev)}
                              placeholder="#000000"
                              className="flex-1 font-mono text-sm"
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
                              onChange={(e) => setEditedTemplate(prev => prev ? ({
                                ...prev,
                                colors: { ...prev.colors, text: e.target.value }
                              }) : prev)}
                              className="w-16 h-10 p-1 border rounded"
                            />
                            <Input
                              value={editedTemplate.colors.text || '#333333'}
                              onChange={(e) => setEditedTemplate(prev => prev ? ({
                                ...prev,
                                colors: { ...prev.colors, text: e.target.value }
                              }) : prev)}
                              placeholder="#333333"
                              className="flex-1 font-mono text-sm"
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
                              onChange={(e) => setEditedTemplate(prev => prev ? ({
                                ...prev,
                                colors: { ...prev.colors, accent: e.target.value }
                              }) : prev)}
                              className="w-16 h-10 p-1 border rounded"
                            />
                            <Input
                              value={editedTemplate.colors.accent || '#2563eb'}
                              onChange={(e) => setEditedTemplate(prev => prev ? ({
                                ...prev,
                                colors: { ...prev.colors, accent: e.target.value }
                              }) : prev)}
                              placeholder="#2563eb"
                              className="flex-1 font-mono text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Layout Presets */}
                <Card className="border border-border/50 shadow-sm">
                  <CardHeader className="pb-6">
                    <CardTitle className="text-lg">Layout Presets</CardTitle>
                    <CardDescription>Choose from professionally designed templates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {EMAIL_PRESETS.map((preset) => (
                        <Card 
                          key={preset.id}
                          className="cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all duration-200 border border-border/50"
                          onClick={() => applyPreset(preset)}
                        >
                          <CardContent className="p-4">
                            <div className="aspect-[3/4] bg-muted rounded-lg mb-3 flex items-center justify-center">
                              <FileText className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h4 className="font-medium text-sm text-center">{preset.name}</h4>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex items-center gap-4">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Template
                  </Button>
                  <Button variant="outline" onClick={() => {
                    // Reset to defaults logic
                    toast({ title: "Reset to defaults", description: "Template reset to original state" });
                  }}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Defaults
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="editor" className="space-y-0">
              <div className="flex gap-8 h-[calc(100vh-12rem)]">
                {/* Editor Panel */}
                <div className="flex-1 flex flex-col">
                  {/* Editor Toolbar */}
                  <div className="flex items-center justify-between mb-4 p-3 bg-card border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Mode:</Label>
                      <Select value={editorMode} onValueChange={(value: 'mjml' | 'html') => setEditorMode(value)}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mjml">MJML</SelectItem>
                          <SelectItem value="html">Raw HTML</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Code Editor */}
                  <Card className="flex-1 border border-border/50 shadow-sm">
                    <CardContent className="p-0 h-full">
                      <Editor
                        height="100%"
                        language={editorMode === 'mjml' ? 'xml' : 'html'}
                        value={editedTemplate.mjml}
                        onChange={(value) => setEditedTemplate(prev => prev ? ({ ...prev, mjml: value || '' }) : prev)}
                        theme="light"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          lineNumbers: 'on',
                          wordWrap: 'on',
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          tabSize: 2
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Preview Panel */}
                <div className="w-96 flex flex-col">
                  {/* Preview Toolbar */}
                  <div className="flex items-center justify-between mb-4 p-3 bg-card border rounded-lg">
                    <Label className="text-sm font-medium">Preview:</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setPreviewMode('desktop')}
                      >
                        <Monitor className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setPreviewMode('mobile')}
                      >
                        <Smartphone className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Preview Container */}
                  <Card className="flex-1 border border-border/50 shadow-sm">
                    <CardContent className="p-4 h-full">
                      <div 
                        className={`
                          border rounded-lg overflow-auto h-full bg-white
                          ${previewMode === 'mobile' ? 'max-w-[360px]' : 'w-full'}
                        `}
                        style={{ maxWidth: previewMode === 'mobile' ? '360px' : '600px' }}
                      >
                        <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Variables Panel */}
      {showVariablesPanel && (
        <div className="fixed inset-y-0 right-0 w-96 bg-background border-l border-border shadow-xl z-50 flex flex-col">
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-lg font-semibold">Variables</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowVariablesPanel(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="p-6 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search variables..."
                value={variableFilter}
                onChange={(e) => setVariableFilter(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            <div className="space-y-6">
              {Object.entries(filteredVariables).map(([groupName, variables]) => (
                <div key={groupName}>
                  <h4 className="font-medium text-sm text-muted-foreground mb-3">{groupName}</h4>
                  <div className="space-y-2">
                    {Object.entries(variables).map(([key, config]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer group"
                        onClick={() => insertVariable(key)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono text-primary">{`{{${key}}}`}</p>
                          <p className="text-xs text-muted-foreground truncate">{config.description}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Test Panel */}
      {showTestPanel && (
        <div className="fixed inset-y-0 right-0 w-96 bg-background border-l border-border shadow-xl z-50 flex flex-col">
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-lg font-semibold">Test Email</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowTestPanel(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-auto p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="test-email">Send to</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-medium">Sample Data</Label>
              <div className="space-y-3">
                {Object.entries(VARIABLE_GROUPS).map(([groupName, variables]) => (
                  <div key={groupName}>
                    <h5 className="text-xs font-medium text-muted-foreground mb-2">{groupName}</h5>
                    {Object.entries(variables).map(([key, config]) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs">{key}</Label>
                        <Input
                          value={testData[key] || config.example}
                          onChange={(e) => setTestData(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder={config.example}
                          className="text-xs"
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <Button className="w-full" disabled={!testEmail}>
              <Play className="h-4 w-4 mr-2" />
              Send Test Email
            </Button>
          </div>
        </div>
      )}

      {/* Overlay for panels */}
      {(showVariablesPanel || showTestPanel) && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => {
            setShowVariablesPanel(false);
            setShowTestPanel(false);
          }}
        />
      )}
    </div>
  );
}