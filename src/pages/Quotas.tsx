import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { BarChart3, TrendingUp, AlertTriangle, Clock } from 'lucide-react'

export default function Quotas() {
  const quotas = [
    {
      name: 'API Requests',
      current: 8500,
      limit: 10000,
      period: 'per month',
      resetDate: '2024-02-01',
      trend: '+12%',
      status: 'warning'
    },
    {
      name: 'Compute Hours',
      current: 245,
      limit: 1000,
      period: 'per month',
      resetDate: '2024-02-01',
      trend: '+5%',
      status: 'normal'
    },
    {
      name: 'Storage',
      current: 45.2,
      limit: 100,
      period: 'GB total',
      resetDate: 'N/A',
      trend: '+2.1GB',
      status: 'normal'
    },
    {
      name: 'Bandwidth',
      current: 892,
      limit: 1000,
      period: 'GB per month',
      resetDate: '2024-02-01',
      trend: '+23%',
      status: 'critical'
    }
  ]

  const usageHistory = [
    { date: '2024-01-01', requests: 6200, compute: 180, storage: 42.1, bandwidth: 650 },
    { date: '2024-01-02', requests: 6800, compute: 195, storage: 42.8, bandwidth: 720 },
    { date: '2024-01-03', requests: 7500, compute: 220, storage: 43.5, bandwidth: 780 },
    { date: '2024-01-14', requests: 8200, compute: 238, storage: 44.8, bandwidth: 850 },
    { date: '2024-01-15', requests: 8500, compute: 245, storage: 45.2, bandwidth: 892 }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-success/10 text-success border-success/20'
      case 'warning': return 'bg-warning/10 text-warning border-warning/20'
      case 'critical': return 'bg-destructive/10 text-destructive border-destructive/20'
      default: return 'bg-muted/10 text-muted-foreground border-muted/20'
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-destructive'
    if (percentage >= 80) return 'bg-warning'
    return 'bg-success'
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quotas & Usage</h1>
          <p className="text-muted-foreground">
            Monitor resource usage and quotas across your services
          </p>
        </div>
        <Button className="bg-gradient-primary hover:bg-primary-dark shadow-glow">
          <BarChart3 className="h-4 w-4 mr-2" />
          Request Quota Increase
        </Button>
      </div>

      {/* Quota Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quotas.map((quota) => {
          const percentage = (quota.current / quota.limit) * 100
          return (
            <Card key={quota.name} className="bg-gradient-card border-card-border shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    {quota.status === 'critical' && <AlertTriangle className="h-5 w-5 text-destructive" />}
                    {quota.status === 'warning' && <Clock className="h-5 w-5 text-warning" />}
                    {quota.status === 'normal' && <BarChart3 className="h-5 w-5 text-primary" />}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{quota.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{quota.period}</p>
                  </div>
                </div>
                <Badge variant="outline" className={getStatusColor(quota.status)}>
                  {Math.round(percentage)}%
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Usage Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Usage</span>
                    <span className="text-foreground">
                      {quota.current.toLocaleString()} / {quota.limit.toLocaleString()}
                    </span>
                  </div>
                  <Progress 
                    value={percentage} 
                    className="h-2"
                  />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Trend</p>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-success" />
                      <span className="text-sm font-medium text-success">{quota.trend}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Resets</p>
                    <p className="text-sm font-medium">{quota.resetDate}</p>
                  </div>
                </div>

                {/* Alerts */}
                {quota.status === 'critical' && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-medium text-destructive">
                        Critical: {(100 - percentage).toFixed(0)}% remaining
                      </span>
                    </div>
                  </div>
                )}
                
                {quota.status === 'warning' && (
                  <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-warning" />
                      <span className="text-sm font-medium text-warning">
                        Warning: {(100 - percentage).toFixed(0)}% remaining
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Usage History */}
      <Card className="bg-gradient-card border-card-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Usage History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-4 text-sm font-medium text-muted-foreground">
              <span>Date</span>
              <span>API Requests</span>
              <span>Compute Hours</span>
              <span>Storage (GB)</span>
              <span>Bandwidth (GB)</span>
            </div>
            {usageHistory.map((entry, index) => (
              <div key={index} className="grid grid-cols-5 gap-4 text-sm py-2 border-b border-border last:border-b-0">
                <span className="text-foreground">{entry.date}</span>
                <span className="text-muted-foreground">{entry.requests.toLocaleString()}</span>
                <span className="text-muted-foreground">{entry.compute}</span>
                <span className="text-muted-foreground">{entry.storage}</span>
                <span className="text-muted-foreground">{entry.bandwidth}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}