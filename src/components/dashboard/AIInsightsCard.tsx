import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Cpu, DollarSign, Download, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAIInsights } from '@/hooks/useDashboardData';
import { DateRange } from '@/hooks/useDateRangeFilter';
import { formatDistanceToNow } from 'date-fns';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { AgentUsageChart } from './AgentUsageChart';

interface AIInsightsCardProps {
  dateRange: DateRange;
}

export function AIInsightsCard({ dateRange }: AIInsightsCardProps) {
  const { data, isLoading, error } = useAIInsights(dateRange);
  const { canView } = usePagePermissions();
  
  // Only show cost to Owner and Admin
  const canViewCost = canView('revenue') || canView('admin');

  const exportCSV = () => {
    if (!data || !canViewCost) return;
    
    const csvData = [
      ['Metric', 'Value'],
      ['Total Cost', `$${data.totalCost.toFixed(4)}`],
      ['Total Tokens', data.totalTokens.toString()],
      ['Top Agents', ''],
      ...data.topAgents.map(agent => [agent.name, agent.usage.toString()])
    ];
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-insights-${dateRange.label.toLowerCase().replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <Card className="bg-gradient-card border-card-border shadow-card">
        <CardHeader>
          <CardTitle className="text-destructive">AI & Agent Insights - Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Failed to load AI insights</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-gradient-card border-card-border shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI & Agent Insights
          </CardTitle>
          {canViewCost && (
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!data}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-40" />
              <Skeleton className="h-32" />
              <Skeleton className="h-24" />
            </div>
          ) : data ? (
            <>
              {/* Top Agents Leaderboard */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Top Active Agents
                </h4>
                {data.topAgents.length > 0 ? (
                  <div className="space-y-2">
                    {data.topAgents.map((agent, index) => (
                      <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-foreground">{agent.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {agent.usage} requests
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {agent.usage > 100 ? 'High' : agent.usage > 50 ? 'Medium' : 'Low'} Activity
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No agent activity in this range</p>
                )}
              </div>

              {/* Agent Errors */}
              <div className="pt-4 border-t border-border">
                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Agent Errors
                </h4>
                {data.agentErrors.length > 0 ? (
                  <div className="space-y-2">
                    {data.agentErrors.slice(0, 3).map((error, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-destructive/10">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <div>
                            <div className="text-sm font-medium text-foreground">
                              {error.agents?.hostname || 'Unknown Agent'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(error.timestamp))} ago
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No agent errors in this range</p>
                )}
              </div>

              {/* AI Cost Monitor - Only for Owner/Admin */}
              {canViewCost && (
                <div className="pt-4 border-t border-border">
                  <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-success" />
                    AI Cost Monitor
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground">Total Tokens</span>
                      </div>
                      <div className="text-2xl font-bold text-foreground">
                        {data.totalTokens.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">tokens processed</div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-success" />
                        <span className="text-sm font-medium text-muted-foreground">Total Cost</span>
                      </div>
                      <div className="text-2xl font-bold text-foreground">
                        ${data.totalCost.toFixed(4)}
                      </div>
                      <div className="text-xs text-muted-foreground">estimated cost</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No AI insights available for this range</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent Usage Chart */}
      <AgentUsageChart 
        data={data?.topAgents || []} 
        totalActiveAgents={data?.totalActiveAgents || 0}
        dateRange={dateRange}
      />
    </div>
  );
}