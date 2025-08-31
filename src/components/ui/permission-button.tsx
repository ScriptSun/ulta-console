import React from 'react';
import { Button, ButtonProps } from './button';
import { usePermissionGuards } from '@/hooks/usePermissionGuards';

interface PermissionButtonProps extends ButtonProps {
  pageKey: string;
  permission: 'edit' | 'delete';
  fallback?: React.ReactNode;
  hideOnNoPermission?: boolean;
}

/**
 * Button component that respects permission guards
 * Automatically disables or hides based on user permissions
 */
export function PermissionButton({
  pageKey,
  permission,
  children,
  fallback = null,
  hideOnNoPermission = false,
  disabled,
  ...props
}: PermissionButtonProps) {
  const { withEdit, withDelete } = usePermissionGuards();
  
  const hasPermission = permission === 'edit' ? withEdit(pageKey) : withDelete(pageKey);
  
  // Hide button if no permission and hideOnNoPermission is true
  if (!hasPermission && hideOnNoPermission) {
    return <>{fallback}</>;
  }
  
  // Disable button if no permission
  const isDisabled = disabled || !hasPermission;
  
  return (
    <Button
      {...props}
      disabled={isDisabled}
    >
      {children}
    </Button>
  );
}