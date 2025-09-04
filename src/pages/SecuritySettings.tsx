import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SecurityDemo } from '@/components/security/SecurityDemo';

export default function SecuritySettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    twoFactorRequired: false,
    sessionTimeout: 24,
    passwordMinLength: 8,
    passwordRequireSpecialChars: true,
    passwordRequireNumbers: true,
    maxFailedLogins: 5,
    lockoutDuration: 30
  });

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'security')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data?.setting_value) {
        const savedSettings = data.setting_value as any;
        setSettings({
          twoFactorRequired: savedSettings.twoFactorRequired || false,
          sessionTimeout: savedSettings.sessionTimeout || 24,
          passwordMinLength: savedSettings.passwordMinLength || 8,
          passwordRequireSpecialChars: savedSettings.passwordRequireSpecialChars !== false,
          passwordRequireNumbers: savedSettings.passwordRequireNumbers !== false,
          maxFailedLogins: savedSettings.maxFailedLogins || 5,
          lockoutDuration: savedSettings.lockoutDuration || 30
        });
      }
    } catch (error) {
      console.error('Error loading security settings:', error);
      toast({
        title: "Error",
        description: "Failed to load security settings. Using defaults.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.rpc('update_security_settings', {
        _settings: {
          twoFactorRequired: settings.twoFactorRequired,
          sessionTimeout: settings.sessionTimeout,
          passwordMinLength: settings.passwordMinLength,
          passwordRequireSpecialChars: settings.passwordRequireSpecialChars,
          passwordRequireNumbers: settings.passwordRequireNumbers,
          maxFailedLogins: settings.maxFailedLogins,
          lockoutDuration: settings.lockoutDuration
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Security settings saved",
        description: "Your security configuration has been updated successfully. These settings will now be enforced for all users.",
        duration: 5000,
      });
    } catch (error) {
      console.error('Error saving security settings:', error);
      toast({
        title: "Error",
        description: "Failed to save security settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading security settings...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/system-settings')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to System Settings
        </Button>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Shield className="h-8 w-8 text-green-600" />
          Security Settings
        </h1>
        <p className="text-muted-foreground">
          Configure security policies, authentication requirements, and access controls.
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> These security settings are now fully functional and will be enforced for all user logins, password changes, and authentication attempts. Changes take effect immediately upon saving.
        </AlertDescription>
      </Alert>

      {/* Authentication Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Authentication Security
          </CardTitle>
          <CardDescription>
            Configure authentication requirements and session management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Require Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Force all users to enable 2FA for enhanced security
              </p>
            </div>
            <Switch
              checked={settings.twoFactorRequired}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, twoFactorRequired: checked }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-timeout">Session Timeout (hours)</Label>
            <Input
              id="session-timeout"
              type="number"
              value={settings.sessionTimeout}
              onChange={(e) => 
                setSettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) || 24 }))
              }
              className="max-w-xs"
            />
            <p className="text-sm text-muted-foreground">
              Users will be logged out after this period of inactivity
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Password Policies */}
      <Card>
        <CardHeader>
          <CardTitle>Password Policies</CardTitle>
          <CardDescription>
            Set password requirements and complexity rules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password-length">Minimum Password Length</Label>
            <Input
              id="password-length"
              type="number"
              value={settings.passwordMinLength}
              onChange={(e) => 
                setSettings(prev => ({ ...prev, passwordMinLength: parseInt(e.target.value) || 8 }))
              }
              className="max-w-xs"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Require Special Characters</Label>
              <p className="text-sm text-muted-foreground">
                Passwords must contain at least one special character
              </p>
            </div>
            <Switch
              checked={settings.passwordRequireSpecialChars}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, passwordRequireSpecialChars: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Require Numbers</Label>
              <p className="text-sm text-muted-foreground">
                Passwords must contain at least one numeric digit
              </p>
            </div>
            <Switch
              checked={settings.passwordRequireNumbers}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, passwordRequireNumbers: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Account Lockout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Account Lockout Protection
          </CardTitle>
          <CardDescription>
            Protect against brute force attacks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="max-failed">Maximum Failed Login Attempts</Label>
            <Input
              id="max-failed"
              type="number"
              value={settings.maxFailedLogins}
              onChange={(e) => 
                setSettings(prev => ({ ...prev, maxFailedLogins: parseInt(e.target.value) || 5 }))
              }
              className="max-w-xs"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lockout-duration">Lockout Duration (minutes)</Label>
            <Input
              id="lockout-duration"
              type="number"
              value={settings.lockoutDuration}
              onChange={(e) => 
                setSettings(prev => ({ ...prev, lockoutDuration: parseInt(e.target.value) || 30 }))
              }
              className="max-w-xs"
            />
            <p className="text-sm text-muted-foreground">
              How long to lock accounts after too many failed attempts
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="min-w-32">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Security Testing Demo */}
      <SecurityDemo />
    </div>
  );
}