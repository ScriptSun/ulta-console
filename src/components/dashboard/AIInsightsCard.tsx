import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot } from 'lucide-react';
import { DateRange } from '@/hooks/useDateRangeFilter';
import { useAIInsights } from '@/hooks/useDashboardData';
import { AgentUsageChart } from './AgentUsageChart';
import { TopActiveAgents } from './TopActiveAgents';
import { AICostMonitor } from './AICostMonitor';

interface AIInsightsCardProps {
  dateRange: DateRange;
}

export function AIInsightsCard({ dateRange }: AIInsightsCardProps) {
  const { data, isLoading, error } = useAIInsights(dateRange);
  
  if (error) {
    return (
      <div className="col-span-full">
        <Card className="bg-gradient-card border-card-border shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              AI & Agent Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-destructive">Failed to load AI insights data</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="col-span-full space-y-6">
      {/* Main Container Header */}
      <Card className="bg-gradient-card border-card-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI & Agent Insights
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Two Components Grid - AI Cost Monitor + Agent Status Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* AI Cost Monitor */}
        <AICostMonitor 
          costData={data?.costData || []}
          dateRange={dateRange}
          isLoading={isLoading}
        />
        
        {/* Agent Status Chart */}
        <AgentUsageChart 
          data={data?.agentsByPeriod || []} 
          dateRange={dateRange}
          groupBy="day"
        />
      </div>

      {/* Top Active Agents - Full width below */}
      <TopActiveAgents 
        agents={data?.topAgents || []}
        isLoading={isLoading}
      />
    </div>
  );
}