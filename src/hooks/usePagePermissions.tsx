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
      if (!user?.id) {
        console.log('usePagePermissions: No user ID found');
        return {};
      }

      console.log('usePagePermissions: Fetching permissions for user:', user.id);
      
      // ADMIN OVERRIDE: If this is the specific admin user, give full access
      if (user.email === 'elin@ultahost.com') {
        console.log('usePagePermissions: Admin user detected, granting full access');
        const adminPermissions: PagePermissions = {
          'dashboard': { can_view: true, can_edit: true, can_delete: true },
          'users': { can_view: true, can_edit: true, can_delete: true },
          'agents': { can_view: true, can_edit: true, can_delete: true },
          'chat': { can_view: true, can_edit: true, can_delete: true },
          'scripts': { can_view: true, can_edit: true, can_delete: true },
          'tasks': { can_view: true, can_edit: true, can_delete: true },
          'security': { can_view: true, can_edit: true, can_delete: true },
          'policies': { can_view: true, can_edit: true, can_delete: true },
          'api_keys': { can_view: true, can_edit: true, can_delete: true },
          'plans': { can_view: true, can_edit: true, can_delete: true },
          'widgets': { can_view: true, can_edit: true, can_delete: true },
          'deployment': { can_view: true, can_edit: true, can_delete: true },
          'integrations': { can_view: true, can_edit: true, can_delete: true },
          'teams': { can_view: true, can_edit: true, can_delete: true },
          'ai-settings': { can_view: true, can_edit: true, can_delete: true },
          'qa': { can_view: true, can_edit: true, can_delete: true },
          'dashboard-revenue': { can_view: true, can_edit: true, can_delete: true },
          'dashboard-ai-costs': { can_view: true, can_edit: true, can_delete: true },
          'dashboard-top-agents': { can_view: true, can_edit: true, can_delete: true },
          'dashboard-error-rates': { can_view: true, can_edit: true, can_delete: true },
          'dashboard-recent-logins': { can_view: true, can_edit: true, can_delete: true }
        };
        return adminPermissions;
      }

      const finalPermissions: PagePermissions = {};

      try {
        // Get all available pages first
        const { data: pages, error: pagesError } = await supabase
          .from('console_pages')
          .select('key, label');

        if (pagesError) {
          console.error('usePagePermissions: Error fetching pages:', pagesError);
          throw pagesError;
        }

        // Get user's explicit page permissions
        const { data: userPermissions, error: userPermError } = await supabase
          .from('user_page_permissions')
          .select('*')
          .eq('user_id', user.id);

        if (userPermError) {
          console.error('usePagePermissions: Error fetching user permissions:', userPermError);
          throw userPermError;
        }

        // Get user's roles
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('customer_id', defaultCustomerId);

        if (rolesError) {
          console.error('usePagePermissions: Error fetching user roles:', rolesError);
          throw rolesError;
        }
        
        console.log('usePagePermissions: User roles found:', userRoles);

        // Get role templates
        const { data: roleTemplates, error: templatesError } = await supabase
          .from('console_role_templates')
          .select('*');

        if (templatesError) {
          console.error('usePagePermissions: Error fetching role templates:', templatesError);
          throw templatesError;
        }

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

        console.log('usePagePermissions: Role hierarchy check:', {
          userRoleNames,
          highestEnumRole,
          roleTemplatesCount: roleTemplates?.length || 0
        });

        if (highestEnumRole) {
          const displayRole = ENUM_TO_DISPLAY[highestEnumRole];
          console.log('usePagePermissions: Using display role:', displayRole);
          
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

        console.log('usePagePermissions: Final permissions:', finalPermissions);
        return finalPermissions;
      } catch (error) {
        console.error('usePagePermissions: Database query failed:', error);
        // Fallback: If anything fails, give basic permissions to prevent blank screen
        return {
          'dashboard': { can_view: true, can_edit: false, can_delete: false },
          'users': { can_view: true, can_edit: false, can_delete: false },
          'agents': { can_view: true, can_edit: false, can_delete: false }
        };
      }
    },
    enabled: !!user?.id,
    retry: 1,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const canView = (pageKey: string): boolean => {
    // Admin user gets full access always
    if (user?.email === 'elin@ultahost.com') {
      return true;
    }
    return permissions?.[pageKey]?.can_view ?? false;
  };

  const canEdit = (pageKey: string): boolean => {
    // Admin user gets full access always
    if (user?.email === 'elin@ultahost.com') {
      return true;
    }
    return permissions?.[pageKey]?.can_edit ?? false;
  };

  const canDelete = (pageKey: string): boolean => {
    // Admin user gets full access always
    if (user?.email === 'elin@ultahost.com') {
      return true;
    }
    return permissions?.[pageKey]?.can_delete ?? false;
  };

  const hasAnyAccess = (pageKey: string): boolean => {
    // Admin user gets full access always
    if (user?.email === 'elin@ultahost.com') {
      return true;
    }
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