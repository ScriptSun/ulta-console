export type RenderType = 'text' | 'bar-chart' | 'line-chart' | 'pie-chart' | 'gauge' | 'table' | 'cards';

export interface ChartConfig {
  title?: string;
  xKey?: string;
  yKey?: string;
  dataKey?: string;
  nameKey?: string;
  valueKey?: string;
  color?: string;
  mapping?: Record<string, string>;
}

export interface TableConfig {
  title?: string;
  columns?: Array<{
    key: string;
    label: string;
    type?: 'text' | 'number' | 'badge' | 'progress';
  }>;
}

export interface CardsConfig {
  title?: string;
  template?: 'metric' | 'status' | 'info';
  fields?: Array<{
    key: string;
    label: string;
    type?: 'text' | 'number' | 'badge' | 'progress';
    icon?: string;
  }>;
}

export interface GaugeConfig {
  title?: string;
  dataKey: string;
  min?: number;
  max?: number;
  unit?: string;
  color?: string;
  thresholds?: Array<{
    value: number;
    color: string;
    label?: string;
  }>;
}

export interface RenderConfig {
  type: RenderType;
  chart?: ChartConfig;
  table?: TableConfig;
  cards?: CardsConfig;
  gauge?: GaugeConfig;
}

export const DEFAULT_RENDER_TEMPLATES: Record<string, RenderConfig> = {
  'cpu-usage-gauge': {
    type: 'gauge',
    gauge: {
      title: 'CPU Usage',
      dataKey: 'cpu_usage',
      min: 0,
      max: 100,
      unit: '%',
      color: '#3b82f6',
      thresholds: [
        { value: 70, color: '#f59e0b', label: 'Warning' },
        { value: 90, color: '#ef4444', label: 'Critical' }
      ]
    }
  },
  'cpu-cores-bar': {
    type: 'bar-chart',
    chart: {
      title: 'CPU Cores Usage',
      xKey: 'core',
      yKey: 'usage',
      color: '#8b5cf6'
    }
  },
  'memory-pie': {
    type: 'pie-chart',
    chart: {
      title: 'Memory Usage',
      nameKey: 'type',
      valueKey: 'size',
      color: '#06b6d4'
    }
  },
  'disk-usage-table': {
    type: 'table',
    table: {
      title: 'Disk Usage',
      columns: [
        { key: 'filesystem', label: 'Filesystem', type: 'text' },
        { key: 'size', label: 'Size', type: 'text' },
        { key: 'used', label: 'Used', type: 'text' },
        { key: 'available', label: 'Available', type: 'text' },
        { key: 'usage_percent', label: 'Usage', type: 'progress' }
      ]
    }
  },
  'plain-text': {
    type: 'text'
  }
};