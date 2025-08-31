import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePagePermissions } from '@/hooks/usePagePermissions';

interface PermissionGuardProps {
  children: React.ReactNode;
  pageKey: string;
  fallback?: React.ReactNode;
}

export function withView(pageKey: string, fallback?: React.ReactNode) {
  return function ViewPermissionGuard({ children }: { children: React.ReactNode }) {
    const { canView } = usePagePermissions();
    
    if (!canView(pageKey)) {
      return fallback || <Navigate to="/dashboard" replace />;
    }
    
    return <>{children}</>;
  };
}

export function withEdit(pageKey: string, element: React.ReactNode): React.ReactNode {
  const { canEdit } = usePagePermissions();
  
  if (!canEdit(pageKey)) {
    return null;
  }
  
  return element;
}

export function withDelete(pageKey: string, element: React.ReactNode): React.ReactNode {
  const { canDelete } = usePagePermissions();
  
  if (!canDelete(pageKey)) {
    return null;
  }
  
  return element;
}

export function PermissionGuard({ children, pageKey, fallback }: PermissionGuardProps) {
  const { canView } = usePagePermissions();
  
  if (!canView(pageKey)) {
    return fallback || <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

export function usePermissions(pageKey: string) {
  const { canView, canEdit, canDelete } = usePagePermissions();
  
  return {
    canView: canView(pageKey),
    canEdit: canEdit(pageKey),
    canDelete: canDelete(pageKey)
  };
}