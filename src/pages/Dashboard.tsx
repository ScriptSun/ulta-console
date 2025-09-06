import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/layouts/PageHeader';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { RevenueOverview } from '@/components/dashboard/RevenueOverview';
import { ErrorRatesCard } from '@/components/dashboard/ErrorRatesCard';
import { AIInsightsCard } from '@/components/dashboard/AIInsightsCard';
import { RecentLoginsCard } from '@/components/dashboard/RecentLoginsCard';
import { TopActiveAgents } from '@/components/dashboard/TopActiveAgents';
import { PermissionAwareSection } from '@/components/dashboard/PermissionAwareSection';
import { SystemDocumentation } from '@/components/dashboard/SystemDocumentation';
import { useDateRangeFilter } from '@/hooks/useDateRangeFilter';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useAIInsights } from '@/hooks/useDashboardData';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const { dateRange, setDateRange, lastUpdated } = useDateRangeFilter();
  const { canView } = usePagePermissions();
  const { data: aiInsightsData, isLoading: aiInsightsLoading } = useAIInsights(dateRange);

  const pageActions = (
    <>
      <DateRangeFilter 
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />
      <SystemDocumentation>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Documentation
        </Button>
      </SystemDocumentation>
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Monitor your AI agents and system performance"
        actions={pageActions}
      />

      {/* Data Last Updated */}
      <div className="text-xs text-muted-foreground">
        Data last updated: {formatDistanceToNow(lastUpdated, { addSuffix: true })}
      </div>

      {/* Revenue Overview */}
      <PermissionAwareSection pageKey="dashboard-revenue">
        <RevenueOverview dateRange={dateRange} />
      </PermissionAwareSection>

      {/* AI and Agent Insights */}
      <PermissionAwareSection pageKey="dashboard-ai-costs">
        <AIInsightsCard dateRange={dateRange} />
      </PermissionAwareSection>

      {/* Top Active Agents + Error Rates - Same Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PermissionAwareSection pageKey="dashboard-top-agents">
          <TopActiveAgents 
            agents={aiInsightsData?.topAgents || []}
            isLoading={aiInsightsLoading}
          />
        </PermissionAwareSection>
        
        <PermissionAwareSection pageKey="dashboard-error-rates">
          <ErrorRatesCard dateRange={dateRange} />
        </PermissionAwareSection>
      </div>

      {/* Security - Recent Logins */}
      <PermissionAwareSection pageKey="dashboard-recent-logins">
        <RecentLoginsCard dateRange={dateRange} />
      </PermissionAwareSection>
    </div>
  );
}