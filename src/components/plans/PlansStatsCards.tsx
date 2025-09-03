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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card className="bg-gradient-primary border-primary/20 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-primary-foreground/90">Free Plan Usage</CardTitle>
          <Settings2 className="h-4 w-4 text-primary-foreground/60" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary-foreground">
            {freePlanUsage.toLocaleString()}
          </div>
          <p className="text-xs text-primary-foreground/70 mt-1">
            AI requests by free users (last 30 days)
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-secondary border-secondary/20 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-secondary-foreground/90">Active Agents</CardTitle>
          <Badge className="bg-success/20 text-success border-success/30 shadow-sm">
            Active
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-secondary-foreground">
            {totalAgents.toLocaleString()}
          </div>
          <p className="text-xs text-secondary-foreground/70 mt-1">
            Total agents using all plans
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-accent border-accent/20 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-accent-foreground/90">Avg AI Limit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-accent-foreground">
            {avgAiLimit.toLocaleString()}
          </div>
          <p className="text-xs text-accent-foreground/70 mt-1">
            Average monthly AI requests across all plans
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-muted border-muted/20 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-foreground/90">Total Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
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