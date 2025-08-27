import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bot, Play, Pause, MoreHorizontal, Activity } from 'lucide-react'

export default function Agents() {
  const agents = [
    {
      id: 'agent-001',
      name: 'DataProcessor',
      type: 'Data Analysis',
      status: 'running',
      uptime: '24h 32m',
      tasks: 156,
      cpu: '45%',
      memory: '2.1GB'
    },
    {
      id: 'agent-002', 
      name: 'ContentGenerator',
      type: 'AI Writing',
      status: 'idle',
      uptime: '2h 15m',
      tasks: 23,
      cpu: '12%',
      memory: '1.3GB'
    },
    {
      id: 'agent-003',
      name: 'ImageProcessor',
      type: 'Computer Vision',
      status: 'error',
      uptime: '0m',
      tasks: 0,
      cpu: '0%',
      memory: '0GB'
    },
    {
      id: 'agent-004',
      name: 'ChatAssistant',
      type: 'Conversational AI',
      status: 'running',
      uptime: '72h 18m',
      tasks: 1247,
      cpu: '78%',
      memory: '4.2GB'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-success/10 text-success border-success/20'
      case 'idle': return 'bg-warning/10 text-warning border-warning/20'
      case 'error': return 'bg-destructive/10 text-destructive border-destructive/20'
      default: return 'bg-muted/10 text-muted-foreground border-muted/20'
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Agents</h1>
          <p className="text-muted-foreground">
            Monitor and manage your AI agents
          </p>
        </div>
        <Button className="bg-gradient-primary hover:bg-primary-dark shadow-glow">
          <Bot className="h-4 w-4 mr-2" />
          Deploy New Agent
        </Button>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {agents.map((agent) => (
          <Card key={agent.id} className="bg-gradient-card border-card-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{agent.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{agent.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getStatusColor(agent.status)}>
                  {agent.status}
                </Badge>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Uptime</p>
                  <p className="text-sm font-medium">{agent.uptime}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Tasks</p>
                  <p className="text-sm font-medium">{agent.tasks}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">CPU</p>
                  <p className="text-sm font-medium">{agent.cpu}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Memory</p>
                  <p className="text-sm font-medium">{agent.memory}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={agent.status === 'error'}
                >
                  {agent.status === 'running' ? (
                    <>
                      <Pause className="h-3 w-3 mr-1" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 mr-1" />
                      Start
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm">
                  <Activity className="h-3 w-3 mr-1" />
                  Logs
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}