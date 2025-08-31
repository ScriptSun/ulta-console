import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { isFeatureEnabled } from '@/utils/featureFlags';

export interface AuditLogEntry {
  id: string;
  created_at: string;
  actor: string;
  action: string;
  target: string;
  meta: any;
}

interface AuditFilters {
  actor?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
}

export function useTeamAuditLogs(teamId: string, filters?: AuditFilters) {
  const { data: auditLogs, isLoading, refetch } = useQuery({
    queryKey: ['team-audit-logs', teamId, filters],
    queryFn: async () => {
      // If team reading is disabled, return empty audit logs
      if (!isFeatureEnabled('readFromTeams')) {
        return [];
      }

      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('customer_id', teamId)
        .order('created_at', { ascending: false });

      if (filters?.actor) {
        query = query.ilike('actor', `%${filters.actor}%`);
      }

      if (filters?.action) {
        query = query.ilike('action', `%${filters.action}%`);
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as AuditLogEntry[];
    },
    enabled: !!teamId
  });

  // Set up real-time subscription
  useEffect(() => {
    if (!teamId || !isFeatureEnabled('readFromTeams')) return;

    const channel = supabase
      .channel('team-audit-logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
          filter: `customer_id=eq.${teamId}`
        },
        () => {
          // Refetch on new audit log entries
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, refetch]);

  return {
    auditLogs: auditLogs || [],
    isLoading,
    refetch
  };
}