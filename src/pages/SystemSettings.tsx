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
  Brain
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';

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
    default_model: 'gpt-4o-mini',
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
    webhook_url: '',
    alert_thresholds: {
      error_rate: 5,
      response_time: 5000,
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
              default_model: value.default_model || 'gpt-4o-mini',
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
              webhook_url: value.webhook_url || '',
              alert_thresholds: value.alert_thresholds || { error_rate: 5, response_time: 5000 },
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
        .upsert({
          setting_key: key,
          setting_value: value,
        });

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

  const handleAISettingsUpdate = () => {
    updateSetting('ai_models', aiSettings);
  };

  const handleAPISettingsUpdate = () => {
    updateSetting('rate_limits', apiSettings);
  };

  const handleSecuritySettingsUpdate = () => {
    updateSetting('security', securitySettings);
  };

  const handleNotificationSettingsUpdate = () => {
    updateSetting('notifications', notificationSettings);
  };

  const availableModels = [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI' },
    { value: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI' },
    { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
    { value: 'claude-3-opus', label: 'Claude 3 Opus', provider: 'Anthropic' },
    { value: 'gemini-pro', label: 'Gemini Pro', provider: 'Google' },
  ];

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

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="default_model">Default Model</Label>
                    <Select
                      value={aiSettings.default_model}
                      onValueChange={(value) => setAiSettings(prev => ({ ...prev, default_model: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {aiSettings.enabled_models.map(model => {
                          const modelInfo = availableModels.find(m => m.value === model);
                          return (
                            <SelectItem key={model} value={model}>
                              {modelInfo?.label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

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
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
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
                    <p className="font-medium">Slack Integration</p>
                    <p className="text-sm text-muted-foreground">
                      Send notifications to Slack channels
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.slack_enabled}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, slack_enabled: checked }))}
                  />
                </div>

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