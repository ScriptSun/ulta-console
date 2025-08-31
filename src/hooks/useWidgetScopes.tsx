import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useWidgetScopes() {
  const { user } = useAuth();

  const { data: scopedWidgetIds, isLoading } = useQuery({
    queryKey: ['widget-scopes', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get user's team memberships and roles
      const { data: memberships, error: membershipError } = await supabase
        .from('console_team_members')
        .select('id, role, console_member_widget_scopes(widget_id)')
        .eq('admin_id', user.id);

      if (membershipError) throw membershipError;

      // If user is Owner in any team, they see all widgets
      const isOwner = memberships?.some(m => m.role === 'Owner');
      if (isOwner) {
        return 'all'; // Special value indicating access to all widgets
      }

      // Collect all scoped widget IDs across all team memberships
      const allScopedWidgets = new Set<string>();
      let hasAnyScopes = false;

      memberships?.forEach(membership => {
        if (membership.console_member_widget_scopes?.length > 0) {
          hasAnyScopes = true;
          membership.console_member_widget_scopes.forEach(scope => {
            allScopedWidgets.add(scope.widget_id);
          });
        }
      });

      // If no scopes are defined for any membership, inherit team defaults (all widgets)
      if (!hasAnyScopes) {
        return 'all';
      }

      // Return the set of allowed widget IDs
      return Array.from(allScopedWidgets);
    },
    enabled: !!user?.id
  });

  const canViewWidget = (widgetId: string): boolean => {
    if (isLoading) return false;
    if (scopedWidgetIds === 'all') return true;
    if (Array.isArray(scopedWidgetIds)) {
      return scopedWidgetIds.includes(widgetId);
    }
    return false;
  };

  const hasWidgetAccess = (): boolean => {
    return scopedWidgetIds !== null && scopedWidgetIds !== undefined;
  };

  const getAllowedWidgetIds = (): string[] | 'all' => {
    return scopedWidgetIds || [];
  };

  return {
    scopedWidgetIds,
    isLoading,
    canViewWidget,
    hasWidgetAccess,
    getAllowedWidgetIds
  };
}