import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, DollarSign, Users, PercentIcon, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRevenueOverview } from '@/hooks/useDashboardData';
import { DateRange } from '@/hooks/useDateRangeFilter';

interface RevenueOverviewProps {
  dateRange: DateRange;
}

export function RevenueOverview({ dateRange }: RevenueOverviewProps) {
  const { data, isLoading, error } = useRevenueOverview(dateRange);

  const exportCSV = () => {
    if (!data) return;
    
    const csvData = [
      ['Metric', 'Value'],
      ['MRR', `$${data.mrr.toFixed(2)}`],
      ['ARPU', `$${data.arpu.toFixed(2)}`],
      ['Churn Rate', `${(data.churnRate * 100).toFixed(2)}%`],
      ['Active Subscriptions', data.activeSubscriptions.toString()],
      ['Active Users', data.activeUsers.toString()]
    ];
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-overview-${dateRange.label.toLowerCase().replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <Card className="bg-gradient-card border-card-border shadow-card">
        <CardHeader>
          <CardTitle className="text-destructive">Revenue Overview - Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Failed to load revenue data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-card-border shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-success" />
          Revenue Overview
        </CardTitle>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={!data}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium text-muted-foreground">MRR</span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  ${data.mrr.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <TrendingUp className="h-3 w-3 text-success" />
                  <span className="text-success">+12%</span>
                  <span className="text-muted-foreground">vs prev period</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">ARPU</span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  ${data.arpu.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <TrendingUp className="h-3 w-3 text-success" />
                  <span className="text-success">+8%</span>
                  <span className="text-muted-foreground">vs prev period</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <PercentIcon className="h-4 w-4 text-warning" />
                  <span className="text-sm font-medium text-muted-foreground">Churn Rate</span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {(data.churnRate * 100).toFixed(1)}%
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <TrendingDown className="h-3 w-3 text-success" />
                  <span className="text-success">-2%</span>
                  <span className="text-muted-foreground">vs prev period</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Active Subscriptions:</span>
                  <span className="ml-2 font-medium text-foreground">{data.activeSubscriptions}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Active Users:</span>
                  <span className="ml-2 font-medium text-foreground">{data.activeUsers}</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No subscription data available for this range</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}