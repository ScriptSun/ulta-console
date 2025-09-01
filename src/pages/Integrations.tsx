import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Puzzle, CheckCircle, XCircle, Clock, ExternalLink, Key, Copy, Code2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Integrations() {
  const { toast } = useToast()

  const plans = [
    { name: 'Starter', slug: 'starter', periods: ['monthly', '6-months'] },
    { name: 'Professional', slug: 'professional', periods: ['monthly', '6-months', '1-year'] },
    { name: 'Enterprise', slug: 'enterprise', periods: ['monthly', '1-year', '2-years'] },
    { name: 'Custom', slug: 'custom', periods: ['monthly', '3-months', '6-months', '1-year'] }
  ]

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: `${label} copied to clipboard` })
  }
  const integrations = [
    {
      id: 'chat-widget',
      name: 'Chat Widget',
      type: 'Primary Integration',
      status: 'connected',
      description: 'Live chat widget embedded in your billing platform',
      lastSync: '2 minutes ago',
      version: 'v2.1.4',
      endpoint: 'https://billing.example.com/chat',
      metrics: {
        uptime: '99.9%',
        requests: '1.2K today',
        latency: '45ms'
      }
    },
    {
      id: 'webhook-notifications',
      name: 'Webhook Notifications',
      type: 'Event System',
      status: 'connected',
      description: 'Real-time notifications for system events',
      lastSync: '5 minutes ago',
      version: 'v1.8.2',
      endpoint: 'https://api.example.com/webhooks',
      metrics: {
        uptime: '99.8%',
        requests: '456 today',
        latency: '23ms'
      }
    },
    {
      id: 'analytics-service',
      name: 'Analytics Service',
      type: 'Data Pipeline',
      status: 'warning',
      description: 'Usage analytics and reporting service',
      lastSync: '1 hour ago',
      version: 'v3.2.1',
      endpoint: 'https://analytics.example.com/api',
      metrics: {
        uptime: '98.5%',
        requests: '89 today',
        latency: '120ms'
      }
    },
    {
      id: 'backup-service',
      name: 'Backup Service',
      type: 'Data Management',
      status: 'disconnected',
      description: 'Automated backup and recovery system',
      lastSync: '2 days ago',
      version: 'v1.5.0',
      endpoint: 'https://backup.example.com/sync',
      metrics: {
        uptime: '0%',
        requests: '0 today',
        latency: 'N/A'
      }
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return CheckCircle
      case 'warning': return Clock
      case 'disconnected': return XCircle
      default: return Clock
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-success/10 text-success border-success/20'
      case 'warning': return 'bg-warning/10 text-warning border-warning/20'
      case 'disconnected': return 'bg-destructive/10 text-destructive border-destructive/20'
      default: return 'bg-muted/10 text-muted-foreground border-muted/20'
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Integrations</h1>
          <p className="text-muted-foreground">
            Connect your billing platform to our UltaAI services
          </p>
        </div>
        <Button className="bg-gradient-primary hover:bg-primary-dark shadow-glow" asChild>
          <a href="/api-keys">
            <Key className="h-4 w-4 mr-2" />
            Generate Partner Key
          </a>
        </Button>
      </div>

      {/* Billing API Integration Guide */}
      <Card className="bg-gradient-primary border-primary shadow-glow">
        <CardHeader className="text-card-foreground">
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Billing Platform Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="text-card-foreground space-y-4">
          <p className="text-muted-foreground">
            Integrate your billing platform with UltaAI using our Partner API. Follow these steps to get started:
          </p>
          
          {/* Integration Checklist */}
          <div className="space-y-3">
            <h4 className="font-medium text-card-foreground">Integration Checklist:</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>✓ Create subscription plans in the Plans section</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>✓ Map your billing SKUs to plan slugs and periods</span>
              </div>
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                <span>• Generate a Partner API key with billing permissions</span>
              </div>
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-primary" />
                <span>• Call Activate Plan on successful purchase</span>
              </div>
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-primary" />
                <span>• Call Renew Plan on successful charge renewal</span>
              </div>
              <div className="flex items-center gap-2">
                <Puzzle className="h-4 w-4 text-primary" />
                <span>• Monitor usage limits in your dashboard</span>
              </div>
            </div>
          </div>

          {/* API Endpoints */}
          <div className="space-y-3 pt-4 border-t border-border/20">
            <h4 className="font-medium text-card-foreground">Partner API Endpoints:</h4>
            
            <div className="space-y-3">
              <div className="bg-card/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm font-mono text-foreground">POST /activate-plan</code>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-foreground hover:bg-muted"
                    onClick={() => copyToClipboard('POST /activate-plan', 'Endpoint')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-2">Activate a subscription plan for a user</p>
                <div className="text-xs text-muted-foreground">
                  <strong>Required fields:</strong> partner_key, plan_slug, period, user_email, agent_id, external_reference
                </div>
              </div>

              <div className="bg-card/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm font-mono text-foreground">POST /renew-plan</code>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-foreground hover:bg-muted"
                    onClick={() => copyToClipboard('POST /renew-plan', 'Endpoint')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-2">Extend an existing subscription</p>
                <div className="text-xs text-muted-foreground">
                  <strong>Required fields:</strong> partner_key, activation_id (or external_reference), extend_days
                </div>
              </div>
            </div>
          </div>

          {/* Available Plans */}
          <div className="space-y-3 pt-4 border-t border-border/20">
            <h4 className="font-medium text-card-foreground">Available Plans:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {plans.map((plan) => (
                <div key={plan.slug} className="bg-card/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground">{plan.name}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5 text-foreground hover:bg-muted"
                      onClick={() => copyToClipboard(plan.slug, 'Plan slug')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <code className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                    {plan.slug}
                  </code>
                  <div className="text-xs text-muted-foreground mt-1">
                    Periods: {plan.periods.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4">
            <Button variant="secondary" size="sm" asChild>
              <a href="/api-keys">
                <Key className="h-4 w-4 mr-1" />
                Generate Partner Key
              </a>
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <a href="/subscription-plans">
                View Plans
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Integration Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-card border-card-border shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Integrations
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">2</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-success">+1</span> from last week
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-card-border shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Warning Status
            </CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">1</div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-card-border shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Disconnected
            </CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">1</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-destructive">Service offline</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Integration Cards */}
      <div className="space-y-4">
        {integrations.map((integration) => {
          const StatusIcon = getStatusIcon(integration.status)
          return (
            <Card key={integration.id} className="bg-gradient-card border-card-border shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <StatusIcon className={`h-5 w-5 ${
                      integration.status === 'connected' ? 'text-success' :
                      integration.status === 'warning' ? 'text-warning' : 'text-destructive'
                    }`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{integration.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getStatusColor(integration.status)}>
                    {integration.status}
                  </Badge>
                  <Button variant="ghost" size="icon">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground">{integration.description}</p>
                
                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Uptime</p>
                    <p className="text-sm font-medium">{integration.metrics.uptime}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Requests</p>
                    <p className="text-sm font-medium">{integration.metrics.requests}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Latency</p>
                    <p className="text-sm font-medium">{integration.metrics.latency}</p>
                  </div>
                </div>

                {/* Connection Details */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Endpoint</p>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {integration.endpoint}
                      </code>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Version</p>
                      <p className="text-sm font-medium">{integration.version}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Last Sync</p>
                    <p className="text-sm font-medium">{integration.lastSync}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  {integration.status === 'connected' && (
                    <Button variant="outline" size="sm">
                      Test Connection
                    </Button>
                  )}
                  {integration.status === 'disconnected' && (
                    <Button variant="outline" size="sm" className="text-success">
                      Reconnect
                    </Button>
                  )}
                  {integration.status === 'warning' && (
                    <Button variant="outline" size="sm" className="text-warning">
                      Diagnose Issues
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    View Logs
                  </Button>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Chat Widget Specific Section */}
      <Card className="bg-gradient-primary border-primary shadow-glow">
        <CardHeader className="text-card-foreground">
          <CardTitle className="flex items-center gap-2">
            <Puzzle className="h-5 w-5" />
            Chat Widget Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="text-card-foreground space-y-4">
          <p className="text-muted-foreground">
            Your chat widget is successfully embedded in the billing platform and functioning normally.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Active Sessions</p>
              <p className="text-xl font-bold">23</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Messages Today</p>
              <p className="text-xl font-bold">1,247</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Response Time</p>
              <p className="text-xl font-bold">1.2s</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="secondary" size="sm">
              View Widget Analytics
            </Button>
            <Button variant="secondary" size="sm">
              Update Widget Config
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}