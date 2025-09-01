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
  const defaultCustomerId = '00000000-0000-0000-0000-000000000001';

  const { data: permissions, isLoading, error } = useQuery({
    queryKey: ['page-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.log('usePagePermissions: No user ID found');
        return {};
      }

      console.log('=== FIXED PERMISSION SYSTEM ===');
      console.log('User ID:', user.id);
      console.log('User email:', user.email);
      
      try {
        // Step 1: Get user roles
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('customer_id', defaultCustomerId);

        if (rolesError) {
          console.error('Error fetching user roles:', rolesError);
          return {};
        }

        console.log('User roles:', userRoles);

        if (!userRoles || userRoles.length === 0) {
          console.log('No roles found for user');
          return {};
        }

        // Step 2: Get the highest role (admin is highest)
        const roles = userRoles.map(r => r.role.toLowerCase());
        console.log('Role names:', roles);

        let displayRole = 'ReadOnly'; // default
        if (roles.includes('admin')) displayRole = 'Admin';
        else if (roles.includes('owner')) displayRole = 'Owner';
        else if (roles.includes('editor')) displayRole = 'Developer';
        else if (roles.includes('viewer')) displayRole = 'Analyst';

        console.log('Display role determined:', displayRole);

        // Step 3: Get role templates for this display role
        const { data: roleTemplates, error: templatesError } = await supabase
          .from('console_role_templates')
          .select('*')
          .eq('role', displayRole);

        if (templatesError) {
          console.error('Error fetching role templates:', templatesError);
          return {};
        }

        console.log('Role templates found:', roleTemplates?.length);

        // Step 4: Build permissions object
        const finalPermissions: PagePermissions = {};
        
        roleTemplates?.forEach(template => {
          console.log(`Setting permissions for ${template.page_key}:`, {
            can_view: template.can_view,
            can_edit: template.can_edit,
            can_delete: template.can_delete
          });
          
          finalPermissions[template.page_key] = {
            can_view: template.can_view,
            can_edit: template.can_edit,
            can_delete: template.can_delete
          };
        });

        const viewablePages = Object.entries(finalPermissions).filter(([_, perm]) => perm.can_view).length;
        console.log('FINAL RESULT:', viewablePages, 'viewable pages');
        console.log('Final permissions object:', finalPermissions);
        
        return finalPermissions;
      } catch (error) {
        console.error('Critical error in permission system:', error);
        return {};
      }
    },
    enabled: !!user?.id,
    retry: 2,
    staleTime: 5 * 60 * 1000
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