import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  AreaChart,
  Area
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon, TrendingUp, AreaChart as AreaChartIcon } from 'lucide-react';

interface AgentUsageChartProps {
  data: Array<{
    period: string;
    active: number;
    suspended: number;
    terminated: number;
    total: number;
  }>;
  dateRange: {
    start: Date;
    end: Date;
    label: string;
  };
  groupBy: 'day' | 'week' | 'month';
}

type ChartType = 'bar' | 'pie' | 'line' | 'area';

const CHART_TYPES = [
  { value: 'bar', label: 'Bar Chart', icon: BarChart3 },
  { value: 'pie', label: 'Pie Chart', icon: PieChartIcon },
  { value: 'line', label: 'Line Chart', icon: TrendingUp },
  { value: 'area', label: 'Area Chart', icon: AreaChartIcon }
] as const;

const STATUS_COLORS = {
  active: 'hsl(142, 76%, 36%)',    // green
  suspended: 'hsl(38, 92%, 50%)',  // yellow/amber
  terminated: 'hsl(0, 84%, 60%)',  // red
  total: 'hsl(250, 70%, 60%)',     // purple
};

export function AgentUsageChart({ data, dateRange, groupBy }: AgentUsageChartProps) {
  const [chartType, setChartType] = useState<ChartType>('line'); // Default to line chart

  // Prepare data for charts - show agents by time period and status
  const chartData = data.map((item) => ({
    name: item.period,
    active: item.active,
    suspended: item.suspended,
    terminated: item.terminated,
    total: item.total
  }));

  // Calculate totals
  const totals = data.reduce((acc, item) => ({
    active: acc.active + item.active,
    suspended: acc.suspended + item.suspended,
    terminated: acc.terminated + item.terminated,
    total: acc.total + item.total
  }), { active: 0, suspended: 0, terminated: 0, total: 0 });

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-md">
                        <div className="grid gap-2">
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
                            </span>
                            <span className="font-bold text-muted-foreground">
                              {label}
                            </span>
                          </div>
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                {entry.dataKey === 'active' ? 'Active' : 
                                 entry.dataKey === 'suspended' ? 'Suspended' : 
                                 entry.dataKey === 'terminated' ? 'Terminated' : 'Total'} Agents
                              </span>
                              <span className="font-bold" style={{ color: entry.color }}>
                                {entry.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="active" stackId="a" fill={STATUS_COLORS.active} />
              <Bar dataKey="suspended" stackId="a" fill={STATUS_COLORS.suspended} />
              <Bar dataKey="terminated" stackId="a" fill={STATUS_COLORS.terminated} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        const pieData = [
          { name: 'Active', value: totals.active, color: STATUS_COLORS.active },
          { name: 'Suspended', value: totals.suspended, color: STATUS_COLORS.suspended },
          { name: 'Terminated', value: totals.terminated, color: STATUS_COLORS.terminated }
        ];
        
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-md">
                        <div className="grid gap-2">
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Status
                            </span>
                            <span className="font-bold text-muted-foreground">
                              {payload[0]?.name}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Count
                            </span>
                            <span className="font-bold">
                              {payload[0]?.value} agents
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-md">
                        <div className="grid gap-2">
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
                            </span>
                            <span className="font-bold text-muted-foreground">
                              {label}
                            </span>
                          </div>
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                {entry.dataKey === 'active' ? 'Active' : 
                                 entry.dataKey === 'suspended' ? 'Suspended' : 
                                 entry.dataKey === 'terminated' ? 'Terminated' :
                                 'Total'} Agents
                              </span>
                              <span className="font-bold" style={{ color: entry.color }}>
                                {entry.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line type="monotone" dataKey="active" stroke={STATUS_COLORS.active} strokeWidth={3} dot={{ fill: STATUS_COLORS.active, r: 4 }} />
              <Line type="monotone" dataKey="suspended" stroke={STATUS_COLORS.suspended} strokeWidth={3} dot={{ fill: STATUS_COLORS.suspended, r: 4 }} />
              <Line type="monotone" dataKey="terminated" stroke={STATUS_COLORS.terminated} strokeWidth={3} dot={{ fill: STATUS_COLORS.terminated, r: 4 }} />
              <Line type="monotone" dataKey="total" stroke={STATUS_COLORS.total} strokeWidth={4} dot={{ fill: STATUS_COLORS.total, r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-md">
                        <div className="grid gap-2">
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
                            </span>
                            <span className="font-bold text-muted-foreground">
                              {label}
                            </span>
                          </div>
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                {entry.dataKey === 'active' ? 'Active' : 
                                 entry.dataKey === 'suspended' ? 'Suspended' : 
                                 'Terminated'} Agents
                              </span>
                              <span className="font-bold" style={{ color: entry.color }}>
                                {entry.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area type="monotone" dataKey="terminated" stackId="1" stroke={STATUS_COLORS.terminated} fill={STATUS_COLORS.terminated} fillOpacity={0.6} />
              <Area type="monotone" dataKey="suspended" stackId="1" stroke={STATUS_COLORS.suspended} fill={STATUS_COLORS.suspended} fillOpacity={0.6} />
              <Area type="monotone" dataKey="active" stackId="1" stroke={STATUS_COLORS.active} fill={STATUS_COLORS.active} fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  if (!data || data.length === 0) {
    return (
      <Card className="bg-gradient-card border-card-border shadow-card">
        <CardHeader>
          <CardTitle>Agent Status Over Time</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">No agent data found in the selected date range</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-card-border shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Agent Status from {dateRange.label}
        </CardTitle>
        <Select value={chartType} onValueChange={(value: ChartType) => setChartType(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHART_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex items-center gap-2">
                  <type.icon className="h-4 w-4" />
                  {type.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.active }}></div>
              <span className="text-muted-foreground">Active: <span className="font-semibold text-foreground">{totals.active}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.suspended }}></div>
              <span className="text-muted-foreground">Suspended: <span className="font-semibold text-foreground">{totals.suspended}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.terminated }}></div>
              <span className="text-muted-foreground">Terminated: <span className="font-semibold text-foreground">{totals.terminated}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.total }}></div>
              <span className="text-muted-foreground">Total: <span className="font-semibold text-foreground">{totals.total}</span></span>
            </div>
          </div>
        </div>
        
        {renderChart()}
        
        {/* Chart Legend */}
        <div className="mt-4 flex flex-wrap gap-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.active }}></div>
            <span className="text-xs text-muted-foreground">Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.suspended }}></div>
            <span className="text-xs text-muted-foreground">Suspended</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.terminated }}></div>
            <span className="text-xs text-muted-foreground">Terminated</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.total }}></div>
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}