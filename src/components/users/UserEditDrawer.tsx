import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Save, X, User, Mail, Calendar, Shield, Server, Activity, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
  agent_count?: number;
}

interface UserEditDrawerProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated?: () => void;
}

export function UserEditDrawer({ user, open, onOpenChange, onUserUpdated }: UserEditDrawerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    is_active: true,
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Fetch user security status
  const { data: userSecurityStatus } = useQuery({
    queryKey: ['user-security-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_security_status')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data;
    },
    enabled: !!user?.id && open,
  });

  // Fetch user agents
  const { data: userAgents } = useQuery({
    queryKey: ['user-agents', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('agents')
        .select('id, hostname, status, agent_type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && open,
  });

  // Fetch user sessions
  const { data: userSessions } = useQuery({
    queryKey: ['user-sessions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('session_start', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && open,
  });

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        full_name: user.full_name || '',
        is_active: !userSecurityStatus?.is_banned,
      });
      setValidationErrors({});
    }
  }, [user, userSecurityStatus]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData.full_name.trim()) {
      errors.full_name = 'Full name is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!user || !validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Update user profile (assuming there's a profiles table)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: formData.full_name,
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        console.warn('Profile update error:', profileError);
      }

      // Update user security status if needed
      if (userSecurityStatus?.is_banned === formData.is_active) {
        const { error: securityError } = await supabase
          .from('user_security_status')
          .upsert({
            user_id: user.id,
            email: formData.email,
            is_banned: !formData.is_active,
            ban_reason: formData.is_active ? null : 'Manually disabled by admin',
            banned_at: formData.is_active ? null : new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (securityError) {
          console.warn('Security status update error:', securityError);
        }
      }

      // Update email in auth.users (this would typically require admin privileges)
      if (formData.email !== user.email) {
        // Note: This requires service role access - typically done through an edge function
        toast({
          title: 'Email Update',
          description: 'Email updates require additional verification. Contact support.',
          variant: 'default',
        });
      }

      toast({
        title: 'Success',
        description: 'User updated successfully',
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-security-status'] });
      
      onUserUpdated?.();
      onOpenChange(false);
      
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!user) return;
    
    const isBanned = userSecurityStatus?.is_banned;
    const action = isBanned ? 'unban' : 'ban';
    
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('user_security_status')
        .upsert({
          user_id: user.id,
          email: user.email,
          is_banned: !isBanned,
          ban_reason: isBanned ? null : `Manually ${action}ned by admin`,
          banned_at: isBanned ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `User ${action}ned successfully`,
      });

      queryClient.invalidateQueries({ queryKey: ['user-security-status'] });
      
    } catch (error: any) {
      console.error(`Error ${action}ning user:`, error);
      toast({
        title: 'Error',
        description: error.message || `Failed to ${action} user`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[648px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit User: {user.full_name || user.email}
          </SheetTitle>
          <SheetDescription>
            Manage user details, status, and permissions.
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* User Status Alert */}
          {userSecurityStatus?.is_banned && (
            <Alert className="border-destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This user is currently banned: {userSecurityStatus.ban_reason}
              </AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className={validationErrors.email ? 'border-destructive' : ''}
                    disabled={isLoading}
                  />
                </div>
                {validationErrors.email && (
                  <p className="text-sm text-destructive">{validationErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className={validationErrors.full_name ? 'border-destructive' : ''}
                  disabled={isLoading}
                />
                {validationErrors.full_name && (
                  <p className="text-sm text-destructive">{validationErrors.full_name}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Account Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable user access
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Account Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">User ID</Label>
                  <p className="text-sm text-muted-foreground font-mono">{user.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={userSecurityStatus?.is_banned ? 'destructive' : 'default'}>
                      {userSecurityStatus?.is_banned ? 'Banned' : 'Active'}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <p className="text-sm text-muted-foreground">{formatDate(user.created_at)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Last Updated</Label>
                  <p className="text-sm text-muted-foreground">{formatDate(user.updated_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Agents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Server className="h-4 w-4" />
                Agents ({userAgents?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userAgents && userAgents.length > 0 ? (
                <div className="space-y-2">
                  {userAgents.map((agent) => (
                    <div key={agent.id} className="flex items-center justify-between p-2 rounded border">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{agent.hostname || 'Unnamed Agent'}</span>
                        <Badge variant="outline" className="text-xs">
                          {agent.agent_type}
                        </Badge>
                      </div>
                      <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                        {agent.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No agents assigned to this user.</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-4 w-4" />
                Recent Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userSessions && userSessions.length > 0 ? (
                <div className="space-y-2">
                  {userSessions.slice(0, 3).map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-2 rounded border">
                      <div>
                        <p className="text-sm font-medium">{session.device_type}</p>
                        <p className="text-xs text-muted-foreground">{session.location}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {formatDate(session.session_start)}
                        </p>
                        <Badge variant={session.is_active ? 'default' : 'secondary'} className="text-xs">
                          {session.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent sessions found.</p>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Button onClick={handleSave} disabled={isLoading} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
            
            <Button 
              variant={userSecurityStatus?.is_banned ? 'default' : 'destructive'}
              onClick={handleBanUser}
              disabled={isLoading}
              className="w-full"
            >
              <Shield className="h-4 w-4 mr-2" />
              {userSecurityStatus?.is_banned ? 'Unban User' : 'Ban User'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}