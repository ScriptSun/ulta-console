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

  const { data: permissions, isLoading, error } = useQuery({
    queryKey: ['page-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.log('usePagePermissions: No user ID found');
        return {};
      }

      console.log('=== usePagePermissions: Starting permission fetch ===');
      console.log('usePagePermissions: User ID:', user.id);
      console.log('usePagePermissions: User email:', user.email);
      
      const finalPermissions: PagePermissions = {};

      try {
        // Get all available pages first
        console.log('usePagePermissions: Step 1 - Fetching console pages...');
        const { data: pages, error: pagesError } = await supabase
          .from('console_pages')
          .select('key, label');

        if (pagesError) {
          console.error('usePagePermissions: Error fetching pages:', pagesError);
          throw pagesError;
        }
        console.log('usePagePermissions: Found pages:', pages?.length, 'pages');

        // Get user's explicit page permissions
        console.log('usePagePermissions: Step 2 - Fetching user page permissions...');
        const { data: userPermissions, error: userPermError } = await supabase
          .from('user_page_permissions')
          .select('*')
          .eq('user_id', user.id);

        if (userPermError) {
          console.error('usePagePermissions: Error fetching user permissions:', userPermError);
          throw userPermError;
        }
        console.log('usePagePermissions: Found user permissions:', userPermissions?.length || 0, 'explicit permissions');

        // Get user's roles
        console.log('usePagePermissions: Step 3 - Fetching user roles...');
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
        console.log('usePagePermissions: Step 4 - Fetching role templates...');
        const { data: roleTemplates, error: templatesError } = await supabase
          .from('console_role_templates')
          .select('*');

        if (templatesError) {
          console.error('usePagePermissions: Error fetching role templates:', templatesError);
          throw templatesError;
        }
        console.log('usePagePermissions: Found role templates:', roleTemplates?.length || 0, 'templates');

        // Initialize all pages with default (no access)
        console.log('usePagePermissions: Step 5 - Initializing page permissions...');
        pages?.forEach(page => {
          finalPermissions[page.key] = {
            can_view: false,
            can_edit: false,
            can_delete: false
          };
        });

        // Apply explicit user permissions first (takes priority)
        console.log('usePagePermissions: Step 6 - Applying explicit permissions...');
        const explicitPageKeys = new Set<string>();
        userPermissions?.forEach(perm => {
          console.log(`usePagePermissions: Explicit permission for ${perm.page_key}:`, {
            can_view: perm.can_view,
            can_edit: perm.can_edit,
            can_delete: perm.can_delete
          });
          finalPermissions[perm.page_key] = {
            can_view: perm.can_view,
            can_edit: perm.can_edit,
            can_delete: perm.can_delete
          };
          explicitPageKeys.add(perm.page_key);
        });

        // For pages without explicit permissions, use role templates
        console.log('usePagePermissions: Step 7 - Applying role templates...');
        const roleHierarchy = ['owner', 'admin', 'editor', 'viewer', 'guest'];
        const userRoleNames = userRoles?.map(r => r.role.toLowerCase()) || [];
        const highestEnumRole = roleHierarchy.find(role => userRoleNames.includes(role));

        console.log('usePagePermissions: Role hierarchy analysis:', {
          userRoleNames,
          highestEnumRole,
          roleTemplatesCount: roleTemplates?.length || 0
        });

        if (highestEnumRole) {
          const displayRole = ENUM_TO_DISPLAY[highestEnumRole];
          console.log('usePagePermissions: Using display role:', displayRole);
          
          let templatesApplied = 0;
          roleTemplates?.forEach(template => {
            console.log(`usePagePermissions: Checking template - role: ${template.role}, page: ${template.page_key}, displayRole: ${displayRole}`);
            
            if (template.role === displayRole && !explicitPageKeys.has(template.page_key)) {
              // BUG FIX: Always apply the template, don't check if finalPermissions[template.page_key] exists first
              // because we may not have initialized that page key yet
              console.log(`usePagePermissions: Applying template for ${template.page_key}:`, {
                can_view: template.can_view,
                can_edit: template.can_edit,
                can_delete: template.can_delete
              });
              
              finalPermissions[template.page_key] = {
                can_view: template.can_view,
                can_edit: template.can_edit,
                can_delete: template.can_delete
              };
              templatesApplied++;
            }
          });
          console.log('usePagePermissions: Applied', templatesApplied, 'role templates');
        } else {
          console.warn('usePagePermissions: No matching role found in hierarchy!');
        }

        const viewablePages = Object.entries(finalPermissions).filter(([_, perm]) => perm.can_view).length;
        console.log('usePagePermissions: Final result:', viewablePages, 'viewable pages out of', Object.keys(finalPermissions).length);
        console.log('usePagePermissions: Sample permissions:', {
          dashboard: finalPermissions['dashboard'],
          users: finalPermissions['users'],
          agents: finalPermissions['agents']
        });
        console.log('=== usePagePermissions: Permission fetch complete ===');
        
        return finalPermissions;
      } catch (error) {
        console.error('usePagePermissions: Critical error during fetch:', error);
        // Return empty permissions on error
        return {};
      }
    },
    enabled: !!user?.id,
    retry: 1,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Log the query state whenever it changes
  console.log('usePagePermissions: Current query state:', {
    isLoading,
    hasError: !!error,
    errorMessage: error?.message,
    permissionsCount: permissions ? Object.keys(permissions).length : 0,
    userId: user?.id
  });

  const canView = (pageKey: string): boolean => {
    const result = permissions?.[pageKey]?.can_view ?? false;
    console.log(`usePagePermissions: canView(${pageKey}) = ${result}`);
    return result;
  };

  const canEdit = (pageKey: string): boolean => {
    const result = permissions?.[pageKey]?.can_edit ?? false;
    console.log(`usePagePermissions: canEdit(${pageKey}) = ${result}`);
    return result;
  };

  const canDelete = (pageKey: string): boolean => {
    const result = permissions?.[pageKey]?.can_delete ?? false;
    console.log(`usePagePermissions: canDelete(${pageKey}) = ${result}`);
    return result;
  };

  const hasAnyAccess = (pageKey: string): boolean => {
    const perm = permissions?.[pageKey];
    const result = perm?.can_view || perm?.can_edit || perm?.can_delete || false;
    console.log(`usePagePermissions: hasAnyAccess(${pageKey}) = ${result}`);
    return result;
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