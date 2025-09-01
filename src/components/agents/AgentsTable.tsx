import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, Play, Pause, Square, Trash2, FileText, Settings, AlertTriangle, Clock, MessageCircle, User, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useThemeVariants } from '@/hooks/useDarkThemeVariant';

interface Agent {
  id: string;
  hostname?: string;
  agent_type: string;
  status: 'active' | 'suspended' | 'terminated';
  version?: string;
  os?: string;
  region?: string;
  ip_address?: string;
  last_seen: string | null;
  uptime_seconds: number;
  cpu_usage: number;
  memory_usage: number;
  tasks_completed: number;
  certificate_fingerprint?: string;
  user_id?: string;
  plan_key?: string;
  users?: {
    email: string;
    full_name: string | null;
  };
}

interface AgentsTableProps {
  agents: Agent[];
  onAgentClick: (agent: Agent) => void;
  onStart: (agent: Agent) => void;
  onPause: (agent: Agent) => void;
  onStop: (agent: Agent) => void;
  onRemove: (agent: Agent) => void;
  onLogs: (agent: Agent) => void;
  onDetails: (agent: Agent) => void;
  onRecentTasks?: (agent: Agent) => void;
  canManage: boolean;
}

export function AgentsTable({
  agents,
  onAgentClick,
  onStart,
  onPause,
  onStop,
  onRemove,
  onLogs,
  onDetails,
  onRecentTasks,
  canManage
}: AgentsTableProps) {
  const { isDarkMode, getCurrentDarkTheme, getCurrentLightTheme } = useThemeVariants();
  
  const getStatusBadge = (status: string) => {
    // Get the current theme to access the primary color
    const currentTheme = isDarkMode ? getCurrentDarkTheme() : getCurrentLightTheme();
    const primaryColor = currentTheme.primaryColor;
    
    const statusConfig = {
      active: { 
        variant: 'default' as const,
        className: `text-white border-0`,
        dot: 'bg-white',
        style: { backgroundColor: primaryColor }
      },
      suspended: { 
        variant: 'secondary' as const,
        className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20',
        dot: 'bg-warning',
        style: {}
      },
      terminated: { 
        variant: 'outline' as const,
        className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
        dot: 'bg-destructive',
        style: {}
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.terminated;

    return (
      <Badge 
        variant={config.variant} 
        className={`${config.className} gap-1.5 font-medium`}
        style={config.style}
      >
        <div className={`w-2 h-2 rounded-full ${config.dot}`} />
        <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </Badge>
    );
  };

  const getPlanBadge = (planKey?: string) => {
    // Get the current theme to access the primary color  
    const currentTheme = isDarkMode ? getCurrentDarkTheme() : getCurrentLightTheme();
    const primaryColor = currentTheme.primaryColor;
    
    return (
      <Badge 
        variant="outline" 
        className="text-xs text-white border-0"
        style={{ backgroundColor: primaryColor }}
      >
        {planKey ? getPlanDisplayName(planKey) : 'Free Plan'}
      </Badge>
    );
  };

const formatUptime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const formatMemoryUsage = (usage: number) => {
  const gb = (usage / 1024).toFixed(1);
  return `${gb} GB (${usage.toFixed(1)}%)`;
};

const getPlanDisplayName = (planKey: string) => {
  const planNames: { [key: string]: string } = {
    'free_plan': 'Free Plan',
    'basic_plan': 'Basic Plan',
    'pro_plan': 'Pro Plan',
    'enterprise_plan': 'Enterprise Plan',
    'starter': 'Starter Plan',
    'professional': 'Professional Plan',
    'enterprise': 'Enterprise Plan'
  };
  
  return planNames[planKey] || planKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Server / Hostname</TableHead>
            <TableHead>Agent ID</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>IP Address</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>OS</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Tasks</TableHead>
            <TableHead className="w-[50px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((agent) => (
            <TableRow 
              key={agent.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onAgentClick(agent)}
            >
              <TableCell className="font-medium">
                <div className="font-semibold">{agent.id.slice(0, 5).toLowerCase()}@srvultahost.com</div>
              </TableCell>
              <TableCell>
                <code className="text-xs bg-muted/20 text-muted-foreground border border-border px-2 py-1 rounded font-mono">
                  {agent.id.slice(0, 8)}...
                </code>
              </TableCell>
              <TableCell>
                {agent.users ? (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{agent.users.full_name || 'Unnamed User'}</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {agent.users.email}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <User className="h-3 w-3" />
                    No user assigned
                  </div>
                )}
              </TableCell>
              <TableCell>
                {getPlanBadge(agent.plan_key)}
              </TableCell>
              <TableCell>{agent.ip_address || 'N/A'}</TableCell>
              <TableCell>{getStatusBadge(agent.status)}</TableCell>
              <TableCell className="capitalize">{agent.os || 'Unknown'}</TableCell>
              <TableCell>{agent.version || 'N/A'}</TableCell>
              <TableCell>{agent.tasks_completed}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background border shadow-lg z-50">
                    {canManage && (
                      <>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            onStart(agent);
                          }}
                          disabled={agent.status === 'active'}
                        >
                          <Play className="mr-2 h-4 w-4 text-green-500" />
                          Start
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            onPause(agent);
                          }}
                          disabled={agent.status !== 'active'}
                        >
                          <Pause className="mr-2 h-4 w-4 text-yellow-500" />
                          Suspend
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            onStop(agent);
                          }}
                          disabled={agent.status === 'terminated'}
                        >
                          <Square className="mr-2 h-4 w-4 text-red-500" />
                          Terminate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        onLogs(agent);
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Logs
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDetails(agent);
                      }}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Details
                    </DropdownMenuItem>
                    {onRecentTasks && (
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onRecentTasks(agent);
                        }}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        Recent Tasks
                      </DropdownMenuItem>
                    )}
                    {canManage && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemove(agent);
                          }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
