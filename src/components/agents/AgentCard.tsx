import { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  ScrollText, 
  MoreVertical, 
  Cpu, 
  HardDrive,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Agent {
  id: string;
  name: string;
  agent_type: string;
  status: 'running' | 'idle' | 'error' | 'offline';
  uptime_seconds: number;
  cpu_usage: number;
  memory_usage: number;
  tasks_completed: number;
  last_seen: string | null;
  version?: string;
}

interface AgentCardProps {
  agent: Agent;
  onStart: (agent: Agent) => void;
  onPause: (agent: Agent) => void;
  onLogs: (agent: Agent) => void;
  onDetails: (agent: Agent) => void;
  onUpdate: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
  canManage: boolean;
}

const statusConfig = {
  running: { color: 'bg-success', textColor: 'text-success', bgColor: 'bg-success/10' },
  idle: { color: 'bg-warning', textColor: 'text-warning', bgColor: 'bg-warning/10' },
  error: { color: 'bg-destructive', textColor: 'text-destructive', bgColor: 'bg-destructive/10' },
  offline: { color: 'bg-muted-foreground', textColor: 'text-muted-foreground', bgColor: 'bg-muted/50' }
};

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function AgentCard({ 
  agent, 
  onStart, 
  onPause, 
  onLogs, 
  onDetails, 
  onUpdate, 
  onDelete,
  canManage 
}: AgentCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const config = statusConfig[agent.status];

  const handleAction = async (action: () => void) => {
    setIsLoading(true);
    try {
      await action();
    } finally {
      setIsLoading(false);
    }
  };

  const canStart = agent.status === 'offline' || agent.status === 'idle';
  const canPause = agent.status === 'running';

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-card-foreground">
              {agent.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {agent.agent_type.charAt(0).toUpperCase() + agent.agent_type.slice(1).replace('_', ' ')}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant="secondary"
              className={cn(
                "text-xs font-medium border-0",
                config.textColor,
                config.bgColor
              )}
            >
              <div className={cn("w-2 h-2 rounded-full mr-1.5", config.color)} />
              {agent.status}
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onDetails(agent)}>
                  Details
                </DropdownMenuItem>
                {canManage && (
                  <>
                    <DropdownMenuItem onClick={() => onUpdate(agent)}>
                      Update
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(agent)}
                      className="text-destructive"
                    >
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Uptime</span>
            </div>
            <p className="text-sm font-medium">
              {formatUptime(agent.uptime_seconds)}
            </p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Tasks</span>
            </div>
            <p className="text-sm font-medium">{agent.tasks_completed.toLocaleString()}</p>
          </div>
        </div>

        {/* Resource Usage */}
        <div className="space-y-3 mb-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">CPU</span>
              </div>
              <span className="text-xs font-medium">{agent.cpu_usage}%</span>
            </div>
            <Progress 
              value={agent.cpu_usage} 
              className="h-1.5"
            />
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Memory</span>
              </div>
              <span className="text-xs font-medium">{agent.memory_usage}%</span>
            </div>
            <Progress 
              value={agent.memory_usage} 
              className="h-1.5"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {canPause && (
            <Button 
              variant="outline" 
              size="sm" 
              disabled={isLoading || !canManage}
              onClick={() => handleAction(() => onPause(agent))}
              className="flex-1"
            >
              <Pause className="h-3.5 w-3.5 mr-1.5" />
              Pause
            </Button>
          )}
          
          {canStart && (
            <Button 
              variant="outline" 
              size="sm" 
              disabled={isLoading || !canManage}
              onClick={() => handleAction(() => onStart(agent))}
              className="flex-1"
            >
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Start
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onLogs(agent)}
            className="flex-1"
          >
            <ScrollText className="h-3.5 w-3.5 mr-1.5" />
            Logs
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}