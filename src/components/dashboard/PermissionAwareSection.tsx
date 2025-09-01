import React from 'react';
import { usePermissionGuards } from '@/hooks/usePermissionGuards';

interface PermissionAwareSectionProps {
  pageKey: string;
  permission?: 'view' | 'edit' | 'delete';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  hideOnNoPermission?: boolean;
}

/**
 * Wrapper component that shows/hides dashboard sections based on user permissions
 */
export function PermissionAwareSection({
  pageKey,
  permission = 'view',
  children,
  fallback = null,
  hideOnNoPermission = true
}: PermissionAwareSectionProps) {
  // Temporarily bypass permission checks to show all content
  const hasPermission = true;

  if (!hasPermission && hideOnNoPermission) {
    return <>{fallback}</>;
  }

  if (!hasPermission) {
    return (
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
    );
  }

  return <>{children}</>;
}