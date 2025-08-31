import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Users, TrendingDown, TrendingUp } from 'lucide-react';
import { DateRange } from '@/hooks/useDateRangeFilter';
import { useRevenueData } from '@/hooks/useRevenueData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface RevenueOverviewProps {
  dateRange: DateRange;
}

export function RevenueOverview({ dateRange }: RevenueOverviewProps) {
  const { data, isLoading, error } = useRevenueData(dateRange);

  if (error) {
    return (
      <Card className="bg-gradient-card border-card-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Revenue Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-destructive">Failed to load revenue data</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-gradient-card border-card-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Revenue Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 rounded-lg bg-muted/30 animate-pulse">
                <div className="h-4 bg-muted rounded w-20 mb-2"></div>
                <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                <div className="h-3 bg-muted rounded w-24"></div>
              </div>
            ))}
          </div>
          <div className="h-64 bg-muted/30 rounded-lg animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="bg-gradient-card border-card-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Revenue Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">No subscription data</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate trend indicators
  const mrrTrend = data.mrr > data.previousPeriodMrr ? 'up' : data.mrr < data.previousPeriodMrr ? 'down' : 'same';
  const arpuTrend = data.arpu > data.previousPeriodArpu ? 'up' : data.arpu < data.previousPeriodArpu ? 'down' : 'same';
  const churnTrend = data.churnRate < data.previousPeriodChurn ? 'up' : data.churnRate > data.previousPeriodChurn ? 'down' : 'same';

  const getTrendIcon = (trend: string, isChurn = false) => {
    if (trend === 'up') {
      return isChurn ? (
        <TrendingUp className="h-4 w-4 text-destructive" />
      ) : (
        <TrendingUp className="h-4 w-4 text-green-600" />
      );
    }
    if (trend === 'down') {
      return isChurn ? (
        <TrendingDown className="h-4 w-4 text-green-600" />
      ) : (
        <TrendingDown className="h-4 w-4 text-destructive" />
      );
    }
    return null;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  return (
    <Card className="bg-gradient-card border-card-border shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Revenue Overview
          <Badge variant="outline" className="ml-auto">
            {dateRange.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* MRR */}
          <div className="p-6 rounded-lg bg-success/10 border border-success/20 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-muted-foreground">Monthly Recurring Revenue</div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-success/20 text-success text-xs font-medium">
                {getTrendIcon(mrrTrend)}
                <span>
                  {data.previousPeriodMrr > 0 
                    ? (((data.mrr - data.previousPeriodMrr) / data.previousPeriodMrr) * 100).toFixed(2)
                    : '0.00'
                  }%
                </span>
              </div>
            </div>
            <div className="text-4xl font-bold text-foreground mb-2">
              {formatCurrency(data.mrr)}
            </div>
            <div className="text-sm text-muted-foreground">
              vs {formatCurrency(data.previousPeriodMrr)} prev period
            </div>
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent pointer-events-none"></div>
          </div>

          {/* ARPU */}
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">Average Revenue Per User</div>
              {getTrendIcon(arpuTrend)}
            </div>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(data.arpu)}
            </div>
            <div className="text-xs text-muted-foreground">
              vs {formatCurrency(data.previousPeriodArpu)} prev period
            </div>
          </div>

          {/* Churn Rate */}
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">Churn Rate</div>
              {getTrendIcon(churnTrend, true)}
            </div>
            <div className="text-2xl font-bold text-foreground">
              {data.churnRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              Last 30 days
            </div>
          </div>
        </div>

        {/* MRR Trend Chart */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">MRR Trend (Last 6 Months)</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.mrrTrend}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', { month: 'short' });
                  }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  formatter={(value) => [formatCurrency(Number(value)), 'MRR']}
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="mrr" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="mt-6 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Active Subscriptions</span>
            <span className="font-medium text-foreground">{data.activeSubscriptions}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}