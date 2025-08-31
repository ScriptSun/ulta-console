import { supabase } from '@/integrations/supabase/client';

/**
 * Server-side permission checking utility for user-based permissions
 * Makes a request to check user permissions directly
 */
export async function checkServerPermission(
  pageKey: string, 
  permission: 'view' | 'edit' | 'delete'
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check explicit user permissions first
    const { data: userPermission } = await supabase
      .from('user_page_permissions')
      .select(`can_${permission}`)
      .eq('user_id', user.id)
      .eq('page_key', pageKey)
      .single();

    if (userPermission) {
      return userPermission[`can_${permission}`] || false;
    }

    // Fall back to role templates
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (userRoles && userRoles.length > 0) {
      // Use the highest role
      const roleHierarchy = ['owner', 'admin', 'developer', 'analyst', 'readonly'];
      const userRoleNames = userRoles.map(r => r.role.toLowerCase());
      const highestRole = roleHierarchy.find(role => userRoleNames.includes(role));

      if (highestRole) {
        const properRole = highestRole.charAt(0).toUpperCase() + highestRole.slice(1);
        
        const { data: roleTemplate } = await supabase
          .from('console_role_templates')
          .select(`can_${permission}`)
          .eq('role', properRole)
          .eq('page_key', pageKey)
          .single();

        return roleTemplate?.[`can_${permission}`] || false;
      }
    }

    return false;
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}

/**
 * Higher-order function to wrap API calls with permission checking
 */
export function withPermissionCheck<T extends any[], R>(
  pageKey: string,
  permission: 'edit' | 'delete',
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const hasPermission = await checkServerPermission(pageKey, permission);
    
    if (!hasPermission) {
      throw new Error(`Access denied: You don't have ${permission} permission for ${pageKey}`);
    }
    
    return fn(...args);
  };
}

/**
 * Custom hook for server-side permission checking
 */
export function useServerPermissionCheck() {
  const checkPermission = async (
    pageKey: string, 
    permission: 'view' | 'edit' | 'delete'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const hasPermission = await checkServerPermission(pageKey, permission);
      
      if (!hasPermission) {
        return {
          success: false,
          error: `You don't have ${permission} permission for ${pageKey}`
        };
      }
      
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Permission check failed'
      };
    }
  };
  
  return { checkPermission };
}