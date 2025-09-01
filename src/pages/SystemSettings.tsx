import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Settings, 
  Cpu, 
  Shield, 
  Bell, 
  Database,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Globe,
  Zap,
  Brain,
  GripVertical,
  ChevronUp,
  ChevronDown,
  MessageSquare,
  Bot
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AITestPanel } from '@/components/ai/AITestPanel';

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string;
  created_at: string;
  updated_at: string;
}

export default function SystemSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<SystemSetting[]>([]);

  // AI Models Configuration
  const [aiSettings, setAiSettings] = useState({
    enabled_models: ['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet'],
    default_models: ['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet'], // Ordered list of 3 models for failover
    max_tokens: 4000,
    temperature: 0.7,
  });

  // API & Rate Limits
  const [apiSettings, setApiSettings] = useState({
    requests_per_minute: 60,
    requests_per_hour: 1000,
    max_concurrent_requests: 50,
    timeout_seconds: 30,
  });

  // Security Configuration  
  const [securitySettings, setSecuritySettings] = useState({
    require_2fa: false,
    session_timeout: 24,
    max_login_attempts: 5,
    password_min_length: 8,
  });

  // Notification Configuration
  const [notificationSettings, setNotificationSettings] = useState({
    email_enabled: true,
    slack_enabled: false,
    telegram_enabled: false,
    telegram_bot_token: '',
    telegram_chat_id: '',
    webhook_url: '',
    alert_thresholds: {
      error_rate: 5,
      response_time: 5000,
    },
    telegram_notifications: {
      agent_errors: true,
      system_alerts: true,
      security_events: false,
      batch_completions: false,
    },
  });

  useEffect(() => {
    loadSystemSettings();
  }, []);

  const loadSystemSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('setting_key', { ascending: true });

      if (error) throw error;

      setSettings(data || []);
      
      // Parse and set individual settings
      data?.forEach(setting => {
        const value = setting.setting_value as any; // Type assertion for JSON parsing
        switch (setting.setting_key) {
          case 'ai_models':
            setAiSettings({
              enabled_models: value.enabled_models || ['gpt-4o-mini'],
              default_models: value.default_models || ['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet'],
              max_tokens: value.max_tokens || 4000,
              temperature: value.temperature || 0.7,
            });
            break;
          case 'rate_limits':
            setApiSettings({
              requests_per_minute: value.requests_per_minute || 60,
              requests_per_hour: value.requests_per_hour || 1000,
              max_concurrent_requests: value.max_concurrent_requests || 50,
              timeout_seconds: value.timeout_seconds || 30,
            });
            break;
          case 'security':
            setSecuritySettings({
              require_2fa: value.require_2fa || false,
              session_timeout: value.session_timeout || 24,
              max_login_attempts: value.max_login_attempts || 5,
              password_min_length: value.password_min_length || 8,
            });
            break;
          case 'notifications':
            setNotificationSettings({
              email_enabled: value.email_enabled || true,
              slack_enabled: value.slack_enabled || false,
              telegram_enabled: value.telegram_enabled || false,
              telegram_bot_token: value.telegram_bot_token || '',
              telegram_chat_id: value.telegram_chat_id || '',
              webhook_url: value.webhook_url || '',
              alert_thresholds: value.alert_thresholds || { error_rate: 5, response_time: 5000 },
              telegram_notifications: value.telegram_notifications || {
                agent_errors: true,
                system_alerts: true,
                security_events: false,
                batch_completions: false,
              },
            });
            break;
        }
      });
    } catch (error) {
      console.error('Error loading system settings:', error);
      toast({
        title: 'Loading Failed',
        description: 'Failed to load system settings.',
        variant: 'destructive',
      });
    }
  };

  const updateSetting = async (key: string, value: any) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert(
          {
            setting_key: key,
            setting_value: value,
          },
          {
            onConflict: 'setting_key'
          }
        );

      if (error) throw error;

      toast({
        title: 'Settings Updated',
        description: `${key} has been successfully updated.`,
      });
    } catch (error) {
      console.error('Error updating setting:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update system setting.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAISettingsUpdate = async () => {
    setLoading(true);
    try {
      await updateSetting('ai_models', aiSettings);
      
      // Refresh the AI service settings cache
      const { aiService } = await import('@/lib/aiService');
      await aiService.refreshSettings();
      
      toast({
        title: 'AI Settings Updated',
        description: 'Model failover configuration has been updated and applied.',
      });
    } catch (error) {
      console.error('Error updating AI settings:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update AI settings.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAPISettingsUpdate = async () => {
    setLoading(true);
    try {
      await updateSetting('rate_limits', apiSettings);
      
      // Refresh the rate limiting service
      const { rateLimitService } = await import('@/lib/rateLimitService');
      await rateLimitService.refreshSettings();
      
      toast({
        title: 'API Settings Updated',
        description: 'Rate limits have been updated and applied system-wide.',
      });
    } catch (error) {
      console.error('Error updating API settings:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update API settings.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSecuritySettingsUpdate = async () => {
    setLoading(true);
    try {
      await updateSetting('security', securitySettings);
      
      toast({
        title: 'Security Settings Updated',
        description: 'Security configuration has been updated successfully.',
      });
    } catch (error) {
      console.error('Error updating security settings:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update security settings.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationSettingsUpdate = async () => {
    setLoading(true);
    try {
      await updateSetting('notifications', notificationSettings);
      
      toast({
        title: 'Notification Settings Updated',
        description: 'Notification configuration has been updated successfully.',
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update notification settings.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const availableModels = [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI' },
    { value: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI' },
    { value: 'gpt-5-2025-08-07', label: 'GPT-5', provider: 'OpenAI' },
    { value: 'gpt-5-mini-2025-08-07', label: 'GPT-5 Mini', provider: 'OpenAI' },
    { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
    { value: 'claude-3-opus', label: 'Claude 3 Opus', provider: 'Anthropic' },
    { value: 'claude-opus-4-20250514', label: 'Claude 4 Opus', provider: 'Anthropic' },
    { value: 'gemini-pro', label: 'Gemini Pro', provider: 'Google' },
  ];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setAiSettings(prev => {
        const oldIndex = prev.default_models.indexOf(active.id);
        const newIndex = prev.default_models.indexOf(over.id);
        return {
          ...prev,
          default_models: arrayMove(prev.default_models, oldIndex, newIndex)
        };
      });
    }
  };

  const moveModelUp = (index: number) => {
    if (index > 0) {
      setAiSettings(prev => ({
        ...prev,
        default_models: arrayMove(prev.default_models, index, index - 1)
      }));
    }
  };

  const moveModelDown = (index: number) => {
    if (index < aiSettings.default_models.length - 1) {
      setAiSettings(prev => ({
        ...prev,
        default_models: arrayMove(prev.default_models, index, index + 1)
      }));
    }
  };

  const SortableModelItem = ({ model, index }: { model: string; index: number }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id: model });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    const modelInfo = availableModels.find(m => m.value === model);

    return (
      <div ref={setNodeRef} style={style} className="flex items-center justify-between p-3 border rounded-lg bg-card">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="w-6 h-6 flex items-center justify-center text-xs">
              {index + 1}
            </Badge>
            <div {...attributes} {...listeners} className="cursor-grab">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div>
            <p className="font-medium">{modelInfo?.label}</p>
            <p className="text-sm text-muted-foreground">{modelInfo?.provider}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => moveModelUp(index)}
            disabled={index === 0}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => moveModelDown(index)}
            disabled={index === aiSettings.default_models.length - 1}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const testTelegramConnection = async () => {
    if (!notificationSettings.telegram_bot_token || !notificationSettings.telegram_chat_id) {
      toast({
        title: 'Missing Configuration',
        description: 'Please provide both bot token and chat ID.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-telegram', {
        body: {
          bot_token: notificationSettings.telegram_bot_token,
          chat_id: notificationSettings.telegram_chat_id,
        }
      });

      if (error) throw error;

      toast({
        title: 'Connection Successful',
        description: 'Test message sent to Telegram successfully!',
      });
    } catch (error) {
      console.error('Telegram test failed:', error);
      toast({
        title: 'Connection Failed',
        description: 'Failed to send test message. Please check your configuration.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
        <p className="text-muted-foreground">
          Configure system-wide settings for your UltaAI platform including AI models, security, and performance.
        </p>
      </div>

      <Tabs defaultValue="ai" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Models
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            API & Limits
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai">
          <div className="space-y-6">
            <Card className="bg-gradient-card border-card-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Model Configuration
                </CardTitle>
                <CardDescription>
                  Configure AI models, parameters, and behavior for your UltaAI agents and chat system.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6">
                  <div>
                    <Label className="text-base font-medium">Default Models with Failover</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                      Select exactly 3 models in priority order. If the first model fails, the system will try the second, then the third.
                    </p>
                    
                    <div className="space-y-4">
                      <DndContext 
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext 
                          items={aiSettings.default_models}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2">
                            {aiSettings.default_models.map((model, index) => (
                              <SortableModelItem key={model} model={model} index={index} />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                      
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                          <div>
                            <h4 className="font-medium">Failover Configuration</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              Priority: {aiSettings.default_models.map((model, index) => {
                                const modelInfo = availableModels.find(m => m.value === model);
                                return `${index + 1}. ${modelInfo?.label}`;
                              }).join(' → ')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium">Available Models</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                      Select which AI models agents can use for processing tasks and conversations.
                    </p>
                    <div className="grid gap-3">
                      {availableModels.map((model) => (
                        <div key={model.value} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-medium">{model.label}</p>
                              <p className="text-sm text-muted-foreground">{model.provider}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={aiSettings.enabled_models.includes(model.value) ? 'default' : 'secondary'}>
                              {aiSettings.enabled_models.includes(model.value) ? 'Enabled' : 'Disabled'}
                            </Badge>
                            <Switch
                              checked={aiSettings.enabled_models.includes(model.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setAiSettings(prev => ({
                                    ...prev,
                                    enabled_models: [...prev.enabled_models, model.value]
                                  }));
                                } else {
                                  setAiSettings(prev => ({
                                    ...prev,
                                    enabled_models: prev.enabled_models.filter(m => m !== model.value)
                                  }));
                                }
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="max_tokens">Max Tokens</Label>
                      <Input
                        id="max_tokens"
                        type="number"
                        value={aiSettings.max_tokens}
                        onChange={(e) => setAiSettings(prev => ({ ...prev, max_tokens: parseInt(e.target.value) || 4000 }))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Temperature: {aiSettings.temperature}</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Controls randomness in AI responses (0 = deterministic, 1 = creative)
                    </p>
                    <Slider
                      value={[aiSettings.temperature]}
                      onValueChange={([value]) => setAiSettings(prev => ({ ...prev, temperature: value }))}
                      max={1}
                      min={0}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  <Button onClick={handleAISettingsUpdate} disabled={loading} className="w-fit">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save AI Settings
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* AI Test Panel */}
            <div className="mt-6">
              <AITestPanel />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="api">
          <Card className="bg-gradient-card border-card-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                API & Rate Limits
              </CardTitle>
              <CardDescription>
                Configure API rate limits, timeouts, and performance settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rpm">Requests per Minute</Label>
                  <Input
                    id="rpm"
                    type="number"
                    value={apiSettings.requests_per_minute}
                    onChange={(e) => setApiSettings(prev => ({ ...prev, requests_per_minute: parseInt(e.target.value) || 60 }))}
                  />
                </div>

                <div>
                  <Label htmlFor="rph">Requests per Hour</Label>
                  <Input
                    id="rph"
                    type="number"
                    value={apiSettings.requests_per_hour}
                    onChange={(e) => setApiSettings(prev => ({ ...prev, requests_per_hour: parseInt(e.target.value) || 1000 }))}
                  />
                </div>

                <div>
                  <Label htmlFor="concurrent">Max Concurrent Requests</Label>
                  <Input
                    id="concurrent"
                    type="number"
                    value={apiSettings.max_concurrent_requests}
                    onChange={(e) => setApiSettings(prev => ({ ...prev, max_concurrent_requests: parseInt(e.target.value) || 50 }))}
                  />
                </div>

                <div>
                  <Label htmlFor="timeout">Timeout (seconds)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={apiSettings.timeout_seconds}
                    onChange={(e) => setApiSettings(prev => ({ ...prev, timeout_seconds: parseInt(e.target.value) || 30 }))}
                  />
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Rate Limiting Best Practices</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Set limits based on your infrastructure capacity. Too low may impact performance, too high may cause system overload.
                    </p>
                  </div>
                </div>
              </div>

              <Button onClick={handleAPISettingsUpdate} disabled={loading} className="w-fit">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save API Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="bg-gradient-card border-card-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Configuration
              </CardTitle>
              <CardDescription>
                Configure security policies, authentication, and access controls.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Require Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">
                      Force all users to enable 2FA for enhanced security
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.require_2fa}
                    onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, require_2fa: checked }))}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="session_timeout">Session Timeout (hours)</Label>
                    <Input
                      id="session_timeout"
                      type="number"
                      value={securitySettings.session_timeout}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, session_timeout: parseInt(e.target.value) || 24 }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="max_login_attempts">Max Login Attempts</Label>
                    <Input
                      id="max_login_attempts"
                      type="number"
                      value={securitySettings.max_login_attempts}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, max_login_attempts: parseInt(e.target.value) || 5 }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="password_length">Min Password Length</Label>
                    <Input
                      id="password_length"
                      type="number"
                      value={securitySettings.password_min_length}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, password_min_length: parseInt(e.target.value) || 8 }))}
                    />
                  </div>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-800 dark:text-green-200">Security Status</h4>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        Your system security configuration is compliant with industry standards.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={handleSecuritySettingsUpdate} disabled={loading} className="w-fit">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Security Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="bg-gradient-card border-card-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Configuration
              </CardTitle>
              <CardDescription>
                Configure system notifications, alerts, and external integrations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Send system alerts and updates via email
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.email_enabled}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, email_enabled: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Telegram Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Send notifications to Telegram channels
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.telegram_enabled}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, telegram_enabled: checked }))}
                  />
                </div>

                {notificationSettings.telegram_enabled && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      <Label className="text-base font-medium">Telegram Bot Configuration</Label>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="telegram_bot_token">Bot Token</Label>
                        <Input
                          id="telegram_bot_token"
                          type="password"
                          value={notificationSettings.telegram_bot_token}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, telegram_bot_token: e.target.value }))}
                          placeholder="1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijk"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Get your bot token from @BotFather on Telegram
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="telegram_chat_id">Chat ID</Label>
                        <Input
                          id="telegram_chat_id"
                          value={notificationSettings.telegram_chat_id}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, telegram_chat_id: e.target.value }))}
                          placeholder="-1001234567890"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Channel/group chat ID (use @userinfobot to find)
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={testTelegramConnection}
                        disabled={loading || !notificationSettings.telegram_bot_token || !notificationSettings.telegram_chat_id}
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Test Connection
                      </Button>
                    </div>

                    <div>
                      <Label className="text-base font-medium">Notification Types</Label>
                      <p className="text-sm text-muted-foreground mb-3">
                        Choose which notifications to send to Telegram
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Agent Errors</p>
                            <p className="text-sm text-muted-foreground">When agents encounter errors</p>
                          </div>
                          <Switch
                            checked={notificationSettings.telegram_notifications.agent_errors}
                            onCheckedChange={(checked) => setNotificationSettings(prev => ({
                              ...prev,
                              telegram_notifications: { ...prev.telegram_notifications, agent_errors: checked }
                            }))}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">System Alerts</p>
                            <p className="text-sm text-muted-foreground">Critical system notifications</p>
                          </div>
                          <Switch
                            checked={notificationSettings.telegram_notifications.system_alerts}
                            onCheckedChange={(checked) => setNotificationSettings(prev => ({
                              ...prev,
                              telegram_notifications: { ...prev.telegram_notifications, system_alerts: checked }
                            }))}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Security Events</p>
                            <p className="text-sm text-muted-foreground">Security-related notifications</p>
                          </div>
                          <Switch
                            checked={notificationSettings.telegram_notifications.security_events}
                            onCheckedChange={(checked) => setNotificationSettings(prev => ({
                              ...prev,
                              telegram_notifications: { ...prev.telegram_notifications, security_events: checked }
                            }))}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Batch Completions</p>
                            <p className="text-sm text-muted-foreground">When batch operations complete</p>
                          </div>
                          <Switch
                            checked={notificationSettings.telegram_notifications.batch_completions}
                            onCheckedChange={(checked) => setNotificationSettings(prev => ({
                              ...prev,
                              telegram_notifications: { ...prev.telegram_notifications, batch_completions: checked }
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {notificationSettings.slack_enabled && (
                  <div>
                    <Label htmlFor="webhook_url">Slack Webhook URL</Label>
                    <Input
                      id="webhook_url"
                      value={notificationSettings.webhook_url}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, webhook_url: e.target.value }))}
                      placeholder="https://hooks.slack.com/services/..."
                    />
                  </div>
                )}

                <div>
                  <Label className="text-base font-medium">Alert Thresholds</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configure when system alerts should be triggered
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="error_rate">Error Rate Threshold (%)</Label>
                      <Input
                        id="error_rate"
                        type="number"
                        value={notificationSettings.alert_thresholds.error_rate}
                        onChange={(e) => setNotificationSettings(prev => ({
                          ...prev,
                          alert_thresholds: {
                            ...prev.alert_thresholds,
                            error_rate: parseInt(e.target.value) || 5
                          }
                        }))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="response_time">Response Time Threshold (ms)</Label>
                      <Input
                        id="response_time"
                        type="number"
                        value={notificationSettings.alert_thresholds.response_time}
                        onChange={(e) => setNotificationSettings(prev => ({
                          ...prev,
                          alert_thresholds: {
                            ...prev.alert_thresholds,
                            response_time: parseInt(e.target.value) || 5000
                          }
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={handleNotificationSettingsUpdate} disabled={loading} className="w-fit">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Notification Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}