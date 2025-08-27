import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Shield, AlertTriangle, Eye, Lock, UserX, Globe } from 'lucide-react'

export default function Security() {
  const securityEvents = [
    {
      id: 'event-001',
      type: 'authentication',
      severity: 'high',
      title: 'Multiple failed login attempts',
      description: 'IP address 192.168.1.100 attempted to log in 5 times with invalid credentials',
      timestamp: '2024-01-15 14:23:15',
      source: 'Authentication Service',
      status: 'active'
    },
    {
      id: 'event-002',
      type: 'access',
      severity: 'medium',
      title: 'API key used from new location',
      description: 'API key "prod-key-001" was used from an unusual geographic location',
      timestamp: '2024-01-15 13:45:32',
      source: 'API Gateway',
      status: 'investigated'
    },
    {
      id: 'event-003',
      type: 'system',
      severity: 'low',
      title: 'Security scan completed',
      description: 'Weekly automated security scan completed successfully',
      timestamp: '2024-01-15 12:00:00',
      source: 'Security Scanner',
      status: 'resolved'
    },
    {
      id: 'event-004',
      type: 'data',
      severity: 'critical',
      title: 'Suspicious data access pattern',
      description: 'Unusual bulk data access detected from user account',
      timestamp: '2024-01-15 11:30:45',
      source: 'Data Access Monitor',
      status: 'active'
    }
  ]

  const securityMetrics = [
    {
      name: 'Threat Level',
      value: 'Medium',
      icon: Shield,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/20'
    },
    {
      name: 'Active Threats',
      value: '2',
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive/20'
    },
    {
      name: 'Blocked Attempts',
      value: '47',
      icon: UserX,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/20'
    },
    {
      name: 'Monitored IPs',
      value: '1,247',
      icon: Globe,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20'
    }
  ]

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive/10 text-destructive border-destructive/20'
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20'
      case 'medium': return 'bg-warning/10 text-warning border-warning/20'
      case 'low': return 'bg-success/10 text-success border-success/20'
      default: return 'bg-muted/10 text-muted-foreground border-muted/20'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-destructive/10 text-destructive border-destructive/20'
      case 'investigated': return 'bg-warning/10 text-warning border-warning/20'
      case 'resolved': return 'bg-success/10 text-success border-success/20'
      default: return 'bg-muted/10 text-muted-foreground border-muted/20'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'authentication': return Lock
      case 'access': return Eye
      case 'system': return Shield
      case 'data': return AlertTriangle
      default: return Shield
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Security Events</h1>
          <p className="text-muted-foreground">
            Monitor security threats and system protection status
          </p>
        </div>
        <Button className="bg-gradient-primary hover:bg-primary-dark shadow-glow">
          <Shield className="h-4 w-4 mr-2" />
          Run Security Scan
        </Button>
      </div>

      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {securityMetrics.map((metric) => (
          <Card key={metric.name} className="bg-gradient-card border-card-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.name}
              </CardTitle>
              <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{metric.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Security Events */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Recent Security Events</h2>
        {securityEvents.map((event) => {
          const TypeIcon = getTypeIcon(event.type)
          return (
            <Card key={event.id} className="bg-gradient-card border-card-border shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <TypeIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{event.source}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getSeverityColor(event.severity)}>
                    {event.severity}
                  </Badge>
                  <Badge variant="outline" className={getStatusColor(event.status)}>
                    {event.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground">{event.description}</p>
                
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    {event.timestamp}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      Investigate
                    </Button>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                    {event.status === 'active' && (
                      <Button variant="outline" size="sm" className="text-destructive">
                        Block Source
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Security Configuration */}
      <Card className="bg-gradient-card border-card-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Security Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-medium text-foreground">Authentication</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Two-Factor Authentication</span>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    Enabled
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Session Timeout</span>
                  <span className="text-sm text-foreground">30 minutes</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Max Login Attempts</span>
                  <span className="text-sm text-foreground">5</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-medium text-foreground">Access Control</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">IP Whitelist</span>
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                    Disabled
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">API Rate Limiting</span>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    Enabled
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Encryption at Rest</span>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    AES-256
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 pt-4 border-t border-border">
            <Button variant="outline" size="sm">
              Configure Settings
            </Button>
            <Button variant="outline" size="sm">
              Export Logs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}