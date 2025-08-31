import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Activity, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useErrorRates } from '@/hooks/useDashboardData';
import { DateRange } from '@/hooks/useDateRangeFilter';
import { formatDistanceToNow } from 'date-fns';

interface ErrorRatesCardProps {
  dateRange: DateRange;
}

export function ErrorRatesCard({ dateRange }: ErrorRatesCardProps) {
  const { data, isLoading, error } = useErrorRates(dateRange);

  if (error) {
    return (
      <Card className="bg-gradient-card border-card-border shadow-card">
        <CardHeader>
          <CardTitle className="text-destructive">Error Rates - Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Failed to load error data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-card-border shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Error Rates & Task Failures
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
            <Skeleton className="h-40" />
          </div>
        ) : data ? (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-muted-foreground">API Errors</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{data.apiErrors}</div>
                <div className="text-xs text-muted-foreground">in selected range</div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span className="text-sm font-medium text-muted-foreground">Task Failure Rate</span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {(data.taskFailureRate * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">of total tasks</div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-muted-foreground">Failed Deployments</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{data.failedDeployments}</div>
                <div className="text-xs text-muted-foreground">deployment failures</div>
              </div>
            </div>

            {/* Task Success/Failure Chart - Simplified as pie chart representation */}
            <div className="pt-4 border-t border-border">
              <h4 className="text-sm font-medium text-foreground mb-3">Task Outcomes</h4>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success"></div>
                  <span className="text-sm text-muted-foreground">
                    Success ({((1 - data.taskFailureRate) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive"></div>
                  <span className="text-sm text-muted-foreground">
                    Failed ({(data.taskFailureRate * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Errors */}
            <div className="pt-4 border-t border-border">
              <h4 className="text-sm font-medium text-foreground mb-3">Recent Errors</h4>
              {data.recentErrors.length > 0 ? (
                <div className="space-y-2">
                  {data.recentErrors.slice(0, 5).map((error, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-destructive"></div>
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {error.event_type || 'Unknown Error'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(error.created_at))} ago
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No recent errors in this range</p>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No error data available for this range</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}