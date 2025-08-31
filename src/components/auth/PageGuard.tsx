import React from 'react';
import { usePermissionGuards } from '@/hooks/usePermissionGuards';
import { Shield } from 'lucide-react';

interface PageGuardProps {
  pageKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that protects page content based on view permissions
 * Renders access denied message if user doesn't have view permission
 */
export function PageGuard({ pageKey, children, fallback }: PageGuardProps) {
  const { withView } = usePermissionGuards();
  
  if (!withView(pageKey)) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-[500px]">
          <div className="text-center max-w-md mx-auto">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <Shield className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You don't have permission to view this page. Contact your administrator if you believe this is an error.
            </p>
            <div className="text-sm text-muted-foreground">
              Page: <code className="bg-muted px-2 py-1 rounded">{pageKey}</code>
            </div>
          </div>
        </div>
      )
    );
  }
  
  return <>{children}</>;
}