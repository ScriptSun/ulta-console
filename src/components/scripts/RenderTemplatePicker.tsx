import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RenderConfig, RenderType, DEFAULT_RENDER_TEMPLATES, ChartConfig, TableConfig, CardsConfig, GaugeConfig } from '@/types/renderTypes';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Gauge, 
  Table, 
  LayoutGrid, 
  FileText,
  Plus,
  X
} from 'lucide-react';

interface RenderTemplatePickerProps {
  value: RenderConfig;
  onChange: (config: RenderConfig) => void;
  className?: string;
}

const RENDER_TYPE_OPTIONS = [
  { value: 'text' as RenderType, label: 'Plain Text', icon: FileText },
  { value: 'bar-chart' as RenderType, label: 'Bar Chart', icon: BarChart3 },
  { value: 'line-chart' as RenderType, label: 'Line Chart', icon: TrendingUp },
  { value: 'pie-chart' as RenderType, label: 'Pie Chart', icon: PieChart },
  { value: 'gauge' as RenderType, label: 'Gauge', icon: Gauge },
  { value: 'table' as RenderType, label: 'Table', icon: Table },
  { value: 'cards' as RenderType, label: 'Cards', icon: LayoutGrid },
];

export function RenderTemplatePicker({ value, onChange, className }: RenderTemplatePickerProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const handleTypeChange = (type: RenderType) => {
    const newConfig: RenderConfig = { type };
    
    // Set default configurations based on type
    switch (type) {
      case 'bar-chart':
      case 'line-chart':
        newConfig.chart = {
          title: '',
          xKey: 'name',
          yKey: 'value',
          color: '#3b82f6'
        };
        break;
      case 'pie-chart':
        newConfig.chart = {
          title: '',
          nameKey: 'name',
          valueKey: 'value',
          color: '#3b82f6'
        };
        break;
      case 'gauge':
        newConfig.gauge = {
          title: '',
          dataKey: 'value',
          min: 0,
          max: 100,
          unit: '%',
          color: '#3b82f6',
          thresholds: []
        };
        break;
      case 'table':
        newConfig.table = {
          title: '',
          columns: [
            { key: 'name', label: 'Name', type: 'text' }
          ]
        };
        break;
      case 'cards':
        newConfig.cards = {
          title: '',
          template: 'metric',
          fields: [
            { key: 'name', label: 'Name', type: 'text' }
          ]
        };
        break;
    }
    
    onChange(newConfig);
  };

  const handleTemplateSelect = (templateKey: string) => {
    const template = DEFAULT_RENDER_TEMPLATES[templateKey];
    if (template) {
      onChange(template);
      setSelectedTemplate(templateKey);
    }
  };

  const updateChartConfig = (updates: Partial<ChartConfig>) => {
    onChange({
      ...value,
      chart: { ...value.chart, ...updates }
    });
  };

  const updateTableConfig = (updates: Partial<TableConfig>) => {
    onChange({
      ...value,
      table: { ...value.table, ...updates }
    });
  };

  const updateCardsConfig = (updates: Partial<CardsConfig>) => {
    onChange({
      ...value,
      cards: { ...value.cards, ...updates }
    });
  };

  const updateGaugeConfig = (updates: Partial<GaugeConfig>) => {
    onChange({
      ...value,
      gauge: { ...value.gauge, ...updates }
    });
  };

  const addTableColumn = () => {
    const columns = [...(value.table?.columns || [])];
    columns.push({ key: '', label: '', type: 'text' });
    updateTableConfig({ columns });
  };

  const removeTableColumn = (index: number) => {
    const columns = [...(value.table?.columns || [])];
    columns.splice(index, 1);
    updateTableConfig({ columns });
  };

  const updateTableColumn = (index: number, updates: any) => {
    const columns = [...(value.table?.columns || [])];
    columns[index] = { ...columns[index], ...updates };
    updateTableConfig({ columns });
  };

  const addCardField = () => {
    const fields = [...(value.cards?.fields || [])];
    fields.push({ key: '', label: '', type: 'text' });
    updateCardsConfig({ fields });
  };

  const removeCardField = (index: number) => {
    const fields = [...(value.cards?.fields || [])];
    fields.splice(index, 1);
    updateCardsConfig({ fields });
  };

  const updateCardField = (index: number, updates: any) => {
    const fields = [...(value.cards?.fields || [])];
    fields[index] = { ...fields[index], ...updates };
    updateCardsConfig({ fields });
  };

  const addGaugeThreshold = () => {
    const thresholds = [...(value.gauge?.thresholds || [])];
    thresholds.push({ value: 0, color: '#f59e0b', label: '' });
    updateGaugeConfig({ thresholds });
  };

  const removeGaugeThreshold = (index: number) => {
    const thresholds = [...(value.gauge?.thresholds || [])];
    thresholds.splice(index, 1);
    updateGaugeConfig({ thresholds });
  };

  const updateGaugeThreshold = (index: number, updates: any) => {
    const thresholds = [...(value.gauge?.thresholds || [])];
    thresholds[index] = { ...thresholds[index], ...updates };
    updateGaugeConfig({ thresholds });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Response Rendering Template</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Templates */}
        <div>
          <Label className="text-sm font-medium">Quick Templates</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {Object.entries(DEFAULT_RENDER_TEMPLATES).map(([key, template]) => (
              <Button
                key={key}
                variant={selectedTemplate === key ? 'default' : 'outline'}
                size="sm"
                className="justify-start text-xs"
                onClick={() => handleTemplateSelect(key)}
              >
                {key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Button>
            ))}
          </div>
        </div>

        {/* Render Type */}
        <div>
          <Label className="text-sm font-medium">Render Type</Label>
          <Select value={value.type} onValueChange={handleTypeChange}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RENDER_TYPE_OPTIONS.map((option) => {
                const IconComponent = option.icon;
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Chart Configuration */}
        {(value.type === 'bar-chart' || value.type === 'line-chart' || value.type === 'pie-chart') && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">Chart Configuration</Label>
            
            <div>
              <Label className="text-xs">Chart Title</Label>
              <Input
                value={value.chart?.title || ''}
                onChange={(e) => updateChartConfig({ title: e.target.value })}
                placeholder="Enter chart title"
                className="mt-1"
              />
            </div>

            {value.type === 'pie-chart' ? (
              <>
                <div>
                  <Label className="text-xs">Name Key</Label>
                  <Input
                    value={value.chart?.nameKey || ''}
                    onChange={(e) => updateChartConfig({ nameKey: e.target.value })}
                    placeholder="e.g., name, type, category"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Value Key</Label>
                  <Input
                    value={value.chart?.valueKey || ''}
                    onChange={(e) => updateChartConfig({ valueKey: e.target.value })}
                    placeholder="e.g., value, size, amount"
                    className="mt-1"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label className="text-xs">X-Axis Key</Label>
                  <Input
                    value={value.chart?.xKey || ''}
                    onChange={(e) => updateChartConfig({ xKey: e.target.value })}
                    placeholder="e.g., name, date, category"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Y-Axis Key</Label>
                  <Input
                    value={value.chart?.yKey || ''}
                    onChange={(e) => updateChartConfig({ yKey: e.target.value })}
                    placeholder="e.g., value, count, amount"
                    className="mt-1"
                  />
                </div>
              </>
            )}

            <div>
              <Label className="text-xs">Color</Label>
              <Input
                type="color"
                value={value.chart?.color || '#3b82f6'}
                onChange={(e) => updateChartConfig({ color: e.target.value })}
                className="mt-1 h-8"
              />
            </div>
          </div>
        )}

        {/* Gauge Configuration */}
        {value.type === 'gauge' && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">Gauge Configuration</Label>
            
            <div>
              <Label className="text-xs">Title</Label>
              <Input
                value={value.gauge?.title || ''}
                onChange={(e) => updateGaugeConfig({ title: e.target.value })}
                placeholder="Enter gauge title"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Data Key</Label>
              <Input
                value={value.gauge?.dataKey || ''}
                onChange={(e) => updateGaugeConfig({ dataKey: e.target.value })}
                placeholder="e.g., cpu_usage, temperature"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Min</Label>
                <Input
                  type="number"
                  value={value.gauge?.min || 0}
                  onChange={(e) => updateGaugeConfig({ min: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Max</Label>
                <Input
                  type="number"
                  value={value.gauge?.max || 100}
                  onChange={(e) => updateGaugeConfig({ max: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Unit</Label>
                <Input
                  value={value.gauge?.unit || ''}
                  onChange={(e) => updateGaugeConfig({ unit: e.target.value })}
                  placeholder="%"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Color</Label>
              <Input
                type="color"
                value={value.gauge?.color || '#3b82f6'}
                onChange={(e) => updateGaugeConfig({ color: e.target.value })}
                className="mt-1 h-8"
              />
            </div>

            {/* Thresholds */}
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Thresholds</Label>
                <Button size="sm" variant="outline" onClick={addGaugeThreshold}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {value.gauge?.thresholds?.map((threshold, index) => (
                <div key={index} className="flex items-center gap-2 mt-2">
                  <Input
                    type="number"
                    value={threshold.value}
                    onChange={(e) => updateGaugeThreshold(index, { value: parseInt(e.target.value) })}
                    placeholder="Value"
                    className="flex-1"
                  />
                  <Input
                    type="color"
                    value={threshold.color}
                    onChange={(e) => updateGaugeThreshold(index, { color: e.target.value })}
                    className="w-12 h-8"
                  />
                  <Input
                    value={threshold.label || ''}
                    onChange={(e) => updateGaugeThreshold(index, { label: e.target.value })}
                    placeholder="Label"
                    className="flex-1"
                  />
                  <Button size="sm" variant="outline" onClick={() => removeGaugeThreshold(index)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Table Configuration */}
        {value.type === 'table' && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">Table Configuration</Label>
            
            <div>
              <Label className="text-xs">Table Title</Label>
              <Input
                value={value.table?.title || ''}
                onChange={(e) => updateTableConfig({ title: e.target.value })}
                placeholder="Enter table title"
                className="mt-1"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Columns</Label>
                <Button size="sm" variant="outline" onClick={addTableColumn}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {value.table?.columns?.map((column, index) => (
                <div key={index} className="flex items-center gap-2 mt-2">
                  <Input
                    value={column.key}
                    onChange={(e) => updateTableColumn(index, { key: e.target.value })}
                    placeholder="Data key"
                    className="flex-1"
                  />
                  <Input
                    value={column.label}
                    onChange={(e) => updateTableColumn(index, { label: e.target.value })}
                    placeholder="Column label"
                    className="flex-1"
                  />
                  <Select
                    value={column.type || 'text'}
                    onValueChange={(value) => updateTableColumn(index, { type: value })}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="badge">Badge</SelectItem>
                      <SelectItem value="progress">Progress</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => removeTableColumn(index)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cards Configuration */}
        {value.type === 'cards' && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">Cards Configuration</Label>
            
            <div>
              <Label className="text-xs">Cards Title</Label>
              <Input
                value={value.cards?.title || ''}
                onChange={(e) => updateCardsConfig({ title: e.target.value })}
                placeholder="Enter cards title"
                className="mt-1"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Fields</Label>
                <Button size="sm" variant="outline" onClick={addCardField}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {value.cards?.fields?.map((field, index) => (
                <div key={index} className="flex items-center gap-2 mt-2">
                  <Input
                    value={field.key}
                    onChange={(e) => updateCardField(index, { key: e.target.value })}
                    placeholder="Data key"
                    className="flex-1"
                  />
                  <Input
                    value={field.label}
                    onChange={(e) => updateCardField(index, { label: e.target.value })}
                    placeholder="Field label"
                    className="flex-1"
                  />
                  <Select
                    value={field.type || 'text'}
                    onValueChange={(value) => updateCardField(index, { type: value })}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="badge">Badge</SelectItem>
                      <SelectItem value="progress">Progress</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => removeCardField(index)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}