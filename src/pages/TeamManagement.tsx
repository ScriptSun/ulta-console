import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Shield, Eye, Plus, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserPermissionsDialog } from '@/components/users/UserPermissionsDialog';
import { PageGuard } from '@/components/auth/PageGuard';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

// Map display roles to actual enum values in user_roles table
const ROLE_MAPPING = {
  'Owner': 'owner',
  'Admin': 'admin', 
  'Developer': 'editor',
  'Analyst': 'viewer',
  'ReadOnly': 'guest'
} as const;

const DISPLAY_ROLES = Object.keys(ROLE_MAPPING) as Array<keyof typeof ROLE_MAPPING>;

const ROLE_COLORS = {
  'Owner': 'bg-gradient-to-r from-purple-600/10 to-violet-600/10 text-purple-100 border border-purple-500/30',
  'Admin': 'bg-gradient-to-r from-red-600/10 to-pink-600/10 text-red-100 border border-red-500/30',
  'Developer': 'bg-gradient-to-r from-green-600/10 to-emerald-600/10 text-green-100 border border-green-500/30',
  'Analyst': 'bg-gradient-to-r from-blue-600/10 to-cyan-600/10 text-blue-100 border border-blue-500/30',
  'ReadOnly': 'bg-gradient-to-r from-amber-600/10 to-yellow-600/10 text-amber-100 border border-amber-500/30',
};

// Reverse mapping for display
const ENUM_TO_DISPLAY: Record<string, string> = {
  'owner': 'Owner',
  'admin': 'Admin',
  'editor': 'Developer', 
  'viewer': 'Analyst',
  'guest': 'ReadOnly'
};

export default function TeamManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canEdit } = usePagePermissions();
  
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    email: string;
    role: string;
  } | null>(null);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<string>('ReadOnly');
  const [searchTerm, setSearchTerm] = useState('');

  const canManageUsers = canEdit('teams');

  // Get default customer ID (use a fixed one for simplicity)
  const defaultCustomerId = '00000000-0000-0000-0000-000000000001';

  // Fetch all users with their roles
  const { data: users, isLoading } = useQuery({
    queryKey: ['all-users', defaultCustomerId],
    queryFn: async () => {
      // Get all admin profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('admin_profiles')
        .select('id, email, full_name')
        .order('email');

      if (profilesError) throw profilesError;

      // Get user roles for each profile
      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: userRoles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id)
            .eq('customer_id', defaultCustomerId);

          // Map enum role to display role
          const enumRole = userRoles?.[0]?.role || 'guest';
          const displayRole = ENUM_TO_DISPLAY[enumRole] || 'ReadOnly';

          return {
            ...profile,
            role: displayRole,
            enumRole: enumRole,
            allRoles: userRoles || []
          };
        })
      );

      return usersWithRoles.filter(user => {
        const matchesSearch = !searchTerm || 
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
          
        return matchesSearch;
      });
    },
    enabled: !!defaultCustomerId
  });

  // Get page access counts for each user
  const { data: pageAccessCounts } = useQuery({
    queryKey: ['user-page-access-counts'],
    queryFn: async () => {
      const { data: totalPages } = await supabase
        .from('console_pages')
        .select('key');

      const totalPagesCount = totalPages?.length || 0;

      if (!users) return {};

      const accessCounts: Record<string, { accessible: number; total: number }> = {};

      await Promise.all(
        users.map(async (user) => {
          // Get explicit permissions
          const { data: userPermissions } = await supabase
            .from('user_page_permissions')
            .select('page_key, can_view')
            .eq('user_id', user.id);

          // Get role templates for fallback
          const { data: roleTemplates } = await supabase
            .from('console_role_templates')
            .select('page_key, can_view')
            .eq('role', user.role); // Use display role

          // Count accessible pages
          const explicitPermissions = new Set(userPermissions?.map(p => p.page_key) || []);
          const accessibleExplicit = userPermissions?.filter(p => p.can_view).length || 0;
          const accessibleFromRole = roleTemplates?.filter(t => 
            !explicitPermissions.has(t.page_key) && t.can_view
          ).length || 0;

          accessCounts[user.id] = {
            accessible: accessibleExplicit + accessibleFromRole,
            total: totalPagesCount
          };
        })
      );

      return accessCounts;
    },
    enabled: !!users
  });

  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      // First check if user exists in auth.users by trying to find their profile
      const { data: existingProfile } = await supabase
        .from('admin_profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      
      if (!existingProfile) {
        throw new Error('User not found. User must sign up first or be added to the system.');
      }

      // Set user role
      const enumRole = ROLE_MAPPING[role as keyof typeof ROLE_MAPPING];
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({ 
          user_id: existingProfile.id, 
          customer_id: defaultCustomerId,
          role: enumRole
        });

      if (roleError) throw roleError;

      return existingProfile.id;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'User added successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-page-access-counts'] });
      setShowAddUserDialog(false);
      setNewUserEmail('');
      setNewUserRole('ReadOnly');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add user',
        variant: 'destructive',
      });
    },
  });

  // Remove user mutation
  const removeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Remove user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('customer_id', defaultCustomerId);

      if (roleError) throw roleError;

      // Remove user permissions
      const { error: permError } = await supabase
        .from('user_page_permissions')
        .delete()
        .eq('user_id', userId);

      if (permError) throw permError;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'User removed successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-page-access-counts'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove user',
        variant: 'destructive',
      });
    },
  });
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, newDisplayRole }: { userId: string; newDisplayRole: string }) => {
      const newEnumRole = ROLE_MAPPING[newDisplayRole as keyof typeof ROLE_MAPPING];
      if (!newEnumRole) throw new Error('Invalid role');

      // Delete existing roles for this user and customer
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('customer_id', defaultCustomerId);

      if (deleteError) throw deleteError;

      // Insert new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ 
          user_id: userId, 
          customer_id: defaultCustomerId,
          role: newEnumRole
        });

      if (insertError) throw insertError;

      // Get role templates for the new display role
      const { data: roleTemplates } = await supabase
        .from('console_role_templates')
        .select('*')
        .eq('role', newDisplayRole);

      // Get existing explicit permissions
      const { data: existingPermissions } = await supabase
        .from('user_page_permissions')
        .select('page_key')
        .eq('user_id', userId);

      const existingPageKeys = new Set(existingPermissions?.map(p => p.page_key) || []);

      // Insert permissions from role templates for pages that don't have explicit permissions
      const newPermissions = roleTemplates?.filter(template => 
        !existingPageKeys.has(template.page_key)
      ).map(template => ({
        user_id: userId,
        page_key: template.page_key,
        can_view: template.can_view,
        can_edit: template.can_edit,
        can_delete: template.can_delete
      })) || [];

      if (newPermissions.length > 0) {
        const { error: permError } = await supabase
          .from('user_page_permissions')
          .upsert(newPermissions);

        if (permError) throw permError;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'User role updated and permissions applied successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-page-access-counts'] });
      queryClient.invalidateQueries({ queryKey: ['page-permissions'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user role',
        variant: 'destructive',
      });
    },
  });

  const handleRoleChange = (userId: string, newDisplayRole: string) => {
    updateUserRoleMutation.mutate({ userId, newDisplayRole });
  };

  const handleAddUser = () => {
    if (!newUserEmail.trim()) return;
    addUserMutation.mutate({ email: newUserEmail.trim(), role: newUserRole });
  };

  const handleRemoveUser = (userId: string, userEmail: string) => {
    if (window.confirm(`Are you sure you want to remove ${userEmail}?`)) {
      removeUserMutation.mutate(userId);
    }
  };

  const handleViewPermissions = (user: any) => {
    setSelectedUser({
      id: user.id,
      email: user.email,
      role: user.role
    });
    setShowPermissionsDialog(true);
  };

  if (isLoading) {
    return (
      <PageGuard pageKey="teams">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </PageGuard>
    );
  }

  return (
    <PageGuard pageKey="teams">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Users className="h-8 w-8" />
                Users & Access
              </h1>
              <p className="text-muted-foreground">
                Manage user access and permissions across the platform
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="text-sm text-muted-foreground">
                {users?.length || 0} users
              </span>
            </div>
          </div>

          <Card>
            <CardContent className="space-y-4">
              {/* Search Controls */}
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                {canManageUsers && (
                  <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add User</DialogTitle>
                        <DialogDescription>
                          Add a user by email address. User must have an account already.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="user@example.com"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="role">Role</Label>
                          <Select value={newUserRole} onValueChange={setNewUserRole}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DISPLAY_ROLES.map((role) => (
                                <SelectItem key={role} value={role}>
                                  <Badge className={ROLE_COLORS[role]} variant="outline">
                                    {role}
                                  </Badge>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddUserDialog(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleAddUser}
                          disabled={!newUserEmail.trim() || addUserMutation.isPending}
                        >
                          {addUserMutation.isPending ? 'Adding...' : 'Add User'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Page Access</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((tableUser) => (
                    <TableRow key={tableUser.id}>
                      <TableCell className="font-medium">
                        {tableUser.full_name || tableUser.email}
                      </TableCell>
                      <TableCell>{tableUser.email}</TableCell>
                      <TableCell>
                        <Select
                          value={tableUser.role}
                          onValueChange={(newRole) => handleRoleChange(tableUser.id, newRole)}
                          disabled={!canManageUsers || updateUserRoleMutation.isPending}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue>
                              <Badge 
                                className={ROLE_COLORS[tableUser.role as keyof typeof ROLE_COLORS]}
                                variant="outline"
                              >
                                {tableUser.role}
                              </Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-background border border-border shadow-lg z-50">
                            {DISPLAY_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                <Badge 
                                  className={ROLE_COLORS[role]}
                                  variant="outline"
                                >
                                  {role}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <button
                          className="flex items-center gap-2 hover:bg-accent/50 p-2 rounded-md transition-colors cursor-pointer w-full text-left"
                          onClick={() => handleViewPermissions(tableUser)}
                        >
                          <span className="text-sm text-muted-foreground">
                            {pageAccessCounts?.[tableUser.id]?.accessible || 0} / {pageAccessCounts?.[tableUser.id]?.total || 0}
                          </span>
                          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all"
                              style={{ 
                                width: `${pageAccessCounts?.[tableUser.id] ? 
                                  (pageAccessCounts[tableUser.id].accessible / pageAccessCounts[tableUser.id].total) * 100 
                                  : 0}%` 
                              }}
                            />
                          </div>
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewPermissions(tableUser)}
                            className="gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            Edit Permissions
                          </Button>
                          {canManageUsers && user?.id !== tableUser.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveUser(tableUser.id, tableUser.email)}
                              disabled={removeUserMutation.isPending}
                              className="gap-1 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                              Remove
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {(!users || users.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No users match your search criteria.' : 'No users found. Add users to get started.'}
                </div>
              )}
            </CardContent>
          </Card>

          {selectedUser && (
            <UserPermissionsDialog
              open={showPermissionsDialog}
              onOpenChange={setShowPermissionsDialog}
              userId={selectedUser.id}
              userEmail={selectedUser.email}
              currentUserRole={user ? users?.find(u => u.id === user.id)?.role : undefined}
            />
          )}
        </div>
    </PageGuard>
  );
}