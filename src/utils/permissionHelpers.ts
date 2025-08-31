import { usePagePermissions } from '@/hooks/usePagePermissions';

/**
 * Permission wrapper functions that use the simplified permission system
 */

export function withView<T extends any[], R>(
  pageKey: string,
  fn: (...args: T) => R
) {
  return (...args: T): R | null => {
    const { canView } = usePagePermissions();
    
    if (!canView(pageKey)) {
      return null;
    }
    
    return fn(...args);
  };
}

export function withEdit<T extends any[], R>(
  pageKey: string,
  fn: (...args: T) => R
) {
  return (...args: T): R | null => {
    const { canEdit } = usePagePermissions();
    
    if (!canEdit(pageKey)) {
      return null;
    }
    
    return fn(...args);
  };
}

export function withDelete<T extends any[], R>(
  pageKey: string,
  fn: (...args: T) => R
) {
  return (...args: T): R | null => {
    const { canDelete } = usePagePermissions();
    
    if (!canDelete(pageKey)) {
      return null;
    }
    
    return fn(...args);
  };
}

/**
 * Async versions for server operations
 */
export function withAsyncView<T extends any[], R>(
  pageKey: string,
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | null> => {
    const { canView } = usePagePermissions();
    
    if (!canView(pageKey)) {
      return null;
    }
    
    return fn(...args);
  };
}

export function withAsyncEdit<T extends any[], R>(
  pageKey: string,
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | null> => {
    const { canEdit } = usePagePermissions();
    
    if (!canEdit(pageKey)) {
      return null;
    }
    
    return fn(...args);
  };
}

export function withAsyncDelete<T extends any[], R>(
  pageKey: string,
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | null> => {
    const { canDelete } = usePagePermissions();
    
    if (!canDelete(pageKey)) {
      return null;
    }
    
    return fn(...args);
  };
}