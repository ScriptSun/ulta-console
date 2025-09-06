import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Building, Mail, Globe, Upload, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api-wrapper';
import { supabase } from '@/integrations/supabase/client';

interface OrganizationSettings {
  id?: string;
  organization_name: string;
  email_logo_url: string;
  website_url: string;
  support_email: string;
}

export function OrganizationSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<OrganizationSettings>({
    organization_name: 'UltaAI',
    email_logo_url: '',
    website_url: 'https://app.ultaai.com',
    support_email: 'support@ultaai.com'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_settings')
        .select('*')
        .single();

      if (error) {
        console.error('Error loading organization settings:', error);
        // If no settings exist, we'll use the default values
      } else if (data) {
        setSettings({
          id: data.id,
          organization_name: data.organization_name || 'UltaAI',
          email_logo_url: data.email_logo_url || '',
          website_url: data.website_url || 'https://app.ultaai.com',
          support_email: data.support_email || 'support@ultaai.com'
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error loading settings",
        description: "Failed to load organization settings. Using default values.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        organization_name: settings.organization_name,
        email_logo_url: settings.email_logo_url,
        website_url: settings.website_url,
        support_email: settings.support_email,
        updated_at: new Date().toISOString()
      };

      const result = await api.upsert('organization_settings', updateData);

      if (!result.success) throw new Error(result.error || 'Failed to save settings');

      setSettings({ ...settings, ...updateData });

      toast({
        title: 'Settings Saved',
        description: 'Organization settings have been updated successfully.'
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error saving settings",
        description: "Failed to save organization settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof OrganizationSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Loading organization settings...</p>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5 text-primary" />
          Organization Settings
        </CardTitle>
        <CardDescription>
          Configure your organization details for email templates. Variables like <code>&#123;&#123;org.name&#125;&#125;</code> and <code>&#123;&#123;assets.emailLogo&#125;&#125;</code> will use these values.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name *</Label>
            <Input
              id="org-name"
              value={settings.organization_name}
              onChange={(e) => handleInputChange('organization_name', e.target.value)}
              placeholder="Your Company Name"
            />
            <p className="text-xs text-muted-foreground">
              Used in email templates as <code>&#123;&#123;org.name&#125;&#125;</code>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website-url">Website URL *</Label>
            <Input
              id="website-url"
              type="url"
              value={settings.website_url}
              onChange={(e) => handleInputChange('website_url', e.target.value)}
              placeholder="https://yourcompany.com"
            />
            <p className="text-xs text-muted-foreground">
              Used in email templates as <code>&#123;&#123;org.url&#125;&#125;</code>
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="support-email">Support Email</Label>
          <Input
            id="support-email"
            type="email"
            value={settings.support_email}
            onChange={(e) => handleInputChange('support_email', e.target.value)}
            placeholder="support@yourcompany.com"
          />
          <p className="text-xs text-muted-foreground">
            Contact email for customer support
          </p>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-logo">Email Logo URL</Label>
            <Input
              id="email-logo"
              type="url"
              value={settings.email_logo_url}
              onChange={(e) => handleInputChange('email_logo_url', e.target.value)}
              placeholder="https://yourcompany.com/logo.png"
            />
            <p className="text-xs text-muted-foreground">
              Used in email templates as <code>&#123;&#123;assets.emailLogo&#125;&#125;</code>. Recommended size: 120x40px
            </p>
          </div>

          {settings.email_logo_url && (
            <div className="space-y-2">
              <Label>Logo Preview</Label>
              <div className="border rounded-lg p-4 bg-muted/20">
                <img
                  src={settings.email_logo_url}
                  alt="Email logo preview"
                  className="max-h-10 max-w-32 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Email Template Variables</h4>
          <p className="text-sm text-blue-800 mb-3">
            These settings will automatically populate the following variables in your email templates:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div className="font-mono bg-blue-100 px-2 py-1 rounded">
              <code>&#123;&#123;org.name&#125;&#125;</code> → {settings.organization_name}
            </div>
            <div className="font-mono bg-blue-100 px-2 py-1 rounded">
              <code>&#123;&#123;org.url&#125;&#125;</code> → {settings.website_url}
            </div>
            <div className="font-mono bg-blue-100 px-2 py-1 rounded">
              <code>&#123;&#123;assets.emailLogo&#125;&#125;</code> → Logo Image
            </div>
            <div className="font-mono bg-blue-100 px-2 py-1 rounded">
              <code>&#123;&#123;year&#125;&#125;</code> → {new Date().getFullYear()}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}