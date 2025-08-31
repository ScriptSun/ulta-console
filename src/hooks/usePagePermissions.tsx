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

      // Get user's team memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('console_team_members')
        .select(`
          id,
          role,
          team_id,
          console_member_page_perms(
            page_key,
            can_view,
            can_edit,
            can_delete
          )
        `)
        .eq('admin_id', user.id);

      if (membershipError) throw membershipError;

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

      // Aggregate permissions across all teams
      const aggregatedPermissions: PagePermissions = {};

      // Initialize with default permissions (all false)
      pages?.forEach(page => {
        aggregatedPermissions[page.key] = {
          can_view: false,
          can_edit: false,
          can_delete: false
        };
      });

      // Apply permissions from each team membership
      memberships?.forEach(membership => {
        const memberPermissions = membership.console_member_page_perms || [];
        
        pages?.forEach(page => {
          // Check for explicit permission first
          const explicitPerm = memberPermissions.find(p => p.page_key === page.key);
          
          if (explicitPerm) {
            // Use explicit permission
            const current = aggregatedPermissions[page.key];
            aggregatedPermissions[page.key] = {
              can_view: current.can_view || explicitPerm.can_view,
              can_edit: current.can_edit || explicitPerm.can_edit,
              can_delete: current.can_delete || explicitPerm.can_delete
            };
          } else {
            // Fall back to role template
            const template = roleTemplates?.find(t => t.role === membership.role && t.page_key === page.key);
            if (template) {
              const current = aggregatedPermissions[page.key];
              aggregatedPermissions[page.key] = {
                can_view: current.can_view || template.can_view,
                can_edit: current.can_edit || template.can_edit,
                can_delete: current.can_delete || template.can_delete
              };
            }
          }
        });
      });

      return aggregatedPermissions;
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