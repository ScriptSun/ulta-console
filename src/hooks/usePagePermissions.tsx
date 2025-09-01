import { useAuth } from '@/contexts/AuthContext';

interface PagePermissions {
  [pageKey: string]: {
    can_view: boolean;
    can_edit: boolean;
    can_delete: boolean;
  };
}

// Define all possible page keys that need permissions
const ALL_PAGE_KEYS = [
  'dashboard', 'users', 'agents', 'chat', 'scripts', 'tasks',
  'security', 'policies', 'api_keys', 'plans', 'widgets', 
  'deployment', 'integrations', 'teams', 'ai-settings'
];

export function usePagePermissions() {
  const { user } = useAuth();
  
  // Create full permissions object for any authenticated user
  const permissions: PagePermissions = {};
  
  if (user?.id) {
    // Grant full permissions to any authenticated user
    ALL_PAGE_KEYS.forEach(pageKey => {
      permissions[pageKey] = {
        can_view: true,
        can_edit: true,
        can_delete: true
      };
    });
  }

  const canView = (pageKey: string): boolean => {
    return !!user?.id; // Allow if user is authenticated
  };

  const canEdit = (pageKey: string): boolean => {
    return !!user?.id; // Allow if user is authenticated
  };

  const canDelete = (pageKey: string): boolean => {
    return !!user?.id; // Allow if user is authenticated
  };

  const hasAnyAccess = (pageKey: string): boolean => {
    return !!user?.id; // Allow if user is authenticated
  };

  return {
    permissions,
    isLoading: false, // Never loading - immediate response
    canView,
    canEdit,
    canDelete,
    hasAnyAccess
  };
}