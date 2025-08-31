import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from './useDateRangeFilter';

// Revenue Overview Hook
export function useRevenueOverview(dateRange: DateRange) {
  return useQuery({
    queryKey: ['revenue-overview', dateRange.start, dateRange.end],
    queryFn: async () => {
      const { data: subscriptions, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans(*)
        `)
        .eq('status', 'active')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      if (error) throw error;

      // Calculate MRR
      const mrr = subscriptions?.reduce((total, sub) => {
        const plan = sub.subscription_plans;
        const monthlyPrice = plan?.price_cents ? plan.price_cents / 100 : 0;
        return total + monthlyPrice;
      }, 0) || 0;

      // Calculate ARPU
      const activeUsers = new Set(subscriptions?.map(s => s.user_id)).size;
      const arpu = activeUsers > 0 ? mrr / activeUsers : 0;

      // Calculate churn (simplified - would need historical data)
      const churnRate = 0.05; // Placeholder

      return {
        mrr,
        arpu,
        churnRate,
        activeSubscriptions: subscriptions?.length || 0,
        activeUsers
      };
    }
  });
}

// Error Rates Hook
export function useErrorRates(dateRange: DateRange) {
  return useQuery({
    queryKey: ['error-rates', dateRange.start, dateRange.end],
    queryFn: async () => {
      // API errors from security events (simplified to avoid type issues)
      let apiErrors = 0;
      let recentErrors: any[] = [];
      
      try {
        const { data: securityData, error: securityError } = await supabase
          .from('security_events')
          .select('*')
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString())
          .limit(10);
          
        if (!securityError && securityData) {
          apiErrors = securityData.length;
          recentErrors = securityData.slice(0, 5);
        }
      } catch (err) {
        console.warn('Security events table not accessible:', err);
      }

      // Task failures from batch runs
      const { data: batchRuns, error: batchError } = await supabase
        .from('batch_runs')
        .select('status')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      if (batchError) throw batchError;

      const failedTasks = batchRuns?.filter(r => r.status === 'failed').length || 0;
      const totalTasks = batchRuns?.length || 1;
      const taskFailureRate = failedTasks / totalTasks;

      return {
        apiErrors,
        taskFailureRate,
        failedDeployments: 0, // Placeholder
        recentErrors
      };
    }
  });
}

// AI and Agent Insights Hook
export function useAIInsights(dateRange: DateRange) {
  return useQuery({
    queryKey: ['ai-insights', dateRange.start, dateRange.end],
    queryFn: async () => {
      // Top agents by usage
      const { data: agentUsage, error: usageError } = await supabase
        .from('agent_usage')
        .select(`
          agent_id,
          count,
          agents(hostname)
        `)
        .gte('usage_date', dateRange.start.toISOString().split('T')[0])
        .lte('usage_date', dateRange.end.toISOString().split('T')[0]);

      if (usageError) throw usageError;

      // Aggregate by agent
      const agentMap = new Map();
      agentUsage?.forEach((usage: any) => {
        const agentId = usage.agent_id;
        if (!agentMap.has(agentId)) {
          agentMap.set(agentId, {
            id: agentId,
            name: usage.agents?.hostname || 'Unknown',
            usage: 0,
            promptTokens: 0,
            completionTokens: 0
          });
        }
        const agent = agentMap.get(agentId);
        agent.usage += usage.count || 0;
        agent.promptTokens += 0; // Will be added when columns exist
        agent.completionTokens += 0; // Will be added when columns exist
      });

      const topAgents = Array.from(agentMap.values())
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 5);

      // Agent errors
      const { data: agentErrors, error: errorError } = await supabase
        .from('agent_logs')
        .select(`
          agent_id,
          agents!inner(hostname),
          timestamp
        `)
        .eq('level', 'error')
        .gte('timestamp', dateRange.start.toISOString())
        .lte('timestamp', dateRange.end.toISOString());

      if (errorError) throw errorError;

      // Calculate total cost (simplified pricing)
      const totalCost = Array.from(agentMap.values()).reduce((total, agent) => {
        return total + (agent.promptTokens * 0.000003) + (agent.completionTokens * 0.000015);
      }, 0);

      return {
        topAgents,
        agentErrors: agentErrors || [],
        totalCost,
        totalTokens: Array.from(agentMap.values()).reduce((total, agent) => 
          total + agent.promptTokens + agent.completionTokens, 0)
      };
    }
  });
}

// Recent Logins Hook
export function useRecentLogins(dateRange: DateRange) {
  return useQuery({
    queryKey: ['recent-logins', dateRange.start, dateRange.end],
    queryFn: async () => {
      // Since auth_login_events table might not exist, return mock data
      // In a real implementation, this would query the actual auth logs
      const mockLogins = [
        {
          id: '1',
          user_id: 'user1',
          occurred_at: new Date().toISOString(),
          ip: '192.168.1.100',
          geo_country: 'US',
          geo_city: 'San Francisco',
          status: 'success',
          profiles: { full_name: 'John Doe' }
        },
        {
          id: '2',
          user_id: 'user2',
          occurred_at: new Date(Date.now() - 3600000).toISOString(),
          ip: '10.0.0.50',
          geo_country: 'CA',
          geo_city: 'Toronto',
          status: 'success',
          profiles: { full_name: 'Jane Smith' }
        }
      ];

      return mockLogins;
    }
  });
}