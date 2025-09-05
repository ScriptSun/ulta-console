import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Bell, Mail, MessageCircle, Webhook, ArrowLeft, Save, Loader2, 
  TestTube, Shield, CheckCircle, AlertCircle, Copy, Settings,
  Slack, Send, MessageSquare, Phone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface EmailProvider {
  id: string;
  customer_id: string;
  name: string;
  type: 'smtp' | 'sendgrid' | 'mailgun' | 'ses' | 'postmark' | 'resend';
  enabled: boolean;
  is_primary: boolean;
  config: {
    // SMTP
    host?: string;
    port?: string;
    username?: string;
    password?: string;
    tls?: boolean;
    // API-based
    apiKey?: string;
    domain?: string;
    region?: string;
    accessKey?: string;
    secretKey?: string;
    serverToken?: string;
    configurationSet?: string;
    // SendGrid specific
    fromEmail?: string;
    fromName?: string;
    // Postmark specific
    messageStream?: string;
    trackOpens?: boolean;
    trackLinks?: boolean;
  };
  status?: 'connected' | 'error' | 'disconnected' | 'testing';
  last_tested_at?: string;
  created_at?: string;
  updated_at?: string;
}

interface ChannelProvider {
  id: string;
  customer_id: string;
  name: string;
  type: 'slack' | 'telegram' | 'discord' | 'twilio';
  enabled: boolean;
  config: {
    webhookUrl?: string;
    channel?: string;
    botToken?: string;
    chatId?: string;
    accountSid?: string;
    authToken?: string;
    fromNumber?: string;
  };
  status?: 'connected' | 'error' | 'disconnected' | 'testing';
  last_tested_at?: string;
  created_at?: string;
  updated_at?: string;
}

interface DomainHealth {
  domain: string;
  spf: { status: 'valid' | 'invalid' | 'missing'; record?: string; suggestion?: string };
  dkim: { status: 'valid' | 'invalid' | 'missing'; record?: string; suggestion?: string };
  dmarc: { status: 'valid' | 'invalid' | 'missing'; record?: string; suggestion?: string };
}

interface NotificationSettings {
  emailProviders: EmailProvider[];
  channelProviders: ChannelProvider[];
  failoverOrder: string[];
  domainHealth: DomainHealth[];
}

export default function NotificationSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotificationSettings>({
    emailProviders: [],
    channelProviders: [],
    failoverOrder: [],
    domainHealth: []
  });
  const [currentCustomerId, setCurrentCustomerId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [testEmail, setTestEmail] = useState('test@example.com');
  
  // Local state for unsaved provider configurations
  const [localConfigs, setLocalConfigs] = useState<{[providerId: string]: any}>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<{[providerId: string]: boolean}>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Get current user to determine customer_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Set user's email as default test email
      setTestEmail(user.email || 'test@example.com');

      // Get user's customer IDs from user_roles table
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('customer_id')
        .eq('user_id', user.id)
        .limit(1);

      if (rolesError) throw rolesError;

      let customerId: string;
      
      if (userRoles && userRoles.length > 0) {
        // Use the first customer ID from user roles
        customerId = userRoles[0].customer_id;
      } else {
        // Create a default customer ID and user role if none exists
        customerId = '22222222-2222-2222-2222-222222222222'; // Use existing customer ID from the system
        
        // Insert user role for this customer (ignore if already exists)
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: user.id,
            customer_id: customerId,
            role: 'owner'
          }, { 
            onConflict: 'user_id,customer_id,role',
            ignoreDuplicates: true 
          });
      }
      
      setCurrentCustomerId(customerId);

      // Load email providers
      const { data: emailProviders, error: emailError } = await supabase
        .from('email_providers')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: true });

      if (emailError) throw emailError;

      // Load channel providers
      const { data: channelProviders, error: channelError } = await supabase
        .from('channel_providers')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: true });

      if (channelError) throw channelError;

      // Load notification settings
      const { data: notificationSettings, error: settingsError } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('customer_id', customerId)
        .maybeSingle();

      if (settingsError) throw settingsError;

      setSettings({
        emailProviders: (emailProviders || []).map(provider => ({
          ...provider,
          config: provider.config as EmailProvider['config'],
          type: provider.type as EmailProvider['type'],
          status: provider.status as EmailProvider['status']
        })),
        channelProviders: (channelProviders || []).map(provider => ({
          ...provider,
          config: provider.config as ChannelProvider['config'],
          type: provider.type as ChannelProvider['type'],
          status: provider.status as ChannelProvider['status']
        })),
        failoverOrder: (notificationSettings?.failover_order as string[]) || [],
        domainHealth: (notificationSettings?.domain_health as unknown as DomainHealth[]) || []
      });
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
      // Save notification settings (failover order and domain health)
      await supabase
        .from('notification_settings')
        .upsert({
          customer_id: currentCustomerId,
          failover_order: settings.failoverOrder as any,
          domain_health: settings.domainHealth as any
        });

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

  const toggleEmailProvider = async (type: EmailProvider['type'], enabled: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const existingProvider = settings.emailProviders.find(p => p.type === type);
      
      if (existingProvider && !enabled) {
        // Disable existing provider
        await updateEmailProvider(existingProvider.id, { enabled: false });
        return;
      }
      
      if (!existingProvider && enabled) {
        // Create new provider
        const { data, error } = await supabase
          .from('email_providers')
          .insert({
            customer_id: currentCustomerId,
            name: type.toUpperCase(),
            type,
            enabled: true,
            is_primary: settings.emailProviders.length === 0, // First provider is primary
            config: getDefaultConfig(type),
            created_by: user.id,
            updated_by: user.id
          })
          .select()
          .single();

        if (error) throw error;

        setSettings(prev => ({
          ...prev,
          emailProviders: [...prev.emailProviders, {
            ...data,
            config: data.config as EmailProvider['config'],
            type: data.type as EmailProvider['type'],
            status: data.status as EmailProvider['status']
          }]
        }));
      } else if (existingProvider) {
        // Enable existing provider
        await updateEmailProvider(existingProvider.id, { enabled: true });
      }
    } catch (error) {
      console.error('Error toggling email provider:', error);
      toast({
        title: "Error updating provider",
        description: "Failed to update email provider. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleChannelProvider = async (type: ChannelProvider['type'], enabled: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const existingProvider = settings.channelProviders.find(p => p.type === type);
      
      if (existingProvider && !enabled) {
        // Disable existing provider
        await updateChannelProvider(existingProvider.id, { enabled: false });
        return;
      }
      
      if (!existingProvider && enabled) {
        // Create new provider
        const { data, error } = await supabase
          .from('channel_providers')
          .insert({
            customer_id: currentCustomerId,
            name: type.charAt(0).toUpperCase() + type.slice(1),
            type,
            enabled: true,
            config: getDefaultChannelConfig(type),
            created_by: user.id,
            updated_by: user.id
          })
          .select()
          .single();

        if (error) throw error;

        setSettings(prev => ({
          ...prev,
          channelProviders: [...prev.channelProviders, {
            ...data,
            config: data.config as ChannelProvider['config'],
            type: data.type as ChannelProvider['type'],
            status: data.status as ChannelProvider['status']
          }]
        }));
      } else if (existingProvider) {
        // Enable existing provider
        await updateChannelProvider(existingProvider.id, { enabled: true });
      }
    } catch (error) {
      console.error('Error toggling channel provider:', error);
      toast({
        title: "Error updating provider",
        description: "Failed to update channel provider. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getDefaultConfig = (type: EmailProvider['type']) => {
    switch (type) {
      case 'smtp':
        return { host: '', port: '587', username: '', password: '', tls: true };
      case 'sendgrid':
        return { apiKey: '' };
      case 'mailgun':
        return { domain: '', region: 'us', apiKey: '', fromEmail: '', fromName: '' };
      case 'ses':
        return { accessKey: '', secretKey: '', region: 'us-east-1', fromEmail: '', fromName: '', configurationSet: '' };
      case 'postmark':
        return { serverToken: '' };
      case 'resend':
        return { apiKey: '', fromEmail: '', fromName: '' };
      default:
        return {};
    }
  };

  const getDefaultChannelConfig = (type: ChannelProvider['type']) => {
    switch (type) {
      case 'slack':
        return { webhookUrl: '', channel: '' };
      case 'telegram':
        return { botToken: '', chatId: '' };
      case 'discord':
        return { webhookUrl: '' };
      case 'twilio':
        return { accountSid: '', authToken: '', fromNumber: '' };
      default:
        return {};
    }
  };

  const updateEmailProvider = async (providerId: string, updates: Partial<EmailProvider>) => {
    setSavingProvider(providerId);
    try {
      const { error } = await supabase
        .from('email_providers')
        .update(updates)
        .eq('id', providerId);

      if (error) throw error;

      setSettings(prev => ({
        ...prev,
        emailProviders: prev.emailProviders.map(p => 
          p.id === providerId ? { ...p, ...updates } : p
        )
      }));
    } catch (error) {
      console.error('Error updating email provider:', error);
      toast({
        title: "Error updating provider",
        description: "Failed to update email provider. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setSavingProvider(null), 500);
    }
  };

  const updateChannelProvider = async (providerId: string, updates: Partial<ChannelProvider>) => {
    try {
      const { error } = await supabase
        .from('channel_providers')
        .update(updates)
        .eq('id', providerId);

      if (error) throw error;

      setSettings(prev => ({
        ...prev,
        channelProviders: prev.channelProviders.map(p => 
          p.id === providerId ? { ...p, ...updates } : p
        )
      }));
    } catch (error) {
      console.error('Error updating channel provider:', error);
      toast({
        title: "Error updating provider",
        description: "Failed to update channel provider. Please try again.",
        variant: "destructive",
      });
    }
  };

  const testProvider = async (providerId: string, type: 'email' | 'channel') => {
    setTestingProvider(providerId);
    
    try {
      let provider: EmailProvider | ChannelProvider | undefined;
      let providerType: string;
      let config: any;

      if (type === 'email') {
        provider = settings.emailProviders.find(p => p.id === providerId);
        providerType = provider?.type || 'unknown';
        config = { 
          ...provider?.config, 
          type: provider?.type, 
          testEmail,
          ...(provider?.type === 'sendgrid' || provider?.type === 'resend') && {
            fromEmail: provider.config.fromEmail,
            fromName: provider.config.fromName
          }
        };
      } else {
        provider = settings.channelProviders.find(p => p.id === providerId);
        providerType = provider?.type || 'unknown';
        config = provider?.config;
      }

      if (!provider) {
        throw new Error('Provider not found');
      }

      // Call the test edge function
      const { data, error } = await supabase.functions.invoke('test-notification-providers', {
        body: {
          providerType,
          config
        }
      });

      if (error) {
        throw new Error(error.message || 'Test function failed');
      }

        if (data.success) {
          if (type === 'email') {
            await updateEmailProvider(providerId, { 
              status: 'connected', 
              last_tested_at: new Date().toISOString() 
            });
          } else {
            await updateChannelProvider(providerId, { 
              status: 'connected', 
              last_tested_at: new Date().toISOString() 
            });
          }
        
        toast({
          title: "Test successful",
          description: data.message || "Provider connection test passed.",
        });
        } else {
          if (type === 'email') {
            await updateEmailProvider(providerId, { 
              status: 'error', 
              last_tested_at: new Date().toISOString() 
            });
          } else {
            await updateChannelProvider(providerId, { 
              status: 'error', 
              last_tested_at: new Date().toISOString() 
            });
          }

        toast({
          title: "Test failed",
          description: data.error || data.message || "Provider connection test failed.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Provider test error:', error);
      
      if (type === 'email') {
        await updateEmailProvider(providerId, { 
          status: 'error', 
          last_tested_at: new Date().toISOString() 
        });
      } else {
        await updateChannelProvider(providerId, { 
          status: 'error', 
          last_tested_at: new Date().toISOString() 
        });
      }

      toast({
        title: "Test failed",
        description: error.message || "Provider connection test failed.",
        variant: "destructive",
      });
    } finally {
      setTestingProvider(null);
    }
  };

  // Save provider configuration
  const saveProviderConfig = async (providerId: string) => {
    setSavingProvider(providerId);
    try {
      const config = localConfigs[providerId];
      const { error } = await supabase
        .from('email_providers')
        .update({ config })
        .eq('id', providerId);

      if (error) throw error;

      // Update settings state
      setSettings(prev => ({
        ...prev,
        emailProviders: prev.emailProviders.map(p => 
          p.id === providerId ? { ...p, config } : p
        )
      }));

      // Clear unsaved changes
      setHasUnsavedChanges(prev => ({
        ...prev,
        [providerId]: false
      }));

      toast({
        title: "Provider saved",
        description: "Configuration has been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving provider:', error);
      toast({
        title: "Error saving provider",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingProvider(null);
    }
  };

  const renderEmailProviderConfig = (provider: EmailProvider) => {
    // Get current config (local if exists, otherwise from provider)
    const currentConfig = localConfigs[provider.id] || provider.config;
    
    const updateLocalConfig = (key: string, value: any) => {
      setLocalConfigs(prev => ({
        ...prev,
        [provider.id]: { ...currentConfig, [key]: value }
      }));
      setHasUnsavedChanges(prev => ({
        ...prev,
        [provider.id]: true
      }));
    };

    switch (provider.type) {
      case 'smtp':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Host</Label>
              <Input
                value={currentConfig.host || ''}
                onChange={(e) => updateLocalConfig('host', e.target.value)}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div>
              <Label>Port</Label>
              <Input
                value={currentConfig.port || ''}
                onChange={(e) => updateLocalConfig('port', e.target.value)}
                placeholder="587"
              />
            </div>
            <div>
              <Label>Username</Label>
              <Input
                value={currentConfig.username || ''}
                onChange={(e) => updateLocalConfig('username', e.target.value)}
                placeholder="your-email@example.com"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={currentConfig.password || ''}
                onChange={(e) => updateLocalConfig('password', e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="col-span-2 flex items-center space-x-2">
              <Switch
                checked={currentConfig.tls || false}
                onCheckedChange={(checked) => updateLocalConfig('tls', checked)}
              />
              <Label>Use TLS</Label>
            </div>
          </div>
        );
      
      case 'sendgrid':
      case 'resend':
        return (
          <div className="space-y-4">
            <div>
              <Label>API Key</Label>
              <Input
                type="password"
                value={currentConfig.apiKey || ''}
                onChange={(e) => updateLocalConfig('apiKey', e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {(provider.type === 'sendgrid' || provider.type === 'resend') && (
              <>
                <div>
                  <Label htmlFor="fromEmail">From Email Address (must be verified)</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    placeholder="noreply@yourdomain.com"
                    value={currentConfig.fromEmail || ''}
                    onChange={(e) => updateLocalConfig('fromEmail', e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    This must be a verified sender identity in your {provider.type} account.
                    {provider.type === 'sendgrid' && (
                      <>{' '}
                        <a
                          href="https://app.sendgrid.com/settings/sender_auth"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Verify your sender identity here
                        </a>
                      </>
                    )}
                    {provider.type === 'resend' && (
                      <>{' '}
                        <a
                          href="https://resend.com/domains"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Verify your domain here
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <div>
                  <Label htmlFor="fromName">From Name (optional)</Label>
                  <Input
                    id="fromName"
                    type="text"
                    placeholder="Your App Name"
                    value={currentConfig.fromName || ''}
                    onChange={(e) => updateLocalConfig('fromName', e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        );
      
      case 'mailgun':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Domain</Label>
              <Input
                value={currentConfig.domain || ''}
                onChange={(e) => updateLocalConfig('domain', e.target.value)}
                placeholder="mg.example.com"
              />
            </div>
            <div>
              <Label>Region</Label>
              <Select 
                value={currentConfig.region || 'us'} 
                onValueChange={(value) => updateLocalConfig('region', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us">US</SelectItem>
                  <SelectItem value="eu">EU</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={currentConfig.apiKey || ''}
                onChange={(e) => updateLocalConfig('apiKey', e.target.value)}
                placeholder="key-••••••••••••••••••••••••••••••••"
              />
            </div>
            <div>
              <Label>From Email</Label>
              <Input
                value={currentConfig.fromEmail || ''}
                onChange={(e) => updateLocalConfig('fromEmail', e.target.value)}
                placeholder="noreply@yourdomain.com"
              />
            </div>
            <div>
              <Label>From Name</Label>
              <Input
                value={currentConfig.fromName || ''}
                onChange={(e) => updateLocalConfig('fromName', e.target.value)}
                placeholder="Your Company Name"
              />
            </div>
          </div>
        );
      
      case 'ses':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Access Key</Label>
              <Input
                value={currentConfig.accessKey || ''}
                onChange={(e) => updateLocalConfig('accessKey', e.target.value)}
                placeholder="AKIA..."
              />
            </div>
            <div>
              <Label>Secret Key</Label>
              <Input
                type="password"
                value={currentConfig.secretKey || ''}
                onChange={(e) => updateLocalConfig('secretKey', e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="col-span-2">
              <Label>Region</Label>
              <Select 
                value={currentConfig.region || 'us-east-1'} 
                onValueChange={(value) => updateLocalConfig('region', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                  <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                  <SelectItem value="eu-west-1">EU (Ireland)</SelectItem>
                  <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                  <SelectItem value="ca-central-1">Canada (Central)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>From Email</Label>
              <Input
                value={currentConfig.fromEmail || ''}
                onChange={(e) => updateLocalConfig('fromEmail', e.target.value)}
                placeholder="noreply@yourdomain.com"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Must be a verified email or domain in SES
              </p>
            </div>
            <div>
              <Label>From Name</Label>
              <Input
                value={currentConfig.fromName || ''}
                onChange={(e) => updateLocalConfig('fromName', e.target.value)}
                placeholder="Your Company Name"
              />
            </div>
            <div className="col-span-2">
              <Label>Configuration Set (Optional)</Label>
              <Input
                value={currentConfig.configurationSet || ''}
                onChange={(e) => updateLocalConfig('configurationSet', e.target.value)}
                placeholder="my-configuration-set"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Optional: For tracking bounces, complaints, and delivery metrics
              </p>
            </div>
          </div>
        );
      
      case 'postmark':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Server Token</Label>
              <Input
                type="password"
                value={currentConfig.serverToken || ''}
                onChange={(e) => updateLocalConfig('serverToken', e.target.value)}
                placeholder="••••••••"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Your Postmark Server API Token
              </p>
            </div>
            <div>
              <Label>From Email</Label>
              <Input
                value={currentConfig.fromEmail || ''}
                onChange={(e) => updateLocalConfig('fromEmail', e.target.value)}
                placeholder="noreply@yourdomain.com"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Must be a verified sender signature in Postmark
              </p>
            </div>
            <div>
              <Label>From Name</Label>
              <Input
                value={currentConfig.fromName || ''}
                onChange={(e) => updateLocalConfig('fromName', e.target.value)}
                placeholder="Your Company Name"
              />
            </div>
            <div>
              <Label>Message Stream</Label>
              <Select 
                value={currentConfig.messageStream || 'outbound'} 
                onValueChange={(value) => updateLocalConfig('messageStream', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outbound">Outbound</SelectItem>
                  <SelectItem value="broadcast">Broadcast</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={currentConfig.trackOpens || false}
                  onCheckedChange={(checked) => updateLocalConfig('trackOpens', checked)}
                />
                <Label>Track Opens</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={currentConfig.trackLinks || false}
                  onCheckedChange={(checked) => updateLocalConfig('trackLinks', checked)}
                />
                <Label>Track Links</Label>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  const renderChannelProviderConfig = (provider: ChannelProvider) => {
    const updateConfig = (key: string, value: any) => {
      updateChannelProvider(provider.id, {
        config: { ...provider.config, [key]: value }
      });
    };

    switch (provider.type) {
      case 'slack':
        return (
          <div className="space-y-4">
            <div>
              <Label>Webhook URL</Label>
              <Input
                value={provider.config.webhookUrl || ''}
                onChange={(e) => updateConfig('webhookUrl', e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
              />
            </div>
            <div>
              <Label>Channel</Label>
              <Input
                value={provider.config.channel || ''}
                onChange={(e) => updateConfig('channel', e.target.value)}
                placeholder="#alerts"
              />
            </div>
          </div>
        );
      
      case 'telegram':
        return (
          <div className="space-y-4">
            <div>
              <Label>Bot Token</Label>
              <Input
                type="password"
                value={provider.config.botToken || ''}
                onChange={(e) => updateConfig('botToken', e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div>
              <Label>Chat ID</Label>
              <Input
                value={provider.config.chatId || ''}
                onChange={(e) => updateConfig('chatId', e.target.value)}
                placeholder="-1001234567890"
              />
            </div>
          </div>
        );
      
      case 'discord':
        return (
          <div>
            <Label>Webhook URL</Label>
            <Input
              value={provider.config.webhookUrl || ''}
              onChange={(e) => updateConfig('webhookUrl', e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
            />
          </div>
        );
      
      case 'twilio':
        return (
          <div className="space-y-4">
            <div>
              <Label>Account SID</Label>
              <Input
                value={provider.config.accountSid || ''}
                onChange={(e) => updateConfig('accountSid', e.target.value)}
                placeholder="AC..."
              />
            </div>
            <div>
              <Label>Auth Token</Label>
              <Input
                type="password"
                value={provider.config.authToken || ''}
                onChange={(e) => updateConfig('authToken', e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div>
              <Label>From Number</Label>
              <Input
                value={provider.config.fromNumber || ''}
                onChange={(e) => updateConfig('fromNumber', e.target.value)}
                placeholder="+1234567890"
              />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  const checkDomainHealth = async () => {
    if (!domainInput.trim()) {
      toast({
        title: "Domain required",
        description: "Please enter a domain name to check.",
        variant: "destructive",
      });
      return;
    }

    // Clean the domain input by removing protocol, www, and trailing slashes
    let cleanDomain = domainInput.trim()
      .replace(/^https?:\/\//, '') // Remove protocol
      .replace(/^www\./, '') // Remove www
      .replace(/\/$/, '') // Remove trailing slash
      .split('/')[0]; // Take only the domain part

    if (!cleanDomain) {
      toast({
        title: "Invalid domain",
        description: "Please enter a valid domain name (e.g., example.com).",
        variant: "destructive",
      });
      return;
    }

    setCheckingDomain(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('check-domain-health', {
        body: {
          domain: cleanDomain
        }
      });

      if (error) {
        throw new Error(error.message || 'Domain check failed');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Update settings with new domain health data
      setSettings(prev => ({
        ...prev,
        domainHealth: [
          ...prev.domainHealth.filter(d => d.domain !== data.domain),
          data
        ]
      }));

      toast({
        title: "Domain check complete",
        description: `Health check completed for ${data.domain}`,
      });
    } catch (error: any) {
      console.error('Domain check error:', error);
      toast({
        title: "Domain check failed",
        description: error.message || "Failed to check domain health.",
        variant: "destructive",
      });
    } finally {
      setCheckingDomain(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied",
        description: "Record copied to clipboard.",
      });
    });
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
            <h1 className="text-3xl font-bold">UltaAI Notification Settings</h1>
          </div>
          <p className="text-muted-foreground ml-12">
            Providers and routing - Configure multiple providers, failover, and delivery channels.
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

      <Tabs defaultValue="email" className="space-y-6">
        <TabsList>
          <TabsTrigger value="email">Email Providers</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="failover">Failover</TabsTrigger>
          <TabsTrigger value="domain">Domain Health</TabsTrigger>
        </TabsList>

        {/* Email Providers Tab */}
        <TabsContent value="email" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Email Providers</h3>
              <p className="text-sm text-muted-foreground">Configure multiple email providers with failover support</p>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="test-email" className="text-sm">Test Email:</Label>
              <Input
                id="test-email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-48"
                placeholder="test@example.com"
              />
            </div>
          </div>

          <div className="grid gap-4">
            {(['smtp', 'sendgrid', 'mailgun', 'ses', 'postmark', 'resend'] as const).map((providerType) => {
              const provider = settings.emailProviders.find(p => p.type === providerType);
              const hasEnabledProviders = settings.emailProviders.some(p => p.enabled);
              const isEnabled = provider?.enabled || (!hasEnabledProviders && providerType === 'smtp');
              const shouldShowAsPrimary = provider?.is_primary && isEnabled;
              const shouldShowAsDefaultPrimary = !hasEnabledProviders && providerType === 'smtp';
              
              const providerLabels = {
                smtp: 'SMTP Server',
                sendgrid: 'SendGrid',
                mailgun: 'Mailgun',
                ses: 'Amazon SES',
                postmark: 'Postmark',
                resend: 'Resend'
              };

              return (
                <Card key={providerType} className={`transition-all ${!isEnabled ? 'opacity-60' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {providerLabels[providerType]}
                            {shouldShowAsPrimary && (
                              <Badge variant="default">Primary</Badge>
                            )}
                            {shouldShowAsDefaultPrimary && (
                              <Badge variant="outline" className="text-muted-foreground">
                                Primary - Needs Configuration
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription>{providerType.toUpperCase()}</CardDescription>
                        </div>
                        {provider?.status && isEnabled && (
                          <Badge 
                            variant={provider.status === 'connected' ? 'default' : 'destructive'}
                            className={provider.status === 'connected' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                          >
                            {provider.status.charAt(0).toUpperCase() + provider.status.slice(1)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => toggleEmailProvider(providerType, checked)}
                        />
                        {provider && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => testProvider(provider.id, 'email')}
                            disabled={testingProvider === provider.id || !isEnabled}
                          >
                            {testingProvider === provider.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <TestTube className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {isEnabled && provider && (
                    <CardContent className="space-y-4">
                      {renderEmailProviderConfig(provider)}
                      
                      {/* Unsaved changes indicator */}
                      {hasUnsavedChanges[provider.id] && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <div className="w-2 h-2 bg-warning rounded-full"></div>
                          Unsaved changes
                        </div>
                      )}
                      
                      {/* Saving indicator */}
                      {savingProvider === provider.id && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                          Saving...
                        </div>
                      )}
                      
                      <div className="flex gap-2 pt-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateEmailProvider(provider.id, { is_primary: true })}
                          disabled={provider.is_primary}
                        >
                          Set as Primary
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testProvider(provider.id, 'email')}
                          disabled={testingProvider === provider.id}
                        >
                          Send Test
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => saveProviderConfig(provider.id)}
                          disabled={!hasUnsavedChanges[provider.id] || savingProvider === provider.id}
                        >
                          {savingProvider === provider.id ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
            
            {/* Legacy providers that might exist but aren't in the predefined list */}
            {settings.emailProviders.filter(p => !['smtp', 'sendgrid', 'mailgun', 'ses', 'postmark', 'resend'].includes(p.type)).map((provider) => (
              <Card key={provider.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle>{provider.name}</CardTitle>
                        <CardDescription>{provider.type.toUpperCase()}</CardDescription>
                      </div>
                      {provider.is_primary && (
                        <Badge variant="default">Primary</Badge>
                      )}
                      {provider.status && (
                        <Badge 
                          variant={provider.status === 'connected' ? 'default' : 'destructive'}
                          className={provider.status === 'connected' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                        >
                          {provider.status.charAt(0).toUpperCase() + provider.status.slice(1)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={provider.enabled}
                        onCheckedChange={(checked) => 
                          updateEmailProvider(provider.id, { enabled: checked })
                        }
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testProvider(provider.id, 'email')}
                        disabled={testingProvider === provider.id}
                      >
                        {testingProvider === provider.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {provider.enabled && (
                  <CardContent className="space-y-4">
                    {renderEmailProviderConfig(provider)}
                    
                    {/* Unsaved changes indicator */}
                    {hasUnsavedChanges[provider.id] && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <div className="w-2 h-2 bg-warning rounded-full"></div>
                        Unsaved changes
                      </div>
                    )}
                    
                    {/* Saving indicator */}
                    {savingProvider === provider.id && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                        Saving...
                      </div>
                    )}
                    
                    <div className="flex gap-2 pt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateEmailProvider(provider.id, { is_primary: true })}
                        disabled={provider.is_primary}
                      >
                        Set as Primary
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testProvider(provider.id, 'email')}
                        disabled={testingProvider === provider.id}
                      >
                        Send Test
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => saveProviderConfig(provider.id)}
                        disabled={!hasUnsavedChanges[provider.id] || savingProvider === provider.id}
                      >
                        {savingProvider === provider.id ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Channels Tab */}
        <TabsContent value="channels" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Notification Channels</h3>
              <p className="text-sm text-muted-foreground">Configure Slack, Telegram, Discord, and Twilio channels</p>
            </div>
          </div>

          <div className="grid gap-4">
            {(['slack', 'telegram', 'discord', 'twilio'] as const).map((providerType) => {
              const provider = settings.channelProviders.find(p => p.type === providerType);
              const isEnabled = provider?.enabled || false;
              const providerLabels = {
                slack: 'Slack',
                telegram: 'Telegram',
                discord: 'Discord',
                twilio: 'Twilio SMS'
              };
              const ProviderIcon = {
                slack: Slack,
                telegram: Send,
                discord: MessageSquare,
                twilio: Phone
              }[providerType];

              return (
                <Card key={providerType} className={`transition-all ${!isEnabled ? 'opacity-60' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ProviderIcon className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle>{providerLabels[providerType]}</CardTitle>
                          <CardDescription>{providerType.toUpperCase()}</CardDescription>
                        </div>
                        {provider?.status && isEnabled && (
                          <Badge 
                            variant={provider.status === 'connected' ? 'default' : 'destructive'}
                            className={provider.status === 'connected' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                          >
                            {provider.status.charAt(0).toUpperCase() + provider.status.slice(1)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => toggleChannelProvider(providerType, checked)}
                        />
                        {provider && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => testProvider(provider.id, 'channel')}
                            disabled={testingProvider === provider.id || !isEnabled}
                          >
                            {testingProvider === provider.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <TestTube className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {isEnabled && provider && (
                    <CardContent className="space-y-4">
                      {renderChannelProviderConfig(provider)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testProvider(provider.id, 'channel')}
                        disabled={testingProvider === provider.id}
                      >
                        {testingProvider === provider.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4 mr-2" />
                        )}
                        Test
                      </Button>
                    </CardContent>
                  )}
                </Card>
              );
            })}
            
            {/* Legacy providers that might exist but aren't in the predefined list */}
            {settings.channelProviders.filter(p => !['slack', 'telegram', 'discord', 'twilio'].includes(p.type)).map((provider) => (
              <Card key={provider.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle>{provider.name}</CardTitle>
                        <CardDescription>{provider.type.toUpperCase()}</CardDescription>
                      </div>
                      {provider.status && (
                        <Badge 
                          variant={provider.status === 'connected' ? 'default' : 'destructive'}
                          className={provider.status === 'connected' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                        >
                          {provider.status.charAt(0).toUpperCase() + provider.status.slice(1)}
                        </Badge>
                      )}
                    </div>
                    <Switch
                      checked={provider.enabled}
                      onCheckedChange={(checked) => 
                        updateChannelProvider(provider.id, { enabled: checked })
                      }
                    />
                  </div>
                </CardHeader>
                {provider.enabled && (
                  <CardContent className="space-y-4">
                    {renderChannelProviderConfig(provider)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testProvider(provider.id, 'channel')}
                      disabled={testingProvider === provider.id}
                    >
                      {testingProvider === provider.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4 mr-2" />
                      )}
                      Test
                    </Button>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Failover Tab */}
        <TabsContent value="failover" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Failover Configuration</CardTitle>
              <CardDescription>Configure primary, secondary, and tertiary email providers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Primary</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select primary" />
                    </SelectTrigger>
                    <SelectContent>
                      {settings.emailProviders.filter(p => p.enabled).map(provider => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Secondary</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select secondary" />
                    </SelectTrigger>
                    <SelectContent>
                      {settings.emailProviders.filter(p => p.enabled).map(provider => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tertiary</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tertiary" />
                    </SelectTrigger>
                    <SelectContent>
                      {settings.emailProviders.filter(p => p.enabled).map(provider => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Domain Health Tab */}
        <TabsContent value="domain" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Domain Health</CardTitle>
              <CardDescription>SPF, DKIM, and DMARC status for your sending domains</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Enter domain (e.g., example.com)"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                  />
                  <Button 
                    onClick={checkDomainHealth}
                    disabled={checkingDomain}
                  >
                    {checkingDomain ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      'Check Domain'
                    )}
                  </Button>
                </div>
                
                {/* Domain health results */}
                {settings.domainHealth.map((domain, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="font-medium">{domain.domain}</div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {domain.spf.status === 'valid' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : domain.spf.status === 'invalid' ? (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className="font-medium">SPF</span>
                        </div>
                        <div className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded flex items-center justify-between">
                          <span className="flex-1">
                            {domain.spf.record || domain.spf.suggestion || 'Not configured'}
                          </span>
                          {(domain.spf.record || domain.spf.suggestion) && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="ml-2"
                              onClick={() => copyToClipboard(domain.spf.record || domain.spf.suggestion || '')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {domain.dkim.status === 'valid' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : domain.dkim.status === 'invalid' ? (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className="font-medium">DKIM</span>
                        </div>
                        <div className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded flex items-center justify-between">
                          <span className="flex-1">
                            {domain.dkim.record || domain.dkim.suggestion || 'Not configured'}
                          </span>
                          {(domain.dkim.record || domain.dkim.suggestion) && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="ml-2"
                              onClick={() => copyToClipboard(domain.dkim.record || domain.dkim.suggestion || '')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {domain.dmarc.status === 'valid' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : domain.dmarc.status === 'invalid' ? (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className="font-medium">DMARC</span>
                        </div>
                        <div className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded flex items-center justify-between">
                          <span className="flex-1">
                            {domain.dmarc.record || domain.dmarc.suggestion || 'Not configured'}
                          </span>
                          {(domain.dmarc.record || domain.dmarc.suggestion) && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="ml-2"
                              onClick={() => copyToClipboard(domain.dmarc.record || domain.dmarc.suggestion || '')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}