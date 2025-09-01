import React from 'react';
import { Badge } from '@/components/ui/badge';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { RevenueOverview } from '@/components/dashboard/RevenueOverview';
import { ErrorRatesCard } from '@/components/dashboard/ErrorRatesCard';
import { AIInsightsCard } from '@/components/dashboard/AIInsightsCard';
import { RecentLoginsCard } from '@/components/dashboard/RecentLoginsCard';
import { TopActiveAgents } from '@/components/dashboard/TopActiveAgents';
import { useDateRangeFilter } from '@/hooks/useDateRangeFilter';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useAIInsights } from '@/hooks/useDashboardData';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const { dateRange, setDateRange, lastUpdated } = useDateRangeFilter();
  const { canView } = usePagePermissions();
  const { data: aiInsightsData, isLoading: aiInsightsLoading } = useAIInsights(dateRange);

  return (
    <div className="space-y-4">
      {/* Page Header with Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Monitor your AI agents and system performance
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <DateRangeFilter 
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs">
            All Systems Operational
          </Badge>
        </div>
      </div>

      {/* Data Last Updated */}
      <div className="text-xs text-muted-foreground">
        Data last updated: {formatDistanceToNow(lastUpdated, { addSuffix: true })}
      </div>

      {/* Revenue Overview */}
      <RevenueOverview dateRange={dateRange} />

      {/* AI and Agent Insights */}
      <AIInsightsCard dateRange={dateRange} />

      {/* Top Active Agents + Error Rates - Same Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopActiveAgents 
          agents={aiInsightsData?.topAgents || []}
          isLoading={aiInsightsLoading}
        />
        <ErrorRatesCard dateRange={dateRange} />
      </div>

      {/* Security - Recent Logins */}
      <RecentLoginsCard dateRange={dateRange} />
    </div>
  );
}