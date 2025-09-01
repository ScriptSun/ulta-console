import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SubscriptionPlan {
  id: string;
  name: string;
  key: string;
  slug: string;
  description: string;
  price_monthly: number;
  monthly_ai_requests: number;
  monthly_server_events: number;
  stripe_price_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanUsageStats {
  plan_key: string;
  agent_count: number;
  total_usage: number;
}

export function useSubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [planUsageStats, setPlanUsageStats] = useState<PlanUsageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subscription plans',
        variant: 'destructive',
      });
    }
  };

  const fetchPlanUsageStats = async () => {
    try {
      // Get agent counts by plan
      const { data: agentStats, error: agentError } = await supabase
        .from('agents')
        .select('plan_key')
        .eq('status', 'active');

      if (agentError) throw agentError;

      // Count agents by plan
      const agentCounts: Record<string, number> = {};
      agentStats?.forEach(agent => {
        if (agent.plan_key) {
          agentCounts[agent.plan_key] = (agentCounts[agent.plan_key] || 0) + 1;
        }
      });

      // Get usage data from agent_usage table
      const { data: usageData, error: usageError } = await supabase
        .from('agent_usage')
        .select(`
          agent_id,
          usage_type,
          count,
          agents!inner(plan_key)
        `)
        .eq('usage_type', 'ai_request')
        .gte('usage_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // Last 30 days

      if (usageError) throw usageError;

      // Calculate total usage by plan
      const usageTotals: Record<string, number> = {};
      usageData?.forEach(usage => {
        const planKey = (usage.agents as any)?.plan_key;
        if (planKey) {
          usageTotals[planKey] = (usageTotals[planKey] || 0) + usage.count;
        }
      });

      // Combine stats
      const stats: PlanUsageStats[] = Object.keys(agentCounts).map(planKey => ({
        plan_key: planKey,
        agent_count: agentCounts[planKey] || 0,
        total_usage: usageTotals[planKey] || 0,
      }));

      setPlanUsageStats(stats);
    } catch (error) {
      console.error('Error fetching plan usage stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load plan usage statistics',
        variant: 'destructive',
      });
    }
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchPlans(), fetchPlanUsageStats()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const togglePlanStatus = async (planId: string) => {
    try {
      const plan = plans.find(p => p.id === planId);
      if (!plan) throw new Error('Plan not found');

      const { error } = await supabase
        .from('subscription_plans')
        .update({ active: !plan.active })
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: 'Plan Updated',
        description: `Plan "${plan.name}" has been ${plan.active ? 'deactivated' : 'activated'}`,
      });

      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error toggling plan status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update plan status',
        variant: 'destructive',
      });
    }
  };

  const deletePlan = async (planId: string) => {
    try {
      const plan = plans.find(p => p.id === planId);
      if (!plan) throw new Error('Plan not found');

      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: 'Plan Deleted',
        description: `Plan "${plan.name}" has been deleted`,
      });

      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete plan',
        variant: 'destructive',
      });
    }
  };

  const createPlan = async (planData: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .insert(planData);

      if (error) throw error;

      toast({
        title: 'Plan Created',
        description: `Plan "${planData.name}" has been created`,
      });

      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error creating plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to create plan',
        variant: 'destructive',
      });
    }
  };

  const updatePlan = async (planId: string, planData: Partial<SubscriptionPlan>) => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update(planData)
        .eq('id', planId);

      if (error) throw error;

      const plan = plans.find(p => p.id === planId);
      toast({
        title: 'Plan Updated',
        description: `Plan "${plan?.name}" has been updated`,
      });

      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error updating plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to update plan',
        variant: 'destructive',
      });
    }
  };

  // Calculate summary statistics
  const totalAgents = planUsageStats.reduce((sum, stat) => sum + stat.agent_count, 0);
  const totalUsage = planUsageStats.reduce((sum, stat) => sum + stat.total_usage, 0);
  const avgAiLimit = plans.length > 0 
    ? Math.round(plans.reduce((sum, p) => sum + p.monthly_ai_requests, 0) / plans.length)
    : 0;

  return {
    plans,
    planUsageStats,
    loading,
    totalAgents,
    totalUsage,
    avgAiLimit,
    togglePlanStatus,
    deletePlan,
    createPlan,
    updatePlan,
    refetch: fetchData,
  };
}