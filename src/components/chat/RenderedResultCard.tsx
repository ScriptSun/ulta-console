import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { RenderConfig, RenderType } from '@/types/renderTypes';
import { Activity, HardDrive, Cpu, Monitor, Server, Info } from 'lucide-react';

interface RenderedResultCardProps {
  data: any;
  renderConfig: RenderConfig;
  title?: string;
  className?: string;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

function GaugeChart({ value, min = 0, max = 100, unit = '', color = '#3b82f6', thresholds = [] }: {
  value: number;
  min?: number;
  max?: number;  
  unit?: string;
  color?: string;
  thresholds?: Array<{ value: number; color: string; label?: string }>;
}) {
  const percentage = ((value - min) / (max - min)) * 100;
  
  // Determine color based on thresholds
  let currentColor = color;
  for (const threshold of thresholds) {
    if (value >= threshold.value) {
      currentColor = threshold.color;
    }
  }

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
        {/* Background circle */}
        <circle
          cx="60"
          cy="60"
          r="50"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx="60"
          cy="60"
          r="50"
          stroke={currentColor}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${percentage * 3.14159} ${314.159}`}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold" style={{ color: currentColor }}>
          {value.toFixed(1)}
        </div>
        <div className="text-xs text-muted-foreground">{unit}</div>
      </div>
    </div>
  );
}

function renderTextResult(data: any, title?: string) {
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  
  return (
    <Card className="w-full">
      {title && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4" />
            {title}
          </CardTitle>  
        </CardHeader>
      )}
      <CardContent>
        <pre className="text-sm bg-muted/50 p-3 rounded-md overflow-auto whitespace-pre-wrap font-mono">
          {content}
        </pre>
      </CardContent>
    </Card>
  );
}

function renderBarChart(data: any[], config: RenderConfig, title?: string) {
  const chartData = Array.isArray(data) ? data : [];
  
  return (
    <Card className="w-full">
      {title && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
              <XAxis 
                dataKey={config.chart?.xKey || 'name'} 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar 
                dataKey={config.chart?.yKey || 'value'} 
                fill={config.chart?.color || '#3b82f6'}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function renderLineChart(data: any[], config: RenderConfig, title?: string) {
  const chartData = Array.isArray(data) ? data : [];
  
  return (
    <Card className="w-full">
      {title && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
              <XAxis 
                dataKey={config.chart?.xKey || 'name'} 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey={config.chart?.yKey || 'value'} 
                stroke={config.chart?.color || '#3b82f6'}
                strokeWidth={2}
                dot={{ fill: config.chart?.color || '#3b82f6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function renderPieChart(data: any[], config: RenderConfig, title?: string) {
  const chartData = Array.isArray(data) ? data : [];
  
  return (
    <Card className="w-full">
      {title && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey={config.chart?.valueKey || 'value'}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function renderGauge(data: any, config: RenderConfig, title?: string) {
  const value = typeof data === 'object' ? data[config.gauge?.dataKey || 'value'] : data;
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  
  return (
    <Card className="w-full">
      {title && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Cpu className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex flex-col items-center">
        <GaugeChart
          value={numericValue}
          min={config.gauge?.min}
          max={config.gauge?.max}
          unit={config.gauge?.unit}
          color={config.gauge?.color}
          thresholds={config.gauge?.thresholds}
        />
        {config.gauge?.thresholds && (
          <div className="flex gap-4 mt-4 text-xs">
            {config.gauge.thresholds.map((threshold, index) => (
              <div key={index} className="flex items-center gap-1">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: threshold.color }}
                />
                <span>{threshold.label || `>${threshold.value}`}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function renderTable(data: any[], config: RenderConfig, title?: string) {
  const tableData = Array.isArray(data) ? data : [];
  const columns = config.table?.columns || [];
  
  return (
    <Card className="w-full">
      {title && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.key}>{column.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((row, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      {column.type === 'badge' ? (
                        <Badge variant="outline">{row[column.key]}</Badge>
                      ) : column.type === 'progress' ? (
                        <div className="flex items-center gap-2">
                          <Progress value={parseFloat(row[column.key]) || 0} className="w-16" />
                          <span className="text-sm">{row[column.key]}%</span>
                        </div>
                      ) : (
                        row[column.key]
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function renderCards(data: any[], config: RenderConfig, title?: string) {
  const cardsData = Array.isArray(data) ? data : [data];
  const fields = config.cards?.fields || [];
  
  return (
    <div className="space-y-4">
      {title && (
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Monitor className="h-4 w-4" />
          {title}
        </h3>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cardsData.map((item, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="space-y-3">
                {fields.map((field) => (
                  <div key={field.key} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{field.label}:</span>
                    <div className="font-medium">
                      {field.type === 'badge' ? (
                        <Badge variant="outline">{item[field.key]}</Badge>
                      ) : field.type === 'progress' ? (
                        <div className="flex items-center gap-2">
                          <Progress value={parseFloat(item[field.key]) || 0} className="w-16" />
                          <span className="text-sm">{item[field.key]}%</span>
                        </div>
                      ) : (
                        item[field.key]
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>  
    </div>
  );
}

export function RenderedResultCard({ data, renderConfig, title, className }: RenderedResultCardProps) {
  if (!data) {
    return renderTextResult('No data available', title);
  }

  switch (renderConfig.type) {
    case 'bar-chart':
      return renderBarChart(data, renderConfig, title || renderConfig.chart?.title);
    case 'line-chart':
      return renderLineChart(data, renderConfig, title || renderConfig.chart?.title);
    case 'pie-chart':
      return renderPieChart(data, renderConfig, title || renderConfig.chart?.title);
    case 'gauge':
      return renderGauge(data, renderConfig, title || renderConfig.gauge?.title);
    case 'table':
      return renderTable(data, renderConfig, title || renderConfig.table?.title);
    case 'cards':
      return renderCards(data, renderConfig, title || renderConfig.cards?.title);
    case 'text':
    default:
      return renderTextResult(data, title);
  }
}