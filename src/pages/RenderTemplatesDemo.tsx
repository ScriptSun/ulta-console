import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RenderedResultCard } from '@/components/chat/RenderedResultCard';
import { DEFAULT_RENDER_TEMPLATES } from '@/types/renderTypes';
import { Monitor, BarChart3, TrendingUp, PieChart, Gauge, Table, LayoutGrid, FileText } from 'lucide-react';

const SAMPLE_DATA = {
  'cpu-usage-gauge': { cpu_usage: 78.5 },
  'cpu-cores-bar': [
    { core: 'Core 1', usage: 85 },
    { core: 'Core 2', usage: 72 },
    { core: 'Core 3', usage: 91 },
    { core: 'Core 4', usage: 68 },
    { core: 'Core 5', usage: 76 },
    { core: 'Core 6', usage: 83 },
    { core: 'Core 7', usage: 65 },
    { core: 'Core 8', usage: 89 }
  ],
  'memory-pie': [
    { type: 'Used', size: 6.2 },
    { type: 'Cached', size: 1.8 },
    { type: 'Buffers', size: 0.5 },
    { type: 'Free', size: 7.5 }
  ],
  'disk-usage-table': [
    { filesystem: '/dev/nvme0n1p1', size: '931G', used: '347G', available: '536G', usage_percent: 38 },
    { filesystem: '/dev/nvme0n1p2', size: '100G', used: '45G', available: '55G', usage_percent: 45 },
    { filesystem: '/dev/sda1', size: '2.0T', used: '1.2T', available: '800G', usage_percent: 60 },
    { filesystem: '/dev/sdb1', size: '4.0T', used: '800G', available: '3.2T', usage_percent: 20 },
    { filesystem: 'tmpfs', size: '16G', used: '2.1G', available: '14G', usage_percent: 13 }
  ],
  'plain-text': `System Health Report - Generated at 2025-01-30 14:23:15

✅ System Status: HEALTHY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🖥️  Hardware Information:
   • CPU: Intel Core i9-12900K @ 3.20GHz (16 cores)
   • Memory: 32GB DDR4-3200 (78% utilized)  
   • Storage: 1TB NVMe SSD + 2TB HDD
   • GPU: NVIDIA RTX 4080 (driver 531.79)

📊 Performance Metrics:
   • CPU Load: 2.4, 1.8, 1.2 (1min, 5min, 15min)
   • Memory Usage: 25.1GB / 32GB (78%)
   • Swap Usage: 0.0GB / 8GB (0%)
   • Network I/O: ↑ 12.3 MB/s ↓ 8.7 MB/s

🌐 Network Status:
   • Interface: eth0 (1Gbps, UP)
   • IP: 192.168.1.100/24
   • Gateway: 192.168.1.1 (ping: 1.2ms)
   • DNS: 8.8.8.8, 1.1.1.1 (responding)

⚡ Services Status:
   • nginx: ✅ active (pid 1234)
   • postgresql: ✅ active (pid 5678)  
   • redis: ✅ active (pid 9012)
   • docker: ✅ active (22 containers running)

📈 Uptime: 15 days, 4 hours, 23 minutes

🔧 Recent Activities:
   • [14:20] Package update: upgraded 23 packages
   • [14:15] Service restart: nginx reloaded successfully
   • [14:10] Backup completed: /var/backups/db_20250130.sql.gz
   
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
All systems operational. Next automated check in 5 minutes.`
};

const RENDER_TYPE_ICONS = {
  'text': FileText,
  'bar-chart': BarChart3,
  'line-chart': TrendingUp,
  'pie-chart': PieChart,
  'gauge': Gauge,
  'table': Table,
  'cards': LayoutGrid
};

export default function RenderTemplatesDemo() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Batch Response Templates
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Customize how execution results are displayed in the chat interface. Choose from charts, tables, gauges, 
          and more to create rich, interactive visualizations from your batch script outputs.
        </p>
      </div>

      {/* Features Overview */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Rich Visualizations</h3>
              <p className="text-sm text-muted-foreground">Transform raw data into beautiful charts and graphs</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto bg-accent/20 rounded-full flex items-center justify-center">
                <Monitor className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-semibold">Interactive Tables</h3>
              <p className="text-sm text-muted-foreground">Display structured data with progress bars and badges</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto bg-secondary/20 rounded-full flex items-center justify-center">
                <Gauge className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="font-semibold">Real-time Gauges</h3>
              <p className="text-sm text-muted-foreground">Monitor metrics with customizable threshold indicators</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto bg-muted-foreground/20 rounded-full flex items-center justify-center">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">Flexible Templates</h3>
              <p className="text-sm text-muted-foreground">Easy-to-configure templates for any data structure</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Showcase */}
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-center">Available Templates</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {Object.entries(DEFAULT_RENDER_TEMPLATES).map(([key, template]) => {
            const IconComponent = RENDER_TYPE_ICONS[template.type];
            const displayName = key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            return (
              <Card key={key} className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                      {displayName}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {template.type}
                    </Badge>
                  </div>
                  
                  {/* Template Description */}
                  <p className="text-sm text-muted-foreground mt-2">
                    {key === 'cpu-usage-gauge' && 'Perfect for monitoring single metrics with customizable thresholds and color coding.'}
                    {key === 'cpu-cores-bar' && 'Ideal for comparing values across multiple categories or time periods.'}
                    {key === 'memory-pie' && 'Great for showing proportional data and composition breakdowns.'}
                    {key === 'disk-usage-table' && 'Structured data display with support for progress bars and status badges.'}
                    {key === 'plain-text' && 'Clean, formatted text output with syntax highlighting and proper spacing.'}
                  </p>
                </CardHeader>
                
                <CardContent>
                  <div className="border rounded-lg overflow-hidden bg-background/50">
                    <RenderedResultCard
                      data={SAMPLE_DATA[key as keyof typeof SAMPLE_DATA]}
                      renderConfig={template}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* How to Use */}
      <Card className="mt-12">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            How to Configure Templates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">1</div>
                Edit Batch
              </div>
              <p className="text-sm text-muted-foreground">
                Open any batch in the editor and navigate to the "Response" tab to configure rendering templates.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">2</div>
                Choose Template
              </div>
              <p className="text-sm text-muted-foreground">
                Select from predefined templates or create custom configurations with your own data mappings.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">3</div>
                Execute & View
              </div>
              <p className="text-sm text-muted-foreground">
                Run your batch and see the results displayed according to your template configuration in the chat.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}