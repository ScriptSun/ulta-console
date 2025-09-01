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
import AvatarEditor from 'react-avatar-editor';
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
  Download,
  Mail,
  ExternalLink,
  X,
  Check,
  ChevronRight
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeSelector } from '@/components/theme/ThemeSelector';
import { ThemeCustomizer } from '@/components/theme/ThemeCustomizer';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useEmailChangeRequests } from '@/hooks/useEmailChangeRequests';
import { useThemeVariants, DARK_THEMES, LIGHT_THEMES } from '@/hooks/useDarkThemeVariant';
import { CompanyLogoSection } from '@/components/settings/CompanyLogoSection';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<AvatarEditor>(null);
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEmailChangeDialog, setShowEmailChangeDialog] = useState(false);
  const [newEmailRequest, setNewEmailRequest] = useState('');
  const [emailChangeReason, setEmailChangeReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [cropImage, setCropImage] = useState<File | null>(null);
  const [cropScale, setCropScale] = useState(1);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  
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
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [setupStep, setSetupStep] = useState<'qr' | 'verify' | 'backup'>('qr');
  const [mfaLoading, setMfaLoading] = useState(false);

  // Email change requests hook
  const {
    requests: emailChangeRequests,
    pendingRequests,
    loading: emailRequestsLoading,
    createEmailChangeRequest,
    approveEmailChangeRequest,
    rejectEmailChangeRequest,
    cancelEmailChangeRequest,
  } = useEmailChangeRequests();

  // Load user profile data and preferences
  useEffect(() => {
    if (user) {
      loadProfile();
      loadPreferences();
      loadUserSessions();
      checkUserRole();
      check2FAStatus();
    }
  }, [user]);

  const checkUserRole = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('console_team_members')
        .select('role')
        .eq('admin_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking user role:', error);
        return;
      }

      if (data) {
        setUserRole(data.role);
        setIsOwnerOrAdmin(['Owner', 'Admin'].includes(data.role));
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

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
      // Handle email change for owners/admins directly
      if (isOwnerOrAdmin && profile.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: profile.email
        });

        if (emailError) {
          throw new Error(`Email update failed: ${emailError.message}`);
        }

        toast({
          title: 'Email Updated',
          description: 'Your email has been updated successfully. Please check your new email for confirmation.',
        });
      }

      // Update profile in admin_profiles table
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
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update profile. Please try again.',
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

    // Open crop dialog instead of direct upload
    setCropImage(file);
    setShowCropDialog(true);
  };

  const handleCropSave = async () => {
    if (!editorRef.current || !cropImage || !user) return;

    setUploading(true);
    try {
      // Get the cropped image as canvas
      const canvas = editorRef.current.getImage();
      
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/jpeg', 0.9);
      });

      const fileExt = 'jpg';
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, blob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      // Add timestamp to force refresh of cached image
      const timestampedUrl = `${publicUrl}?t=${Date.now()}`;

      // Update profile in database immediately
      const { error: updateError } = await supabase
        .from('admin_profiles')
        .upsert({
          id: user.id,
          email: profile.email || user.email,
          full_name: profile.full_name,
          avatar_url: timestampedUrl,
        });

      if (updateError) throw updateError;

      // Update local state
      setProfile(prev => ({ ...prev, avatar_url: timestampedUrl }));
      setShowCropDialog(false);
      setCropImage(null);

      // Trigger a profile reload to refresh TopBar
      await loadProfile();

      toast({
        title: 'Avatar Updated',
        description: 'Your profile picture has been saved automatically.',
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

  const handleAvatarRemove = async () => {
    if (!user) return;

    setUploading(true);
    try {
      // Remove from storage if exists
      if (profile.avatar_url) {
        const fileName = `${user.id}/avatar.jpg`;
        await supabase.storage
          .from('profile-images')
          .remove([fileName]);
      }

      // Update database immediately
      const { error } = await supabase
        .from('admin_profiles')
        .upsert({
          id: user.id,
          email: profile.email || user.email,
          full_name: profile.full_name,
          avatar_url: '',
        });

      if (error) throw error;

      // Update local state
      setProfile(prev => ({ ...prev, avatar_url: '' }));

      // Trigger a profile reload to refresh TopBar
      await loadProfile();

      toast({
        title: 'Avatar Removed',
        description: 'Your profile picture has been removed automatically.',
      });
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast({
        title: 'Remove Failed',
        description: 'Failed to remove avatar. Please try again.',
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

  const check2FAStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      const activeFactor = data?.all?.find(factor => factor.status === 'verified');
      setIs2FAEnabled(!!activeFactor);
    } catch (error) {
      console.error('Error checking 2FA status:', error);
    }
  };

  const handle2FASetup = async () => {
    if (is2FAEnabled) {
      // Disable 2FA
      await disable2FA();
    } else {
      // Enable 2FA
      await setup2FA();
    }
  };

  const setup2FA = async () => {
    setMfaLoading(true);
    try {
      // Enroll a new factor
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App'
      });

      if (error) throw error;

      // Generate QR code
      const QRCode = (await import('qrcode')).default;
      const qrCodeDataUrl = await QRCode.toDataURL(data.totp.uri);
      
      setQrCodeUrl(qrCodeDataUrl);
      setManualKey(data.totp.secret);
      setShow2FASetup(true);
      setSetupStep('qr');
    } catch (error: any) {
      console.error('Error setting up 2FA:', error);
      toast({
        title: '2FA Setup Failed',
        description: error.message || 'Failed to set up 2FA. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setMfaLoading(false);
    }
  };

  const verify2FASetup = async () => {
    if (!verificationCode.trim()) {
      toast({
        title: 'Verification Required',
        description: 'Please enter the 6-digit code from your authenticator app.',
        variant: 'destructive',
      });
      return;
    }

    setMfaLoading(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const factor = factors?.all?.find(f => f.status === 'unverified');
      
      if (!factor) throw new Error('No unverified factor found');

      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code: verificationCode
      });

      if (error) throw error;

      // Generate backup codes
      const codes = Array.from({ length: 8 }, () => 
        Math.random().toString(36).substr(2, 8).toUpperCase()
      );
      setBackupCodes(codes);
      setSetupStep('backup');
      setIs2FAEnabled(true);

      toast({
        title: '2FA Enabled',
        description: 'Two-factor authentication has been successfully enabled.',
      });
    } catch (error: any) {
      console.error('Error verifying 2FA:', error);
      toast({
        title: 'Verification Failed',
        description: error.message || 'Invalid verification code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setMfaLoading(false);
    }
  };

  const disable2FA = async () => {
    setMfaLoading(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const factor = factors?.all?.find(f => f.status === 'verified');
      
      if (!factor) throw new Error('No verified factor found');

      const { error } = await supabase.auth.mfa.unenroll({
        factorId: factor.id
      });

      if (error) throw error;

      setIs2FAEnabled(false);
      toast({
        title: '2FA Disabled',
        description: 'Two-factor authentication has been disabled.',
      });
    } catch (error: any) {
      console.error('Error disabling 2FA:', error);
      toast({
        title: '2FA Disable Failed',
        description: error.message || 'Failed to disable 2FA. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setMfaLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const codesText = backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n');
    const blob = new Blob([
      'UltaAI Two-Factor Authentication Backup Codes\n\n',
      'Keep these codes safe and secure. Each code can only be used once.\n',
      'Use these codes if you lose access to your authenticator app.\n\n',
      codesText,
      '\n\nGenerated on: ' + new Date().toLocaleString()
    ], { type: 'text/plain' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ultaai-backup-codes.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const complete2FASetup = () => {
    setShow2FASetup(false);
    setVerificationCode('');
    setBackupCodes([]);
    setSetupStep('qr');
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

  const handleEmailChangeRequest = async () => {
    if (!user || !newEmailRequest.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    if (newEmailRequest === profile.email) {
      toast({
        title: 'No Change',
        description: 'The new email is the same as your current email.',
        variant: 'destructive',
      });
      return;
    }

    await createEmailChangeRequest(
      user.id,
      profile.email,
      newEmailRequest,
      emailChangeReason
    );

    setShowEmailChangeDialog(false);
    setNewEmailRequest('');
    setEmailChangeReason('');
  };

  const handleApproveRequest = async (requestId: string) => {
    await approveEmailChangeRequest(requestId);
  };

  const handleRejectRequest = async (requestId: string, reason: string) => {
    await rejectEmailChangeRequest(requestId, reason);
    setRejectionReason('');
  };

  const handleCancelRequest = async (requestId: string) => {
    await cancelEmailChangeRequest(requestId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
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
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Change Photo
                    </Button>
                    {profile.avatar_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAvatarRemove}
                        disabled={uploading}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Image Cropping Dialog */}
              <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Crop Your Profile Picture</DialogTitle>
                    <DialogDescription>
                      Adjust the image to fit perfectly in a circle.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col items-center space-y-4">
                    {cropImage && (
                      <>
                        <AvatarEditor
                          ref={editorRef}
                          image={cropImage}
                          width={200}
                          height={200}
                          border={20}
                          borderRadius={100}
                          color={[255, 255, 255, 0.6]}
                          scale={cropScale}
                          rotate={0}
                        />
                        <div className="w-full space-y-2">
                          <Label>Zoom</Label>
                          <input
                            type="range"
                            min="1"
                            max="3"
                            step="0.1"
                            value={cropScale}
                            onChange={(e) => setCropScale(parseFloat(e.target.value))}
                            className="w-full"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCropDialog(false);
                        setCropImage(null);
                        setCropScale(1);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCropSave} disabled={uploading}>
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Photo'
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email">Email Address</Label>
                    {!isOwnerOrAdmin && (
                      <Dialog open={showEmailChangeDialog} onOpenChange={setShowEmailChangeDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Mail className="h-4 w-4 mr-2" />
                            Request Change
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Request Email Change</DialogTitle>
                            <DialogDescription>
                              Email changes require approval from administrators for security purposes.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid gap-2">
                              <Label>Current Email</Label>
                              <Input value={profile.email} disabled />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="new-email">New Email Address</Label>
                              <Input
                                id="new-email"
                                type="email"
                                value={newEmailRequest}
                                onChange={(e) => setNewEmailRequest(e.target.value)}
                                placeholder="Enter new email address"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="reason">Reason for Change (Optional)</Label>
                              <Textarea
                                id="reason"
                                value={emailChangeReason}
                                onChange={(e) => setEmailChangeReason(e.target.value)}
                                placeholder="Provide a reason for this email change..."
                                rows={3}
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                onClick={() => setShowEmailChangeDialog(false)}
                              >
                                Cancel
                              </Button>
                              <Button onClick={handleEmailChangeRequest}>
                                Submit Request
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    {isOwnerOrAdmin && (
                      <Badge variant="default" className="text-xs">
                        {userRole} - Direct Edit Enabled
                      </Badge>
                    )}
                  </div>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={isOwnerOrAdmin ? (e) => setProfile(prev => ({ ...prev, email: e.target.value })) : undefined}
                    disabled={!isOwnerOrAdmin}
                    className={!isOwnerOrAdmin ? "bg-muted" : ""}
                    placeholder="Enter your email address"
                  />
                  <p className="text-xs text-muted-foreground">
                    {isOwnerOrAdmin 
                      ? `As ${userRole?.toLowerCase()}, you can change your email directly. A confirmation will be sent to your new email.`
                      : "Email changes require admin approval for security reasons."
                    }
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

          {/* Pending Email Change Requests for Approval */}
          {pendingRequests.length > 0 && (
            <Card className="bg-gradient-card border-card-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Pending Email Change Requests
                </CardTitle>
                <CardDescription>
                  Review and approve email change requests from team members.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">Email Change Request</p>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p><strong>From:</strong> {request.current_email}</p>
                          <p><strong>To:</strong> {request.new_email}</p>
                          <p><strong>Requested:</strong> {formatDate(request.created_at)}</p>
                          {request.reason && <p><strong>Reason:</strong> {request.reason}</p>}
                        </div>
                      </div>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Pending
                      </Badge>
                    </div>
                    
                    <div className="flex gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="default">
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Approve Email Change?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will approve the email change from {request.current_email} to {request.new_email}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleApproveRequest(request.id)}>
                              Approve Change
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reject Email Change</DialogTitle>
                            <DialogDescription>
                              Provide a reason for rejecting this email change request.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid gap-2">
                              <Label htmlFor="rejection-reason">Rejection Reason</Label>
                              <Textarea
                                id="rejection-reason"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Explain why this request is being rejected..."
                                rows={3}
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" onClick={() => setRejectionReason('')}>
                                Cancel
                              </Button>
                              <Button 
                                variant="destructive"
                                onClick={() => handleRejectRequest(request.id, rejectionReason)}
                                disabled={!rejectionReason.trim()}
                              >
                                Reject Request
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* User's Email Change Requests */}
          {emailChangeRequests.length > 0 && (
            <Card className="bg-gradient-card border-card-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Your Email Change Requests
                </CardTitle>
                <CardDescription>
                  Track the status of your email change requests.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {emailChangeRequests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p><strong>From:</strong> {request.current_email}</p>
                          <p><strong>To:</strong> {request.new_email}</p>
                          <p><strong>Requested:</strong> {formatDate(request.created_at)}</p>
                          {request.reason && <p><strong>Reason:</strong> {request.reason}</p>}
                          {request.status === 'approved' && request.approved_at && (
                            <p><strong>Approved:</strong> {formatDate(request.approved_at)}</p>
                          )}
                          {request.status === 'rejected' && request.rejected_reason && (
                            <p><strong>Rejection Reason:</strong> {request.rejected_reason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={
                            request.status === 'approved' ? 'default' : 
                            request.status === 'rejected' ? 'destructive' : 
                            request.status === 'cancelled' ? 'secondary' : 'secondary'
                          }
                          className="flex items-center gap-1"
                        >
                          {request.status === 'pending' && <Clock className="h-3 w-3" />}
                          {request.status === 'approved' && <Check className="h-3 w-3" />}
                          {request.status === 'rejected' && <X className="h-3 w-3" />}
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </Badge>
                        {request.status === 'pending' && request.requested_by === user?.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelRequest(request.id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
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
              <CardHeader 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
              >
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Change Password
                  </div>
                  <ChevronRight className={`h-5 w-5 transition-transform ${showPasswordSection ? 'rotate-90' : ''}`} />
                </CardTitle>
                <CardDescription>
                  Update your account password for enhanced security.
                </CardDescription>
              </CardHeader>
              {showPasswordSection && (
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
              )}
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
                  disabled={mfaLoading}
                >
                  {mfaLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Smartphone className="mr-2 h-4 w-4" />
                  )}
                  {mfaLoading ? 'Processing...' : is2FAEnabled ? 'Disable 2FA' : 'Setup 2FA'}
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
                    <CheckCircle className="h-5 w-5 text-success mt-0.5" />
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

            {/* 2FA Setup Dialog */}
            <Dialog open={show2FASetup} onOpenChange={setShow2FASetup}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Setup Two-Factor Authentication</DialogTitle>
                  <DialogDescription>
                    {setupStep === 'qr' && 'Scan the QR code with your authenticator app'}
                    {setupStep === 'verify' && 'Enter the verification code from your app'}
                    {setupStep === 'backup' && 'Save your backup codes securely'}
                  </DialogDescription>
                </DialogHeader>

                {setupStep === 'qr' && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-4">
                        Scan this QR code with Google Authenticator, Authy, or any compatible TOTP app:
                      </p>
                      {qrCodeUrl && (
                        <div className="flex justify-center mb-4">
                          <img src={qrCodeUrl} alt="2FA QR Code" className="border rounded-lg" />
                        </div>
                      )}
                      
                      <div className="border rounded-lg p-4 bg-muted">
                        <p className="text-xs text-muted-foreground mb-2">Manual Entry Key:</p>
                        <code className="text-sm font-mono break-all">{manualKey}</code>
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={() => setShow2FASetup(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={() => setSetupStep('verify')}>
                        Continue
                      </Button>
                    </div>
                  </div>
                )}

                {setupStep === 'verify' && (
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="verification-code">Verification Code</Label>
                      <Input
                        id="verification-code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        className="text-center text-lg font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the 6-digit code from your authenticator app
                      </p>
                    </div>
                    
                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={() => setSetupStep('qr')}
                      >
                        Back
                      </Button>
                      <Button 
                        onClick={verify2FASetup}
                        disabled={mfaLoading || verificationCode.length !== 6}
                      >
                        {mfaLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          'Verify & Enable'
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {setupStep === 'backup' && (
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Save Your Backup Codes</h4>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                            Store these codes in a safe place. Each code can only be used once if you lose access to your authenticator app.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-muted font-mono text-sm">
                      {backupCodes.map((code, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded bg-background">
                          <span>{index + 1}.</span>
                          <span className="font-medium">{code}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={downloadBackupCodes}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Codes
                      </Button>
                      <Button onClick={complete2FASetup}>
                        Complete Setup
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}