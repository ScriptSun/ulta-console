import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PagePermissions {
  [pageKey: string]: {
    can_view: boolean;
    can_edit: boolean;
    can_delete: boolean;
  };
}

export function usePagePermissions() {
  const { user } = useAuth();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['page-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return {};

      // Get user's explicit page permissions
      const { data: userPermissions, error: userPermError } = await supabase
        .from('user_page_permissions')
        .select('*')
        .eq('user_id', user.id);

      if (userPermError) throw userPermError;

      // Get user's roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (rolesError) throw rolesError;

      // Get all available pages
      const { data: pages, error: pagesError } = await supabase
        .from('console_pages')
        .select('key, label');

      if (pagesError) throw pagesError;

      // Get all role templates
      const { data: roleTemplates, error: templatesError } = await supabase
        .from('console_role_templates')
        .select('*');

      if (templatesError) throw templatesError;

      // Build permissions map
      const finalPermissions: PagePermissions = {};

      // Initialize with default permissions (all false)
      pages?.forEach(page => {
        finalPermissions[page.key] = {
          can_view: false,
          can_edit: false,
          can_delete: false
        };
      });

      // First, apply explicit user permissions
      userPermissions?.forEach(perm => {
        finalPermissions[perm.page_key] = {
          can_view: perm.can_view,
          can_edit: perm.can_edit,
          can_delete: perm.can_delete
        };
      });

      // Then, fill in missing permissions from role templates
      // Use the highest role (owner > admin > developer > analyst > readonly)
      const roleHierarchy = ['owner', 'admin', 'developer', 'analyst', 'readonly'];
      const userRoleNames = userRoles?.map(r => r.role.toLowerCase()) || [];
      const highestRole = roleHierarchy.find(role => userRoleNames.includes(role));

      if (highestRole) {
        // Find the proper case for the role
        const properRole = highestRole.charAt(0).toUpperCase() + highestRole.slice(1);
        const alternativeRole = properRole === 'Owner' ? 'Owner' : properRole;
        
        roleTemplates?.forEach(template => {
          const templateRole = template.role.toLowerCase();
          if ((templateRole === highestRole || template.role === alternativeRole) && !finalPermissions[template.page_key]) {
            finalPermissions[template.page_key] = {
              can_view: template.can_view,
              can_edit: template.can_edit,
              can_delete: template.can_delete
            };
          }
        });
      }

      return finalPermissions;
    },
    enabled: !!user?.id
  });

  const canView = (pageKey: string): boolean => {
    return permissions?.[pageKey]?.can_view ?? false;
  };

  const canEdit = (pageKey: string): boolean => {
    return permissions?.[pageKey]?.can_edit ?? false;
  };

  const canDelete = (pageKey: string): boolean => {
    return permissions?.[pageKey]?.can_delete ?? false;
  };

  const hasAnyAccess = (pageKey: string): boolean => {
    const perm = permissions?.[pageKey];
    return perm?.can_view || perm?.can_edit || perm?.can_delete || false;
  };

  return {
    permissions,
    isLoading,
    canView,
    canEdit,
    canDelete,
    hasAnyAccess
  };
}