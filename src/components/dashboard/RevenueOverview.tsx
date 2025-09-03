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
        <TrendingUp className="h-4 w-4 text-success" />
      );
    }
    if (trend === 'down') {
      return isChurn ? (
        <TrendingDown className="h-4 w-4 text-success" />
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
          <Badge variant="secondary" className="ml-2">
            Active Subscriptions: {data.activeSubscriptions}
          </Badge>
          <Badge variant="outline" className="ml-auto">
            {dateRange.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* MRR */}
          <div className="p-6 rounded-lg bg-gradient-to-br from-card to-muted border border-card-border relative overflow-hidden shadow-sm shadow-success/20">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-muted-foreground">Recurring Revenue</div>
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
            {/* Enhanced green gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-success/15 via-success/5 to-transparent pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-success/25 via-success/10 to-transparent pointer-events-none"></div>
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-success/30 rounded-full blur-xl pointer-events-none"></div>
          </div>

          {/* ARPU */}
          <div className="p-6 rounded-lg bg-gradient-to-br from-card to-muted border border-card-border relative overflow-hidden">
             <div className="flex items-center justify-between mb-3">
               <div className="text-sm font-medium text-muted-foreground">Average Revenue Per User</div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                {getTrendIcon(arpuTrend)}
                <span>
                  {data.previousPeriodArpu > 0 
                    ? (((data.arpu - data.previousPeriodArpu) / data.previousPeriodArpu) * 100).toFixed(2)
                    : '0.00'
                  }%
                </span>
              </div>
            </div>
             <div className="text-4xl font-bold text-foreground mb-2">
              {formatCurrency(data.arpu)}
            </div>
             <div className="text-sm text-muted-foreground">
              vs {formatCurrency(data.previousPeriodArpu)} prev period
            </div>
            {/* Blue gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-primary/30 to-transparent pointer-events-none"></div>
          </div>

          {/* Net Revenue */}
          <div className="p-6 rounded-lg bg-gradient-to-br from-card to-muted relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-muted-foreground">Net Revenue After AI Costs</div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/20 text-primary-foreground text-xs font-medium">
                {getTrendIcon(data.netRevenue > data.previousPeriodNetRevenue ? 'up' : data.netRevenue < data.previousPeriodNetRevenue ? 'down' : 'same')}
                <span className="text-primary">
                  {data.previousPeriodNetRevenue > 0 
                    ? (((data.netRevenue - data.previousPeriodNetRevenue) / data.previousPeriodNetRevenue) * 100).toFixed(2)
                    : '0.00'
                  }%
                </span>
              </div>
            </div>
            <div className="text-4xl font-bold text-foreground mb-2">
              {formatCurrency(data.netRevenue)}
            </div>
            <div className="text-sm text-muted-foreground">
              Revenue: {formatCurrency(data.mrr)} - AI Costs: {formatCurrency(data.aiCosts)}
            </div>
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-primary/30 to-transparent pointer-events-none"></div>
          </div>

          {/* Churn Rate */}
          <div className="p-6 rounded-lg bg-gradient-to-br from-card to-muted border border-card-border relative overflow-hidden shadow-sm">
             <div className="flex items-center justify-between mb-3">
               <div className="text-sm font-medium text-muted-foreground">Churn Rate</div>
               <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/20 text-destructive text-xs font-medium">
                 {getTrendIcon(churnTrend, true)}
                 <span>Trend</span>
               </div>
             </div>
             <div className="text-4xl font-bold text-foreground mb-2">
               {data.churnRate.toFixed(1)}%
             </div>
             <div className="text-sm text-muted-foreground">
               Current churn rate
             </div>
            {/* Enhanced red gradient overlay with stronger opacity */}
            <div className="absolute inset-0 bg-gradient-to-br from-destructive/25 via-destructive/10 to-transparent pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-destructive/40 via-destructive/20 to-transparent pointer-events-none"></div>
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-destructive/50 rounded-full blur-xl pointer-events-none"></div>
          </div>
        </div>

        {/* Charts Section - 2 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* MRR Trend Chart */}
           <div className="p-6 rounded-lg bg-gradient-to-br from-card to-muted border border-card-border relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-foreground">MRR Trend</h4>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.mrrTrend}>
                   <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                   <XAxis 
                     dataKey="date" 
                     tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                     axisLine={{ stroke: 'hsl(var(--border))' }}
                     tickLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }}
                  />
                   <YAxis 
                     tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                     axisLine={{ stroke: 'hsl(var(--border))' }}
                     tickLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(value) => `$${value}`}
                  />
                   <Tooltip 
                     contentStyle={{
                       backgroundColor: 'hsl(var(--card))',
                       border: '1px solid hsl(var(--border))',
                       borderRadius: '8px',
                       color: 'hsl(var(--foreground))'
                     }}
                    formatter={(value) => [formatCurrency(Number(value)), 'MRR']}
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="mrr" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: 'hsl(var(--card))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Green gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-success/10 via-transparent to-primary/10 pointer-events-none"></div>
             <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-card/50 to-transparent pointer-events-none"></div>
          </div>

          {/* Churn Trend Chart */}
          <div className="p-6 rounded-lg bg-gradient-to-br from-card to-muted border border-card-border relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-foreground">Churn Trend</h4>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.churnTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                   <XAxis 
                     dataKey="date" 
                     tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                     axisLine={{ stroke: 'hsl(var(--border))' }}
                     tickLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', { month: 'short' });
                    }}
                  />
                   <YAxis 
                     tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                     axisLine={{ stroke: 'hsl(var(--border))' }}
                     tickLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(value) => `${value}%`}
                  />
                   <Tooltip 
                     contentStyle={{
                       backgroundColor: 'hsl(var(--card))',
                       border: '1px solid hsl(var(--border))',
                       borderRadius: '8px',
                       color: 'hsl(var(--foreground))'
                     }}
                    formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Churn Rate']}
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="churn" 
                    stroke="#ef4444" 
                    strokeWidth={3}
                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2, fill: 'hsl(var(--card))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Red gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 via-transparent to-red-500/10 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-card/50 to-transparent pointer-events-none"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}