import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings2 } from 'lucide-react';
import { SubscriptionPlan, PlanUsageStats } from '@/hooks/useSubscriptionPlans';

interface PlansStatsCardsProps {
  plans: SubscriptionPlan[];
  planUsageStats: PlanUsageStats[];
  totalAgents: number;
  totalUsage: number;
  avgAiLimit: number;
}

export function PlansStatsCards({ 
  plans, 
  planUsageStats, 
  totalAgents, 
  totalUsage, 
  avgAiLimit 
}: PlansStatsCardsProps) {
  // Calculate free plan usage
  const freePlanStats = planUsageStats.find(stat => stat.plan_key === 'free_plan');
  const freePlanUsage = freePlanStats?.total_usage || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Free Plan Usage</CardTitle>
          <Settings2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {freePlanUsage.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            AI requests by free users (last 30 days)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
          <Badge className="bg-success/10 text-success border-success/20">
            Active
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {totalAgents.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Total agents using all plans
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg AI Limit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {avgAiLimit.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Average monthly AI requests across all plans
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {totalUsage.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            AI requests (last 30 days)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}