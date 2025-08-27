import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckSquare, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react'

export default function Tasks() {
  const tasks = [
    {
      id: 'task-001',
      name: 'Process customer data batch',
      type: 'Data Processing',
      status: 'running',
      progress: 75,
      agent: 'DataProcessor',
      startTime: '2024-01-15 14:30',
      estimatedCompletion: '15:45'
    },
    {
      id: 'task-002',
      name: 'Generate marketing content',
      type: 'Content Generation',
      status: 'completed',
      progress: 100,
      agent: 'ContentGenerator',
      startTime: '2024-01-15 13:00',
      estimatedCompletion: '14:00'
    },
    {
      id: 'task-003',
      name: 'Analyze user sentiment',
      type: 'Natural Language Processing',
      status: 'failed',
      progress: 45,
      agent: 'TextAnalyzer',
      startTime: '2024-01-15 12:00',
      estimatedCompletion: 'Failed at 12:30'
    },
    {
      id: 'task-004',
      name: 'Image classification batch',
      type: 'Computer Vision',
      status: 'queued',
      progress: 0,
      agent: 'ImageProcessor',
      startTime: 'Pending',
      estimatedCompletion: 'TBD'
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return Clock
      case 'completed': return CheckCircle
      case 'failed': return XCircle
      case 'queued': return AlertCircle
      default: return CheckSquare
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-primary/10 text-primary border-primary/20'
      case 'completed': return 'bg-success/10 text-success border-success/20'
      case 'failed': return 'bg-destructive/10 text-destructive border-destructive/20'
      case 'queued': return 'bg-warning/10 text-warning border-warning/20'
      default: return 'bg-muted/10 text-muted-foreground border-muted/20'
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground">
            Monitor and manage agent tasks and workflows
          </p>
        </div>
        <Button className="bg-gradient-primary hover:bg-primary-dark shadow-glow">
          <CheckSquare className="h-4 w-4 mr-2" />
          Create Task
        </Button>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {tasks.map((task) => {
          const StatusIcon = getStatusIcon(task.status)
          return (
            <Card key={task.id} className="bg-gradient-card border-card-border shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <StatusIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{task.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{task.type}</p>
                  </div>
                </div>
                <Badge variant="outline" className={getStatusColor(task.status)}>
                  {task.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Bar */}
                {task.status === 'running' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="text-foreground">{task.progress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Task Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Agent</p>
                    <p className="text-sm font-medium">{task.agent}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Started</p>
                    <p className="text-sm font-medium">{task.startTime}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {task.status === 'completed' ? 'Completed' : 
                       task.status === 'failed' ? 'Failed' : 'ETA'}
                    </p>
                    <p className="text-sm font-medium">{task.estimatedCompletion}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  {task.status === 'running' && (
                    <Button variant="outline" size="sm">
                      Pause
                    </Button>
                  )}
                  {task.status === 'failed' && (
                    <Button variant="outline" size="sm">
                      Retry
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  <Button variant="outline" size="sm">
                    Logs
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}