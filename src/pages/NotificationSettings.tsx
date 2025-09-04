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
    // SendGrid specific
    fromEmail?: string;
    fromName?: string;
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
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [providerConfigs, setProviderConfigs] = useState<{
    sendgrid?: { fromEmail?: string; fromName?: string; };
  }>({});

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
        
        // Insert user role for this customer
        await supabase
          .from('user_roles')
          .insert({
            user_id: user.id,
            customer_id: customerId,
            role: 'owner'
          })
          .select()
          .single();
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

  const addEmailProvider = async (type: EmailProvider['type']) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('email_providers')
        .insert({
          customer_id: currentCustomerId,
          name: type.toUpperCase(),
          type,
          enabled: false,
          is_primary: settings.emailProviders.length === 0,
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

      toast({
        title: "Provider added",
        description: `${type.toUpperCase()} provider has been added successfully.`,
      });
    } catch (error) {
      console.error('Error adding email provider:', error);
      toast({
        title: "Error adding provider",
        description: "Failed to add email provider. Please try again.",
        variant: "destructive",
      });
    }
  };

  const addChannelProvider = async (type: ChannelProvider['type']) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('channel_providers')
        .insert({
          customer_id: currentCustomerId,
          name: type.charAt(0).toUpperCase() + type.slice(1),
          type,
          enabled: false,
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

      toast({
        title: "Provider added",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} provider has been added successfully.`,
      });
    } catch (error) {
      console.error('Error adding channel provider:', error);
      toast({
        title: "Error adding provider",
        description: "Failed to add channel provider. Please try again.",
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
        return { domain: '', region: 'us', apiKey: '' };
      case 'ses':
        return { accessKey: '', secretKey: '', region: 'us-east-1' };
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

  const renderEmailProviderConfig = (provider: EmailProvider) => {
    const updateConfig = (key: string, value: any) => {
      updateEmailProvider(provider.id, {
        config: { ...provider.config, [key]: value }
      });
    };

    switch (provider.type) {
      case 'smtp':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Host</Label>
              <Input
                value={provider.config.host || ''}
                onChange={(e) => updateConfig('host', e.target.value)}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div>
              <Label>Port</Label>
              <Input
                value={provider.config.port || ''}
                onChange={(e) => updateConfig('port', e.target.value)}
                placeholder="587"
              />
            </div>
            <div>
              <Label>Username</Label>
              <Input
                value={provider.config.username || ''}
                onChange={(e) => updateConfig('username', e.target.value)}
                placeholder="your-email@example.com"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={provider.config.password || ''}
                onChange={(e) => updateConfig('password', e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="col-span-2 flex items-center space-x-2">
              <Switch
                checked={provider.config.tls || false}
                onCheckedChange={(checked) => updateConfig('tls', checked)}
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
                value={provider.config.apiKey || ''}
                onChange={(e) => updateConfig('apiKey', e.target.value)}
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
                    value={provider.config.fromEmail || ''}
                    onChange={(e) => updateConfig('fromEmail', e.target.value)}
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
                    value={provider.config.fromName || ''}
                    onChange={(e) => updateConfig('fromName', e.target.value)}
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
                value={provider.config.domain || ''}
                onChange={(e) => updateConfig('domain', e.target.value)}
                placeholder="mg.example.com"
              />
            </div>
            <div>
              <Label>Region</Label>
              <Select 
                value={provider.config.region || 'us'} 
                onValueChange={(value) => updateConfig('region', value)}
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
                value={provider.config.apiKey || ''}
                onChange={(e) => updateConfig('apiKey', e.target.value)}
                placeholder="••••••••"
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
                value={provider.config.accessKey || ''}
                onChange={(e) => updateConfig('accessKey', e.target.value)}
                placeholder="AKIA..."
              />
            </div>
            <div>
              <Label>Secret Key</Label>
              <Input
                type="password"
                value={provider.config.secretKey || ''}
                onChange={(e) => updateConfig('secretKey', e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="col-span-2">
              <Label>Region</Label>
              <Select 
                value={provider.config.region || 'us-east-1'} 
                onValueChange={(value) => updateConfig('region', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                  <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                  <SelectItem value="eu-west-1">EU (Ireland)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      
      case 'postmark':
        return (
          <div>
            <Label>Server Token</Label>
            <Input
              type="password"
              value={provider.config.serverToken || ''}
              onChange={(e) => updateConfig('serverToken', e.target.value)}
              placeholder="••••••••"
            />
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
            <div className="flex items-center gap-4">
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
              <Select onValueChange={(value) => addEmailProvider(value as EmailProvider['type'])}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Add Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smtp">SMTP</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="mailgun">Mailgun</SelectItem>
                  <SelectItem value="ses">Amazon SES</SelectItem>
                  <SelectItem value="postmark">Postmark</SelectItem>
                  <SelectItem value="resend">Resend</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4">
            {settings.emailProviders.map((provider) => (
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
                        <Badge variant={provider.status === 'connected' ? 'default' : 'destructive'}>
                          {provider.status}
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
            <Select onValueChange={(value) => addChannelProvider(value as ChannelProvider['type'])}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Add Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slack">Slack</SelectItem>
                <SelectItem value="telegram">Telegram</SelectItem>
                <SelectItem value="discord">Discord</SelectItem>
                <SelectItem value="twilio">Twilio SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4">
            {settings.channelProviders.map((provider) => (
              <Card key={provider.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {provider.type === 'slack' && <Slack className="h-5 w-5 text-primary" />}
                      {provider.type === 'telegram' && <Send className="h-5 w-5 text-primary" />}
                      {provider.type === 'discord' && <MessageSquare className="h-5 w-5 text-primary" />}
                      {provider.type === 'twilio' && <Phone className="h-5 w-5 text-primary" />}
                      <div>
                        <CardTitle>{provider.name}</CardTitle>
                        <CardDescription>{provider.type.toUpperCase()}</CardDescription>
                      </div>
                      {provider.status && (
                        <Badge variant={provider.status === 'connected' ? 'default' : 'destructive'}>
                          {provider.status}
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