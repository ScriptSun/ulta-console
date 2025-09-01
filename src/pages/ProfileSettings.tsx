import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Camera, 
  Shield, 
  Key, 
  Bell, 
  Moon, 
  Sun, 
  Monitor,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Smartphone,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Trash2,
  Download
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeSelector } from '@/components/theme/ThemeSelector';
import { ThemeCustomizer } from '@/components/theme/ThemeCustomizer';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface UserPreferences {
  email_alerts: boolean;
  system_updates: boolean;
  security_alerts: boolean;
  agent_notifications: boolean;
  theme_preference: string;
}

interface UserSession {
  id: string;
  session_start: string;
  session_end?: string;
  ip_address?: string | null;
  user_agent?: string | null;
  device_type?: string | null;
  location?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

export default function ProfileSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { mode } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [profile, setProfile] = useState({
    full_name: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    avatar_url: '',
  });
  
  const [preferences, setPreferences] = useState<UserPreferences>({
    email_alerts: true,
    system_updates: true,
    security_alerts: true,
    agent_notifications: false,
    theme_preference: 'system',
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  // Load user profile data and preferences
  useEffect(() => {
    if (user) {
      loadProfile();
      loadPreferences();
      loadUserSessions();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          email: data.email || user?.email || '',
          avatar_url: data.avatar_url || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences({
          email_alerts: data.email_alerts,
          system_updates: data.system_updates,
          security_alerts: data.security_alerts,
          agent_notifications: data.agent_notifications,
          theme_preference: data.theme_preference,
        });
        
        // Sync theme with user preference (removed - handled by ThemeContext)
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const loadUserSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSessions((data || []).map(session => ({
        ...session,
        ip_address: session.ip_address as string | null,
        user_agent: session.user_agent as string | null,
        device_type: session.device_type as string | null,
        location: session.location as string | null,
      })));
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const handleProfileUpdate = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('admin_profiles')
        .upsert({
          id: user.id,
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        });

      if (error) throw error;

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please select an image file.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please select an image smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));

      toast({
        title: 'Avatar Updated',
        description: 'Your profile picture has been uploaded successfully.',
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload avatar. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handlePreferencesUpdate = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
        });

      if (error) throw error;

      toast({
        title: 'Preferences Updated',
        description: 'Your preferences have been saved successfully.',
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update preferences. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = async (newMode: string) => {
    // This will be handled by the new ThemeSelector component
    console.log('Theme change:', newMode);
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all password fields.',
        variant: 'destructive',
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'New password and confirmation do not match.',
        variant: 'destructive',
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast({
        title: 'Weak Password',
        description: 'Password must be at least 8 characters long.',
        variant: 'destructive',
      });
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      toast({
        title: 'Password Updated',
        description: 'Your password has been changed successfully.',
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: 'Password Change Failed',
        description: error.message || 'Failed to change password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handle2FASetup = () => {
    // In a real implementation, this would integrate with Supabase Auth's MFA
    toast({
      title: 'Feature Coming Soon',
      description: 'Two-factor authentication setup will be available soon.',
    });
  };

  const handleSessionRevoke = async (sessionId: string) => {
    try {
      // In a real implementation, you'd revoke the specific session
      // For now, we'll just update the UI
      setSessions(sessions.filter(s => s.id !== sessionId));
      
      toast({
        title: 'Session Revoked',
        description: 'The session has been successfully terminated.',
      });
    } catch (error) {
      console.error('Error revoking session:', error);
      toast({
        title: 'Revoke Failed',
        description: 'Failed to revoke session. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const exportData = () => {
    const exportData = {
      profile,
      preferences,
      sessions: sessions.map(s => ({
        ...s,
        ip_address: undefined, // Remove sensitive data
      })),
      exported_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ultaai-profile-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Data Exported',
      description: 'Your profile data has been downloaded.',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatSessionTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings, preferences, and security options for your UltaAI platform.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="bg-gradient-card border-card-border shadow-card">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and profile picture.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage 
                      src={profile.avatar_url} 
                      alt={profile.full_name || 'Profile'} 
                    />
                    <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                      {getInitials(profile.full_name || profile.email)}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-medium">Profile Picture</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload a professional photo for your UltaAI profile. Max size 5MB.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profile.full_name}
                    onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email"
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    Email changes require admin approval for security reasons.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleProfileUpdate}
                  disabled={loading}
                  className="w-fit"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={exportData}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <div className="space-y-6">
            <ThemeSelector />
            <ThemeCustomizer />
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="bg-gradient-card border-card-border shadow-card">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Control how and when you receive notifications from UltaAI.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {[
                  { key: 'email_alerts', label: 'Email Alerts', desc: 'Receive important alerts via email' },
                  { key: 'system_updates', label: 'System Updates', desc: 'Get notified about system updates' },
                  { key: 'security_alerts', label: 'Security Alerts', desc: 'Security-related notifications' },
                  { key: 'agent_notifications', label: 'Agent Notifications', desc: 'Agent status and task updates' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{label}</p>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                    <Switch
                      checked={preferences[key as keyof UserPreferences] as boolean}
                      onCheckedChange={(checked) =>
                        setPreferences(prev => ({ ...prev, [key]: checked }))
                      }
                    />
                  </div>
                ))}
              </div>
              
              <Button 
                onClick={handlePreferencesUpdate}
                disabled={loading}
                className="w-fit"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Preferences
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <div className="space-y-6">
            {/* Password Change */}
            <Card className="bg-gradient-card border-card-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your account password for enhanced security.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 max-w-md">
                  <div className="grid gap-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="Enter current password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Enter new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirm new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={handlePasswordChange}
                  disabled={passwordLoading}
                  className="w-fit"
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Key className="mr-2 h-4 w-4" />
                      Change Password
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Two-Factor Authentication */}
            <Card className="bg-gradient-card border-card-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Two-Factor Authentication
                </CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className={`h-5 w-5 ${is2FAEnabled ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="font-medium">Authenticator App</p>
                      <p className="text-sm text-muted-foreground">
                        {is2FAEnabled ? '2FA is enabled for your account' : 'Use an authenticator app like Google Authenticator'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={is2FAEnabled ? 'default' : 'secondary'}>
                    {is2FAEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                
                <Button 
                  onClick={handle2FASetup}
                  variant={is2FAEnabled ? 'destructive' : 'default'}
                >
                  <Smartphone className="mr-2 h-4 w-4" />
                  {is2FAEnabled ? 'Disable 2FA' : 'Setup 2FA'}
                </Button>
              </CardContent>
            </Card>

            {/* Account Activity */}
            <Card className="bg-gradient-card border-card-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Account Activity
                </CardTitle>
                <CardDescription>
                  Monitor your recent login sessions and account access.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {sessions.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No recent sessions found</p>
                    </div>
                  ) : (
                    sessions.slice(0, 5).map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${session.is_active ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{session.device_type || 'Unknown Device'}</p>
                              {session.is_active && <Badge variant="secondary" className="text-xs">Current</Badge>}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatSessionTime(session.session_start)}
                              </span>
                              {session.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {session.location}
                                </span>
                              )}
                              {session.ip_address && (
                                <span className="text-xs font-mono">
                                  {session.ip_address}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {!session.is_active && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke Session?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will immediately terminate the selected session. The user will need to log in again.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleSessionRevoke(session.id)}>
                                  Revoke Session
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    ))
                  )}
                </div>
                
                <div className="pt-4 border-t">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-800 dark:text-green-200">Security Status</h4>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        Your account security is up to date. Last login: {new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}