import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isFeatureEnabled } from '@/utils/featureFlags';

interface RateLimitCheck {
  allowed: boolean;
  current_count: number;
  retry_after_seconds: number;
}

export function useTeamRateLimits(teamId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: rateLimits } = useQuery({
    queryKey: ['team-rate-limits', teamId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // If team reading is disabled, return empty rate limits
      if (!isFeatureEnabled('readFromTeams')) {
        return [];
      }

      const { data, error } = await supabase
        .from('team_rate_limits')
        .select('*')
        .eq('team_id', teamId)
        .eq('user_id', user.id);

      if (error) throw error;
      return data;
    },
    enabled: !!teamId && !!user?.id
  });

  const checkRateLimit = useMutation({
    mutationFn: async ({ limitType, maxCount }: { limitType: string; maxCount: number }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // If team reading is disabled, allow all operations (no rate limiting)
      if (!isFeatureEnabled('readFromTeams')) {
        return { allowed: true, current_count: 0, retry_after_seconds: 0 };
      }

      const { data, error } = await supabase.rpc('check_and_increment_rate_limit', {
        _team_id: teamId,
        _user_id: user.id,
        _limit_type: limitType,
        _max_count: maxCount
      });

      if (error) throw error;
      return data[0] as RateLimitCheck;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-rate-limits', teamId, user?.id] });
    }
  });

  const logAuditEvent = useMutation({
    mutationFn: async ({ 
      action, 
      target, 
      details = {} 
    }: { 
      action: string; 
      target: string; 
      details?: any;
    }) => {
      if (!user?.email) throw new Error('User email not available');

      // If team reading is disabled, skip audit logging
      if (!isFeatureEnabled('readFromTeams')) {
        return;
      }

      const { error } = await supabase.rpc('log_team_audit_event', {
        _team_id: teamId,
        _actor_email: user.email,
        _action: action,
        _target: target,
        _details: details
      });

      if (error) throw error;
    }
  });

  return {
    rateLimits,
    checkRateLimit,
    logAuditEvent
  };
}