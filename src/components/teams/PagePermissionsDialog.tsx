import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Shield, Eye, Edit, Trash2, RotateCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface PagePermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: any;
  currentUserRole: string;
}

interface PagePermission {
  id?: string;
  page_key: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export function PagePermissionsDialog({ open, onOpenChange, member, currentUserRole }: PagePermissionsDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [permissions, setPermissions] = useState<Record<string, PagePermission>>({});

  const canEdit = ['Owner', 'Admin'].includes(currentUserRole);

  // Fetch all pages and role templates
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

  // Fetch role templates for the member's role
  const { data: roleTemplates } = useQuery({
    queryKey: ['console-role-templates', member?.role],
    queryFn: async () => {
      if (!member?.role) return [];
      
      const { data, error } = await supabase
        .from('console_role_templates')
        .select('*')
        .eq('role', member.role);
      
      if (error) throw error;
      return data;
    },
    enabled: !!member?.role
  });

  // Fetch current permissions for the member
  const { data: currentPermissions, isLoading } = useQuery({
    queryKey: ['console-member-page-perms', member?.id],
    queryFn: async () => {
      if (!member?.id) return [];
      
      const { data, error } = await supabase
        .from('console_member_page_perms')
        .select('*')
        .eq('member_id', member.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!member?.id && open
  });

  // Initialize permissions state when data loads
  useEffect(() => {
    if (pages && roleTemplates) {
      const permissionsMap: Record<string, PagePermission> = {};
      
      pages.forEach(page => {
        const existingPerm = currentPermissions?.find(p => p.page_key === page.key);
        const template = roleTemplates.find(t => t.page_key === page.key);
        
        permissionsMap[page.key] = {
          id: existingPerm?.id,
          page_key: page.key,
          can_view: existingPerm?.can_view ?? template?.can_view ?? false,
          can_edit: existingPerm?.can_edit ?? template?.can_edit ?? false,
          can_delete: existingPerm?.can_delete ?? template?.can_delete ?? false,
        };
      });
      
      setPermissions(permissionsMap);
    }
  }, [pages, currentPermissions, roleTemplates]);

  // Save permissions mutation
  const savePermissionsMutation = useMutation({
    mutationFn: async () => {
      if (!member?.id) throw new Error('No member selected');

      const permissionsList = Object.values(permissions);
      const upserts = permissionsList.map(perm => ({
        member_id: member.id,
        page_key: perm.page_key,
        can_view: perm.can_view,
        can_edit: perm.can_edit,
        can_delete: perm.can_delete,
      }));

      const { error } = await supabase
        .from('console_member_page_perms')
        .upsert(upserts, {
          onConflict: 'member_id,page_key'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Permissions updated",
        description: "Page permissions have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['console-member-page-perms'] });
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
      if (!member?.id) throw new Error('No member selected');

      // Delete all existing permissions for this member
      const { error: deleteError } = await supabase
        .from('console_member_page_perms')
        .delete()
        .eq('member_id', member.id);

      if (deleteError) throw deleteError;

      // Apply role template permissions
      const { error: applyError } = await supabase.rpc('apply_role_template_permissions', {
        _member_id: member.id,
        _role: member.role
      });

      if (applyError) throw applyError;
    },
    onSuccess: () => {
      toast({
        title: "Reset to defaults",
        description: "Permissions have been reset to role defaults.",
      });
      queryClient.invalidateQueries({ queryKey: ['console-member-page-perms'] });
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

  const updatePermission = (pageKey: string, field: keyof Omit<PagePermission, 'id' | 'page_key'>, value: boolean) => {
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

  const getRoleTemplate = (pageKey: string) => {
    return roleTemplates?.find(t => t.page_key === pageKey);
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
            Page Permissions
          </DialogTitle>
          <DialogDescription>
            Configure page access permissions for{' '}
            <span className="font-medium">{member?.admin_profiles?.full_name || member?.admin_profiles?.email}</span>
            {!canEdit && ' (View Only)'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Role: {member?.role}
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
            const template = getRoleTemplate(page.key);
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
                  {template && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Role default: View {template.can_view ? '✓' : '✗'}, 
                      Edit {template.can_edit ? '✓' : '✗'}, 
                      Delete {template.can_delete ? '✓' : '✗'}
                    </p>
                  )}
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