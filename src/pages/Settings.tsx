import React, { useState } from 'react';
import { PageHeader } from '@/components/layouts/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings as SettingsIcon,
  User,
  Shield,
  Bell,
  Palette,
  Globe,
  Key,
  Database,
  Mail,
  Smartphone,
  Save,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    profile: {
      name: 'John Doe',
      email: 'john.doe@company.com',
      timezone: 'UTC-5',
      language: 'en'
    },
    security: {
      twoFactorEnabled: true,
      sessionTimeout: 24,
      loginNotifications: true,
      apiKeyRotation: true
    },
    notifications: {
      email: true,
      push: false,
      desktop: true,
      criticalOnly: false
    },
    system: {
      autoUpdates: true,
      debugMode: false,
      dataRetention: 90,
      backupFrequency: 'daily'
    }
  });

  const handleSave = () => {
    toast({
      title: 'Settings saved',
      description: 'Your settings have been updated successfully.',
    });
  };

  const pageActions = (
    <>
      <Button variant="outline" size="sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Reset to Defaults
      </Button>
      <Button size="sm" onClick={handleSave}>
        <Save className="h-4 w-4 mr-2" />
        Save Changes
      </Button>
    </>
  );

  const settingsSections = [
    {
      id: 'profile',
      label: 'Profile',
      icon: <User className="h-4 w-4" />,
      description: 'Manage your personal information and preferences'
    },
    {
      id: 'security',
      label: 'Security',
      icon: <Shield className="h-4 w-4" />,
      description: 'Configure security settings and authentication'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell className="h-4 w-4" />,
      description: 'Control how and when you receive notifications'
    },
    {
      id: 'system',
      label: 'System',
      icon: <Database className="h-4 w-4" />,
      description: 'System-wide configuration and maintenance'
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure your account, security, and system preferences"
        actions={pageActions}
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          {settingsSections.map((section) => (
            <TabsTrigger key={section.id} value={section.id} className="flex items-center gap-2">
              {section.icon}
              <span className="hidden sm:inline">{section.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and account preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    value={settings.profile.name}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      profile: { ...prev.profile, name: e.target.value }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={settings.profile.email}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      profile: { ...prev.profile, email: e.target.value }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input 
                    id="timezone" 
                    value={settings.profile.timezone}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      profile: { ...prev.profile, timezone: e.target.value }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Input 
                    id="language" 
                    value={settings.profile.language}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      profile: { ...prev.profile, language: e.target.value }
                    }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage your account security and authentication methods
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Switch 
                  checked={settings.security.twoFactorEnabled}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    security: { ...prev.security, twoFactorEnabled: checked }
                  }))}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Login Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when someone signs into your account
                  </p>
                </div>
                <Switch 
                  checked={settings.security.loginNotifications}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    security: { ...prev.security, loginNotifications: checked }
                  }))}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Automatic API Key Rotation</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically rotate API keys every 30 days
                  </p>
                </div>
                <Switch 
                  checked={settings.security.apiKeyRotation}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    security: { ...prev.security, apiKeyRotation: checked }
                  }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to be notified about important events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={settings.notifications.email}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, email: checked }
                  }))}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive push notifications on your mobile device
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={settings.notifications.push}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, push: checked }
                  }))}
                />
              </div>

              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Critical Alerts Only</Label>
                  <p className="text-sm text-muted-foreground">
                    Only receive notifications for critical system events
                  </p>
                </div>
                <Switch 
                  checked={settings.notifications.criticalOnly}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, criticalOnly: checked }
                  }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                System Configuration
              </CardTitle>
              <CardDescription>
                Configure system-wide settings and maintenance options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Automatic Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically install system updates
                  </p>
                </div>
                <Switch 
                  checked={settings.system.autoUpdates}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    system: { ...prev.system, autoUpdates: checked }
                  }))}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Debug Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable detailed logging for troubleshooting
                  </p>
                </div>
                <Switch 
                  checked={settings.system.debugMode}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    system: { ...prev.system, debugMode: checked }
                  }))}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="dataRetention">Data Retention (days)</Label>
                <Input 
                  id="dataRetention" 
                  type="number"
                  value={settings.system.dataRetention}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    system: { ...prev.system, dataRetention: parseInt(e.target.value) }
                  }))}
                />
                <p className="text-sm text-muted-foreground">
                  How long to keep historical data before automatic cleanup
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}