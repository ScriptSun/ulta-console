import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Mail, MessageCircle, Webhook, ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NotificationSettings {
  emailEnabled: boolean;
  telegramEnabled: boolean;
  webhookEnabled: boolean;
  emailHost: string;
  emailPort: string;
  emailUser: string;
  emailPassword: string;
  telegramBotToken: string;
  telegramChatId: string;
  webhookUrl: string;
  webhookSecret: string;
}

export default function NotificationSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotificationSettings>({
    emailEnabled: false,
    telegramEnabled: false,
    webhookEnabled: false,
    emailHost: '',
    emailPort: '587',
    emailUser: '',
    emailPassword: '',
    telegramBotToken: '',
    telegramChatId: '',
    webhookUrl: '',
    webhookSecret: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'notifications')
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value) {
        const notificationData = data.setting_value as Record<string, any>;
        setSettings({
          emailEnabled: notificationData.emailEnabled || false,
          telegramEnabled: notificationData.telegramEnabled || false,
          webhookEnabled: notificationData.webhookEnabled || false,
          emailHost: notificationData.emailHost || '',
          emailPort: notificationData.emailPort || '587',
          emailUser: notificationData.emailUser || '',
          emailPassword: notificationData.emailPassword || '',
          telegramBotToken: notificationData.telegramBotToken || '',
          telegramChatId: notificationData.telegramChatId || '',
          webhookUrl: notificationData.webhookUrl || '',
          webhookSecret: notificationData.webhookSecret || ''
        });
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
      toast({
        title: "Error loading settings",
        description: "Failed to load notification settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'notifications',
          setting_value: settings as any,
          description: 'System notification settings'
        });

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Notification settings have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast({
        title: "Error saving settings",
        description: "Failed to save notification settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof NotificationSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/system-settings')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Bell className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Notification Settings</h1>
          </div>
          <p className="text-muted-foreground ml-12">
            Configure email, Telegram, and webhook notifications for system events.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>Configure SMTP settings for email alerts</CardDescription>
              </div>
              <div className="ml-auto">
                <Switch
                  checked={settings.emailEnabled}
                  onCheckedChange={(checked) => updateSetting('emailEnabled', checked)}
                />
              </div>
            </div>
          </CardHeader>
          {settings.emailEnabled && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emailHost">SMTP Host</Label>
                  <Input
                    id="emailHost"
                    value={settings.emailHost}
                    onChange={(e) => updateSetting('emailHost', e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailPort">SMTP Port</Label>
                  <Input
                    id="emailPort"
                    value={settings.emailPort}
                    onChange={(e) => updateSetting('emailPort', e.target.value)}
                    placeholder="587"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailUser">Username</Label>
                <Input
                  id="emailUser"
                  value={settings.emailUser}
                  onChange={(e) => updateSetting('emailUser', e.target.value)}
                  placeholder="your-email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailPassword">Password</Label>
                <Input
                  id="emailPassword"
                  type="password"
                  value={settings.emailPassword}
                  onChange={(e) => updateSetting('emailPassword', e.target.value)}
                  placeholder="App password or SMTP password"
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Telegram Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Telegram Notifications</CardTitle>
                <CardDescription>Send alerts to Telegram chat</CardDescription>
              </div>
              <div className="ml-auto">
                <Switch
                  checked={settings.telegramEnabled}
                  onCheckedChange={(checked) => updateSetting('telegramEnabled', checked)}
                />
              </div>
            </div>
          </CardHeader>
          {settings.telegramEnabled && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="telegramBotToken">Bot Token</Label>
                <Input
                  id="telegramBotToken"
                  type="password"
                  value={settings.telegramBotToken}
                  onChange={(e) => updateSetting('telegramBotToken', e.target.value)}
                  placeholder="1234567890:ABCdefGhiJklMnoPqrsTuvWxYz"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telegramChatId">Chat ID</Label>
                <Input
                  id="telegramChatId"
                  value={settings.telegramChatId}
                  onChange={(e) => updateSetting('telegramChatId', e.target.value)}
                  placeholder="-1001234567890"
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Webhook Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Webhook className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle>Webhook Notifications</CardTitle>
                <CardDescription>Send HTTP POST requests to external services</CardDescription>
              </div>
              <div className="ml-auto">
                <Switch
                  checked={settings.webhookEnabled}
                  onCheckedChange={(checked) => updateSetting('webhookEnabled', checked)}
                />
              </div>
            </div>
          </CardHeader>
          {settings.webhookEnabled && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhookUrl">Webhook URL</Label>
                <Input
                  id="webhookUrl"
                  value={settings.webhookUrl}
                  onChange={(e) => updateSetting('webhookUrl', e.target.value)}
                  placeholder="https://your-service.com/webhook"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhookSecret">Secret (Optional)</Label>
                <Input
                  id="webhookSecret"
                  type="password"
                  value={settings.webhookSecret}
                  onChange={(e) => updateSetting('webhookSecret', e.target.value)}
                  placeholder="webhook-secret-key"
                />
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}