import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, Play, Pause, Square, Trash2, FileText, Settings, AlertTriangle, Clock, MessageCircle } from 'lucide-react';
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

interface Agent {
  id: string;
  hostname?: string;
  agent_type: string;
  status: 'running' | 'idle' | 'error' | 'offline';
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

const getStatusBadge = (status: string) => {
  const statusConfig = {
    running: { 
      color: 'bg-gradient-to-r from-emerald-500/5 to-green-500/5 text-emerald-200 border-0 ring-1 ring-emerald-400/30 ring-inset backdrop-blur-xl rounded-full px-3 py-1', 
      dot: 'bg-emerald-400 ring-2 ring-emerald-400/20 ring-offset-1 ring-offset-transparent' 
    },
    idle: { 
      color: 'bg-gradient-to-r from-yellow-500/5 to-amber-500/5 text-yellow-200 border-0 ring-1 ring-yellow-400/30 ring-inset backdrop-blur-xl rounded-full px-3 py-1', 
      dot: 'bg-yellow-400 ring-2 ring-yellow-400/20 ring-offset-1 ring-offset-transparent' 
    },
    error: { 
      color: 'bg-gradient-to-r from-red-500/8 via-red-500/6 to-red-500/8 text-red-200 border-0 ring-1 ring-red-400/40 ring-inset backdrop-blur-xl rounded-full px-3 py-1', 
      dot: 'bg-gradient-to-r from-red-400 to-red-500 ring-2 ring-red-400/30 ring-offset-1 ring-offset-transparent' 
    },
    offline: { 
      color: 'bg-gradient-to-r from-slate-500/5 to-gray-500/5 text-gray-200 border-0 ring-1 ring-slate-400/30 ring-inset backdrop-blur-xl rounded-full px-3 py-1', 
      dot: 'bg-slate-400 ring-2 ring-slate-400/20 ring-offset-1 ring-offset-transparent' 
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.offline;

  return (
    <Badge variant="secondary" className={`${config.color} gap-1`}>
      <div className={`w-2 h-2 rounded-full ${config.dot}`} />
      <span className="ml-1">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
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

const getHashId = (fingerprint?: string) => {
  return fingerprint ? fingerprint.slice(0, 8) : 'N/A';
};

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
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Server / Hostname</TableHead>
            <TableHead>Agent ID</TableHead>
            <TableHead>Hash ID</TableHead>
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
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  {agent.id.slice(0, 8)}...
                </code>
              </TableCell>
              <TableCell>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  {getHashId(agent.certificate_fingerprint)}
                </code>
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
                          disabled={agent.status === 'running'}
                        >
                          <Play className="mr-2 h-4 w-4 text-green-500" />
                          Start
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            onPause(agent);
                          }}
                          disabled={agent.status !== 'running'}
                        >
                          <Pause className="mr-2 h-4 w-4 text-yellow-500" />
                          Pause
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            onStop(agent);
                          }}
                          disabled={agent.status === 'offline'}
                        >
                          <Square className="mr-2 h-4 w-4 text-red-500" />
                          Stop
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
