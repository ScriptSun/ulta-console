import { supabase } from '@/integrations/supabase/client';

/**
 * Server-side permission checking utility
 * Makes a request to the check-permissions edge function
 */
export async function checkServerPermission(
  pageKey: string, 
  permission: 'view' | 'edit' | 'delete'
): Promise<boolean> {
  try {
    const response = await supabase.functions.invoke('check-permissions', {
      body: { pageKey, permission }
    });
    
    if (response.error) {
      console.error('Permission check failed:', response.error);
      return false;
    }
    
    return response.data?.hasPermission || false;
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