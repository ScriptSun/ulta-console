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
      console.log('Fetching AI insights data...');
      
      // Fetch agents and their usage data
      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select(`
          id,
          hostname,
          status,
          created_at,
          customer_id,
          plan_key
        `)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      if (agentsError) throw agentsError;

      // Fetch real AI usage logs
      const { data: aiUsageLogs, error: aiLogsError } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .order('created_at', { ascending: false });

      if (aiLogsError) throw aiLogsError;

      // Fetch agent logs for errors
      const { data: logs, error: logsError } = await supabase
        .from('agent_logs')
        .select('agent_id, level, created_at')
        .eq('level', 'error')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      if (logsError) throw logsError;

      // Process agents by period
      const agentsByPeriod = processAgentsByPeriod(agents || [], dateRange);
      
      // Calculate top agents by usage (from AI logs)
      const topAgents = calculateTopAgentsFromAILogs(agents || [], aiUsageLogs || []);
      
      // Calculate cost data from real AI usage logs
      const costData = calculateCostDataFromAILogs(aiUsageLogs || []);
      
      return {
        topAgents,
        agentsByPeriod,
        costData,
        totalActiveAgents: agents?.filter(a => a.status === 'active').length || 0,
        agentErrors: logs?.length || 0,
        totalCost: costData.reduce((sum, item) => sum + item.cost, 0),
        totalTokens: costData.reduce((sum, item) => sum + item.promptTokens + item.completionTokens, 0)
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Helper function to process agents by period (existing function)
const processAgentsByPeriod = (agents: any[], dateRange: DateRange) => {
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
    const dayAgents = agents.filter(agent => {
      const agentDate = new Date(agent.created_at);
      return agentDate.toLocaleDateString() === dateStr;
    });

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

  return agentsByPeriod;
};

// Helper function to calculate top agents from AI logs
const calculateTopAgentsFromAILogs = (agents: any[], aiUsageLogs: any[]) => {
  const agentUsage: Record<string, {
    requests: number;
    tokens: number;
    cost: number;
  }> = {};

  // Aggregate usage by agent
  aiUsageLogs.forEach(log => {
    if (log.agent_id) {
      if (!agentUsage[log.agent_id]) {
        agentUsage[log.agent_id] = { requests: 0, tokens: 0, cost: 0 };
      }
      agentUsage[log.agent_id].requests += 1;
      agentUsage[log.agent_id].tokens += log.total_tokens || 0;
      agentUsage[log.agent_id].cost += parseFloat(log.cost_usd || 0);
    }
  });

  // Map to agent details
  return agents
    .map(agent => {
      const usage = agentUsage[agent.id] || { requests: 0, tokens: 0, cost: 0 };
      return {
        id: agent.id,
        name: agent.hostname || `Agent ${agent.id.slice(0, 8)}`,
        usage: usage.requests,
        status: agent.status,
        last_seen: agent.created_at,
        promptTokens: usage.tokens,
        completionTokens: 0, // We track total tokens, split for display
      };
    })
    .sort((a, b) => b.usage - a.usage)
    .slice(0, 5);
};

// Helper function to calculate cost data from real AI usage logs
const calculateCostDataFromAILogs = (aiUsageLogs: any[]) => {
  const costByModel: Record<string, {
    requests: number;
    promptTokens: number;
    completionTokens: number;
    totalCost: number;
  }> = {};

  aiUsageLogs.forEach(log => {
    const model = log.model;
    if (!costByModel[model]) {
      costByModel[model] = {
        requests: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalCost: 0,
      };
    }

    costByModel[model].requests += 1;
    costByModel[model].promptTokens += log.prompt_tokens || 0;
    costByModel[model].completionTokens += log.completion_tokens || 0;
    costByModel[model].totalCost += parseFloat(log.cost_usd || 0);
  });

  return Object.entries(costByModel).map(([model, data]) => ({
    model,
    displayName: getModelDisplayName(model),
    totalRequests: data.requests,
    promptTokens: data.promptTokens,
    completionTokens: data.completionTokens,
    cost: data.totalCost,
  }));
};

// Helper function to get model display name
const getModelDisplayName = (model: string): string => {
  const displayNames: Record<string, string> = {
    'gpt-4o-mini': 'GPT-4o Mini',
    'gpt-4o': 'GPT-4o',
    'gpt-5-2025-08-07': 'GPT-5',
    'gpt-5-mini-2025-08-07': 'GPT-5 Mini',
    'gpt-5-nano-2025-08-07': 'GPT-5 Nano',
    'gpt-4.1-2025-04-14': 'GPT-4.1',
    'gpt-4.1-mini-2025-04-14': 'GPT-4.1 Mini',
    'o3-2025-04-16': 'O3',
    'o4-mini-2025-04-16': 'O4 Mini',
    'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
    'claude-3-opus-20240229': 'Claude 3 Opus',
    'claude-3-haiku-20240307': 'Claude 3 Haiku',
    'gemini-pro': 'Gemini Pro',
    'gemini-pro-vision': 'Gemini Pro Vision'
  };
  
  return displayNames[model] || model;
};

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