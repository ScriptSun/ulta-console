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
  const { PermissionGate } = usePermissionGuards();

  return (
    <PermissionGate
      pageKey={pageKey}
      permission={permission}
      fallback={hideOnNoPermission ? fallback : (
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
      )}
    >
      {children}
    </PermissionGate>
  );
}