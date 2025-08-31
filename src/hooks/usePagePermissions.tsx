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

// Map enum roles to display roles
const ENUM_TO_DISPLAY: Record<string, string> = {
  'owner': 'Owner',
  'admin': 'Admin',
  'editor': 'Developer', 
  'viewer': 'Analyst',
  'guest': 'ReadOnly'
};

export function usePagePermissions() {
  const { user } = useAuth();
  const defaultCustomerId = '00000000-0000-0000-0000-000000000001';

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['page-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return {};

      const finalPermissions: PagePermissions = {};

      // Get all available pages first
      const { data: pages, error: pagesError } = await supabase
        .from('console_pages')
        .select('key, label');

      if (pagesError) throw pagesError;

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
        .eq('user_id', user.id)
        .eq('customer_id', defaultCustomerId);

      if (rolesError) throw rolesError;

      // Get role templates
      const { data: roleTemplates, error: templatesError } = await supabase
        .from('console_role_templates')
        .select('*');

      if (templatesError) throw templatesError;

      // Initialize all pages with default (no access)
      pages?.forEach(page => {
        finalPermissions[page.key] = {
          can_view: false,
          can_edit: false,
          can_delete: false
        };
      });

      // Apply explicit user permissions first (takes priority)
      const explicitPageKeys = new Set<string>();
      userPermissions?.forEach(perm => {
        finalPermissions[perm.page_key] = {
          can_view: perm.can_view,
          can_edit: perm.can_edit,
          can_delete: perm.can_delete
        };
        explicitPageKeys.add(perm.page_key);
      });

      // For pages without explicit permissions, use role templates
      const roleHierarchy = ['owner', 'admin', 'editor', 'viewer', 'guest'];
      const userRoleNames = userRoles?.map(r => r.role.toLowerCase()) || [];
      const highestEnumRole = roleHierarchy.find(role => userRoleNames.includes(role));

      if (highestEnumRole) {
        const displayRole = ENUM_TO_DISPLAY[highestEnumRole];
        
        roleTemplates?.forEach(template => {
          if (template.role === displayRole && !explicitPageKeys.has(template.page_key)) {
            if (finalPermissions[template.page_key]) {
              finalPermissions[template.page_key] = {
                can_view: template.can_view,
                can_edit: template.can_edit,
                can_delete: template.can_delete
              };
            }
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