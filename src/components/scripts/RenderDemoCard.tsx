import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RenderedResultCard } from '@/components/chat/RenderedResultCard';
import { DEFAULT_RENDER_TEMPLATES } from '@/types/renderTypes';

const SAMPLE_DATA = {
  'cpu-usage-gauge': 75.3,
  'cpu-cores-bar': [
    { core: 'Core 1', usage: 85 },
    { core: 'Core 2', usage: 72 },
    { core: 'Core 3', usage: 91 },
    { core: 'Core 4', usage: 68 }
  ],
  'memory-pie': [
    { type: 'Used', size: 6.2 },
    { type: 'Cached', size: 1.8 },
    { type: 'Free', size: 8.0 }
  ],
  'disk-usage-table': [
    { filesystem: '/dev/sda1', size: '20G', used: '12G', available: '8G', usage_percent: 60 },
    { filesystem: '/dev/sda2', size: '100G', used: '45G', available: '55G', usage_percent: 45 },
    { filesystem: '/dev/sdb1', size: '500G', used: '200G', available: '300G', usage_percent: 40 }
  ],
  'plain-text': `System Status: OK
CPU: 4 cores @ 2.8GHz
Memory: 16GB DDR4
Disk: 620GB total, 257GB used
Network: eth0 up, 1Gbps
Uptime: 15 days, 4 hours, 23 minutes
Load Average: 0.85, 0.92, 1.05`
};

export function RenderDemoCard() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Response Rendering Templates Demo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-6">
            Preview of how different render types display execution results in the chat interface.
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(DEFAULT_RENDER_TEMPLATES).map(([key, template]) => (
              <div key={key} className="space-y-3">
                <h4 className="text-sm font-medium capitalize border-b pb-2">
                  {key.replace(/-/g, ' ')} Template
                </h4>
                <RenderedResultCard
                  data={SAMPLE_DATA[key as keyof typeof SAMPLE_DATA]}
                  renderConfig={template}
                  className="border-dashed"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}