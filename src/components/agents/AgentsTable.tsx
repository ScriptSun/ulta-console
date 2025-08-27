import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, Play, Pause, Square, Trash2, FileText, Settings, AlertTriangle } from 'lucide-react';
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
  name: string;
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
  canManage: boolean;
}

const getStatusBadge = (status: string) => {
  const statusConfig = {
    running: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', dot: 'bg-green-500' },
    idle: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300', dot: 'bg-gray-500' },
    suspended: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300', dot: 'bg-gray-500' },
    error: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', dot: 'bg-red-500' },
    offline: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', dot: 'bg-red-500' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.offline;

  return (
    <Badge variant="secondary" className={`${config.color} gap-1`}>
      <div className={`w-2 h-2 rounded-full ${config.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
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
            <TableHead>CPU %</TableHead>
            <TableHead>Memory Usage</TableHead>
            <TableHead>Tasks</TableHead>
            <TableHead>Uptime</TableHead>
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
                <div>
                  <div className="font-semibold">{agent.hostname || agent.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {agent.name}
                  </div>
                </div>
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
              <TableCell>
                <div className="flex items-center gap-2">
                  <span>{agent.cpu_usage.toFixed(1)}%</span>
                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(agent.cpu_usage, 100)}%` }}
                    />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{formatMemoryUsage(agent.memory_usage)}</span>
                </div>
              </TableCell>
              <TableCell>{agent.tasks_completed}</TableCell>
              <TableCell>{formatUptime(agent.uptime_seconds)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canManage && (
                      <>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            onStart(agent);
                          }}
                          disabled={agent.status === 'running'}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Start
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            onPause(agent);
                          }}
                          disabled={agent.status !== 'running'}
                        >
                          <Pause className="mr-2 h-4 w-4" />
                          Pause
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            onStop(agent);
                          }}
                          disabled={agent.status === 'offline'}
                        >
                          <Square className="mr-2 h-4 w-4" />
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