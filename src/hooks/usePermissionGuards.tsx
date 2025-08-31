import React from 'react';
import { usePagePermissions } from './usePagePermissions';

/**
 * Permission guard hooks for controlling access to pages and actions
 */
export function usePermissionGuards() {
  const { canView, canEdit, canDelete } = usePagePermissions();

  /**
   * Check if user can view a specific page
   */
  const withView = (pageKey: string): boolean => {
    return canView(pageKey);
  };

  /**
   * Check if user can edit resources on a specific page
   */
  const withEdit = (pageKey: string): boolean => {
    return canEdit(pageKey);
  };

  /**
   * Check if user can delete resources on a specific page
   */
  const withDelete = (pageKey: string): boolean => {
    return canDelete(pageKey);
  };

  /**
   * Higher-order component for protecting routes based on view permissions
   */
  const withViewGuard = (pageKey: string, component: React.ComponentType) => {
    return function GuardedComponent(props: any) {
      if (!withView(pageKey)) {
        return (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                You don't have permission to view this page.
              </p>
            </div>
          </div>
        );
      }
      return React.createElement(component, props);
    };
  };

  /**
   * Component for conditionally rendering content based on permissions
   */
  const PermissionGate = ({ 
    pageKey, 
    permission, 
    children, 
    fallback = null 
  }: {
    pageKey: string;
    permission: 'view' | 'edit' | 'delete';
    children: React.ReactNode;
    fallback?: React.ReactNode;
  }) => {
    let hasPermission = false;
    
    switch (permission) {
      case 'view':
        hasPermission = withView(pageKey);
        break;
      case 'edit':
        hasPermission = withEdit(pageKey);
        break;
      case 'delete':
        hasPermission = withDelete(pageKey);
        break;
    }

    return hasPermission ? <>{children}</> : <>{fallback}</>;
  };

  return {
    withView,
    withEdit,
    withDelete,
    withViewGuard,
    PermissionGate
  };
}