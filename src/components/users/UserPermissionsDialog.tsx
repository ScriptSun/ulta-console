import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Shield, Eye, Edit, Trash2, RotateCcw } from 'lucide-react';

interface UserPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  currentUserRole?: string;
}

interface PagePermission {
  page_key: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

// Map enum roles to display roles
const ENUM_TO_DISPLAY: Record<string, string> = {
  'owner': 'Owner',
  'admin': 'Admin',
  'editor': 'Developer', 
  'viewer': 'Analyst',
  'guest': 'ReadOnly'
};

export function UserPermissionsDialog({ 
  open, 
  onOpenChange, 
  userId, 
  userEmail, 
  currentUserRole 
}: UserPermissionsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [permissions, setPermissions] = useState<Record<string, PagePermission>>({});

  const canEdit = ['Owner', 'Admin'].includes(currentUserRole || '');
  const defaultCustomerId = '00000000-0000-0000-0000-000000000001';

  // Fetch all pages
  const { data: pages } = useQuery({
    queryKey: ['console-pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('console_pages')
        .select('*')
        .order('label');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch user's roles
  const { data: userRoles } = useQuery({
    queryKey: ['user-roles', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('customer_id', defaultCustomerId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId
  });

  // Fetch role templates for fallback
  const { data: roleTemplates } = useQuery({
    queryKey: ['console-role-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('console_role_templates')
        .select('*');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch current permissions for the user
  const { data: currentPermissions, isLoading } = useQuery({
    queryKey: ['user-page-permissions', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('user_page_permissions')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId && open
  });

  // Initialize permissions state when data loads
  useEffect(() => {
    if (pages && roleTemplates && userRoles) {
      const permissionsMap: Record<string, PagePermission> = {};
      
      // Get user's highest role
      const roleHierarchy = ['owner', 'admin', 'editor', 'viewer', 'guest'];
      const userRoleNames = userRoles?.map(r => r.role.toLowerCase()) || [];
      const highestEnumRole = roleHierarchy.find(role => userRoleNames.includes(role));
      
      pages.forEach(page => {
        const existingPerm = currentPermissions?.find(p => p.page_key === page.key);
        
        if (existingPerm) {
          // Use explicit permission
          permissionsMap[page.key] = {
            page_key: page.key,
            can_view: existingPerm.can_view,
            can_edit: existingPerm.can_edit,
            can_delete: existingPerm.can_delete,
          };
        } else if (highestEnumRole) {
          // Fall back to role template
          const displayRole = ENUM_TO_DISPLAY[highestEnumRole];
          const template = roleTemplates?.find(t => 
            t.role === displayRole && t.page_key === page.key
          );
          
          permissionsMap[page.key] = {
            page_key: page.key,
            can_view: template?.can_view ?? false,
            can_edit: template?.can_edit ?? false,
            can_delete: template?.can_delete ?? false,
          };
        } else {
          // Default to no permissions
          permissionsMap[page.key] = {
            page_key: page.key,
            can_view: false,
            can_edit: false,
            can_delete: false,
          };
        }
      });
      
      setPermissions(permissionsMap);
    }
  }, [pages, currentPermissions, roleTemplates, userRoles]);

  // Save permissions mutation
  const savePermissionsMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('No user selected');

      const permissionsList = Object.values(permissions);
      const upserts = permissionsList.map(perm => ({
        user_id: userId,
        page_key: perm.page_key,
        can_view: perm.can_view,
        can_edit: perm.can_edit,
        can_delete: perm.can_delete,
      }));

      const { error } = await supabase
        .from('user_page_permissions')
        .upsert(upserts, {
          onConflict: 'user_id,page_key'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Permissions updated",
        description: "User permissions have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['user-page-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['page-permissions'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update permissions",
        description: error.message || "There was an error updating permissions.",
        variant: "destructive",
      });
    }
  });

  // Reset to role defaults mutation
  const resetToDefaultsMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('No user selected');

      // Delete all existing permissions for this user
      const { error: deleteError } = await supabase
        .from('user_page_permissions')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      toast({
        title: "Reset to defaults",
        description: "Permissions have been reset to role defaults.",
      });
      queryClient.invalidateQueries({ queryKey: ['user-page-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['page-permissions'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to reset permissions",
        description: error.message || "There was an error resetting permissions.",
        variant: "destructive",
      });
    }
  });

  const updatePermission = (pageKey: string, field: keyof Omit<PagePermission, 'page_key'>, value: boolean) => {
    if (!canEdit) return;
    
    setPermissions(prev => ({
      ...prev,
      [pageKey]: {
        ...prev[pageKey],
        [field]: value,
        // If unchecking view, also uncheck edit and delete
        ...(field === 'can_view' && !value && {
          can_edit: false,
          can_delete: false
        }),
        // If checking edit or delete, also check view
        ...((field === 'can_edit' || field === 'can_delete') && value && {
          can_view: true
        })
      }
    }));
  };

  const handleSave = () => {
    savePermissionsMutation.mutate();
  };

  const handleReset = () => {
    resetToDefaultsMutation.mutate();
  };

  const getUserRole = () => {
    if (!userRoles || userRoles.length === 0) return 'No Role';
    const roleHierarchy = ['owner', 'admin', 'editor', 'viewer', 'guest'];
    const userRoleNames = userRoles.map(r => r.role.toLowerCase());
    const highestEnumRole = roleHierarchy.find(role => userRoleNames.includes(role));
    return highestEnumRole ? ENUM_TO_DISPLAY[highestEnumRole] : 'ReadOnly';
  };

  const hasOverride = (pageKey: string) => {
    return currentPermissions?.some(p => p.page_key === pageKey);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            User Permissions
          </DialogTitle>
          <DialogDescription>
            Configure page access permissions for{' '}
            <span className="font-medium">{userEmail}</span>
            {!canEdit && ' (View Only)'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Role: {getUserRole()}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Showing permissions with role defaults
              </span>
            </div>
            {canEdit && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleReset}
                disabled={resetToDefaultsMutation.isPending}
                className="gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Reset to role defaults
              </Button>
            )}
          </div>

          {pages?.map((page) => {
            const perm = permissions[page.key];
            const isOverridden = hasOverride(page.key);
            
            if (!perm) return null;

            return (
              <div key={page.key} className="flex items-center justify-between p-4 border border-border rounded-lg bg-card/30">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{page.label}</h4>
                    {isOverridden && (
                      <Badge variant="secondary" className="text-xs">
                        Override
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Key: {page.key}</p>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`${page.key}-view`}
                      checked={perm.can_view}
                      disabled={!canEdit}
                      onCheckedChange={(checked) => 
                        updatePermission(page.key, 'can_view', checked === true)
                      }
                    />
                    <label htmlFor={`${page.key}-view`} className="flex items-center gap-1 text-sm font-medium cursor-pointer">
                      <Eye className="h-3 w-3" />
                      View
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`${page.key}-edit`}
                      checked={perm.can_edit}
                      disabled={!canEdit || !perm.can_view}
                      onCheckedChange={(checked) => 
                        updatePermission(page.key, 'can_edit', checked === true)
                      }
                    />
                    <label htmlFor={`${page.key}-edit`} className="flex items-center gap-1 text-sm font-medium cursor-pointer">
                      <Edit className="h-3 w-3" />
                      Edit
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`${page.key}-delete`}
                      checked={perm.can_delete}
                      disabled={!canEdit || !perm.can_view}
                      onCheckedChange={(checked) => 
                        updatePermission(page.key, 'can_delete', checked === true)
                      }
                    />
                    <label htmlFor={`${page.key}-delete`} className="flex items-center gap-1 text-sm font-medium cursor-pointer">
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {canEdit ? 'Cancel' : 'Close'}
          </Button>
          {canEdit && (
            <>
              <Button 
                variant="outline"
                onClick={handleReset}
                disabled={resetToDefaultsMutation.isPending || savePermissionsMutation.isPending}
                className="gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                {resetToDefaultsMutation.isPending ? "Resetting..." : "Reset to defaults"}
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={savePermissionsMutation.isPending || resetToDefaultsMutation.isPending}
              >
                {savePermissionsMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}