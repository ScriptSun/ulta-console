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
      // Get all agents with their status in the date range
      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select(`
          id,
          hostname,
          status,
          last_seen,
          created_at
        `)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      if (agentsError) throw agentsError;

      // Generate all days in the date range for agent status chart
      const agentsByPeriod: Array<{
        period: string;
        active: number;
        suspended: number;
        terminated: number;
        total: number;
      }> = [];

      // Create entries for every day in the date range
      const currentDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      
      while (currentDate <= endDate) {
        const dateStr = currentDate.toLocaleDateString();
        const dayAgents = agents?.filter(agent => {
          const agentDate = new Date(agent.created_at);
          return agentDate.toLocaleDateString() === dateStr;
        }) || [];

        const counts = {
          active: dayAgents.filter(a => a.status === 'active').length,
          suspended: dayAgents.filter(a => a.status === 'suspended').length,
          terminated: dayAgents.filter(a => a.status === 'terminated').length,
          total: dayAgents.length
        };

        agentsByPeriod.push({
          period: dateStr,
          ...counts
        });

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Get usage data with tokens for top active agents and cost calculation
      const { data: agentUsage, error: usageError } = await supabase
        .from('agent_usage')
        .select(`
          agent_id,
          count,
          prompt_tokens,
          completion_tokens,
          model,
          agents(hostname, status, last_seen)
        `)
        .gte('usage_date', dateRange.start.toISOString().split('T')[0])
        .lte('usage_date', dateRange.end.toISOString().split('T')[0]);

      if (usageError) throw usageError;

      // Aggregate usage by agent for top active agents
      const agentMap = new Map();
      agentUsage?.forEach((usage: any) => {
        const agentId = usage.agent_id;
        if (!agentMap.has(agentId)) {
          agentMap.set(agentId, {
            id: agentId,
            name: usage.agents?.hostname || 'Unknown',
            usage: 0,
            status: usage.agents?.status || 'unknown',
            last_seen: usage.agents?.last_seen,
            promptTokens: 0,
            completionTokens: 0
          });
        }
        const agent = agentMap.get(agentId);
        agent.usage += usage.count || 0;
        agent.promptTokens += usage.prompt_tokens || 0;
        agent.completionTokens += usage.completion_tokens || 0;
      });

      const topAgents = Array.from(agentMap.values())
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 10);

      // Aggregate cost data by model
      const modelCostMap = new Map();
      agentUsage?.forEach((usage: any) => {
        const model = usage.model || 'gpt-4o-mini';
        if (!modelCostMap.has(model)) {
          modelCostMap.set(model, {
            model,
            promptTokens: 0,
            completionTokens: 0,
            totalRequests: 0,
            cost: 0
          });
        }
        const modelData = modelCostMap.get(model);
        modelData.promptTokens += usage.prompt_tokens || 0;
        modelData.completionTokens += usage.completion_tokens || 0;
        modelData.totalRequests += usage.count || 0;
      });

      const costData = Array.from(modelCostMap.values());

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

      // Calculate total cost using model pricing
      const MODEL_PRICING = {
        'gpt-4o-mini': { prompt_cost_per_1k: 0.000150, completion_cost_per_1k: 0.000600 },
        'gpt-4o': { prompt_cost_per_1k: 0.005000, completion_cost_per_1k: 0.015000 },
        'gpt-5-mini-2025-08-07': { prompt_cost_per_1k: 0.000200, completion_cost_per_1k: 0.000800 },
        'gpt-5-2025-08-07': { prompt_cost_per_1k: 0.010000, completion_cost_per_1k: 0.030000 }
      } as const;

      const totalCost = costData.reduce((total, model) => {
        const pricing = MODEL_PRICING[model.model as keyof typeof MODEL_PRICING];
        if (!pricing) return total;
        return total + 
               (model.promptTokens / 1000) * pricing.prompt_cost_per_1k +
               (model.completionTokens / 1000) * pricing.completion_cost_per_1k;
      }, 0);

      return {
        topAgents,
        agentsByPeriod,
        costData,
        totalActiveAgents: agents?.filter(a => a.status === 'active').length || 0,
        agentErrors: agentErrors || [],
        totalCost,
        totalTokens: costData.reduce((total, model) => 
          total + model.promptTokens + model.completionTokens, 0)
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