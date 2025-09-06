import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Save, X, User, Mail, Calendar, Shield, Server, Activity, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
  agent_count?: number;
}

export default function UserEdit() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    is_active: true,
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Fetch user data
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      
      console.log('Fetching user with ID:', userId);
      
      const response = await api.selectOne('admin_profiles', '*', { id: userId });
      
      console.log('User fetch response:', response);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch user');
      }
      
      console.log('User data fetched:', response.data);
      return response.data;
    },
    enabled: !!userId,
  });

  // Fetch user security status
  const { data: userSecurityStatus } = useQuery({
    queryKey: ['user-security-status', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const response = await api.selectOne('user_security_status', '*', { user_id: userId });
      
      // Return null if no security status found (user may not have one)
      if (!response.success) {
        return null;
      }
      
      return response.data;
    },
    enabled: !!userId,
  });

  // Fetch user agents
  const { data: userAgents } = useQuery({
    queryKey: ['user-agents', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const response = await api.select('agents', 'id, hostname, status, agent_type, created_at', { user_id: userId });
      
      if (!response.success) {
        console.warn('Failed to fetch user agents:', response.error);
        return [];
      }
      
      return response.data || [];
    },
    enabled: !!userId,
  });

  // Fetch user sessions
  const { data: userSessions } = useQuery({
    queryKey: ['user-sessions', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const response = await api.select('user_sessions', '*', { user_id: userId });
      
      if (!response.success) {
        console.warn('Failed to fetch user sessions:', response.error);
        return [];
      }
      
      return response.data || [];
    },
    enabled: !!userId,
  });

  // Initialize form data when user changes
  useEffect(() => {
    console.log('User data changed:', user);
    console.log('Security status changed:', userSecurityStatus);
    
    if (user) {
      const newFormData = {
        email: user.email || '',
        full_name: user.full_name || '',
        is_active: !userSecurityStatus?.is_banned,
      };
      
      console.log('Setting form data:', newFormData);
      setFormData(newFormData);
      setValidationErrors({});
    }
  }, [user, userSecurityStatus]);

  const validateForm = () => {
    console.log('Validating form with data:', formData);
    const errors: Record<string, string> = {};
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData.full_name.trim()) {
      errors.full_name = 'Full name is required';
    }
    
    console.log('Validation errors:', errors);
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    console.log('Save button clicked!');
    console.log('Current form data:', formData);
    console.log('User data:', user);
    
    if (!user) {
      console.log('No user data available');
      toast({
        title: 'Error',
        description: 'No user data available',
        variant: 'destructive',
      });
      return;
    }
    
    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }
    
    console.log('Starting save process...');
    setIsLoading(true);
    
    try {
      // Update user profile in admin_profiles table
      console.log('Updating profile with data:', {
        full_name: formData.full_name,
        email: formData.email,
      });
      
      const profileResponse = await api.update('admin_profiles', 
        { id: user.id }, 
        {
          full_name: formData.full_name,
          email: formData.email,
        }
      );

      console.log('Profile update response:', profileResponse);

      if (!profileResponse.success) {
        throw new Error(profileResponse.error || 'Failed to update profile');
      }

      // Update user security status if needed
      const shouldUpdateSecurityStatus = userSecurityStatus?.is_banned !== !formData.is_active;
      console.log('Should update security status:', shouldUpdateSecurityStatus);
      
      if (shouldUpdateSecurityStatus) {
        console.log('Updating security status...');
        const securityResponse = await api.upsert('user_security_status', {
          user_id: user.id,
          email: formData.email,
          is_banned: !formData.is_active,
          ban_reason: formData.is_active ? null : 'Manually disabled by admin',
          banned_at: formData.is_active ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        console.log('Security update response:', securityResponse);

        if (!securityResponse.success) {
          console.warn('Security status update failed:', securityResponse.error);
        }
      }

      console.log('Save successful!');
      
      // Show success message
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });

      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-security-status', userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      // Navigate back to users list after a short delay
      setTimeout(() => {
        navigate('/users');
      }, 1000);
      
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
      const response = await api.upsert('user_security_status', {
        user_id: user.id,
        email: user.email,
        is_banned: !isBanned,
        ban_reason: isBanned ? null : `Manually ${action}ned by admin`,
        banned_at: isBanned ? null : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (!response.success) {
        throw new Error(response.error || `Failed to ${action} user`);
      }

      toast({
        title: 'Success',
        description: `User ${action}ned successfully`,
      });

      // Refresh security status data
      queryClient.invalidateQueries({ queryKey: ['user-security-status', userId] });
      
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

  if (userLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested user could not be found.</p>
          <Button onClick={() => navigate('/users')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/users')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <User className="h-8 w-8" />
            Edit User: {user.full_name || user.email}
          </h1>
          <p className="text-muted-foreground">
            Manage user details, status, and permissions.
          </p>
        </div>
      </div>

      <div className="max-w-4xl space-y-6">
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
            <Button variant="outline" onClick={() => navigate('/users')} disabled={isLoading}>
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
    </div>
  );
}