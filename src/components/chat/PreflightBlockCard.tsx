import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, HardDrive, Cpu, MemoryStick, Wifi, Clock, Monitor } from 'lucide-react';

interface PreflightDetail {
  check: string;
  status?: string;
  message?: string;
  mount?: string;
  need_gb?: number;
  have_gb?: number;
  port?: number;
  state?: string;
  max_percent?: number;
  current_percent?: number;
  need_seconds?: number;
  have_seconds?: number;
  required_os?: string;
  current_os?: string;
  required_version?: string;
  current_version?: string;
  age_minutes?: number;
}

interface PreflightBlockCardProps {
  details: PreflightDetail[];
  onRetry: () => void;
  loading?: boolean;
}

export function PreflightBlockCard({ details, onRetry, loading = false }: PreflightBlockCardProps) {
  const getCheckIcon = (checkType: string) => {
    switch (checkType) {
      case 'min_disk':
        return <HardDrive className="h-4 w-4" />;
      case 'max_cpu':
        return <Cpu className="h-4 w-4" />;
      case 'max_memory':
        return <MemoryStick className="h-4 w-4" />;
      case 'require_open_ports_free':
      case 'require_ports_open':
        return <Wifi className="h-4 w-4" />;
      case 'min_uptime':
        return <Clock className="h-4 w-4" />;
      case 'os_version':
        return <Monitor className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getCheckTitle = (checkType: string) => {
    switch (checkType) {
      case 'min_disk':
        return 'Disk Space';
      case 'max_cpu':
        return 'CPU Usage';
      case 'max_memory':
        return 'Memory Usage';
      case 'require_open_ports_free':
        return 'Port Conflict';
      case 'require_ports_open':
        return 'Port Access';
      case 'min_uptime':
        return 'System Uptime';
      case 'os_version':
        return 'OS Version';
      case 'agent_availability':
        return 'Agent Availability';
      case 'agent_heartbeat':
        return 'Agent Status';
      default:
        return checkType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const formatCheckDetail = (detail: PreflightDetail) => {
    switch (detail.check) {
      case 'min_disk':
        return `Need ${detail.need_gb}GB free space on ${detail.mount || '/'}, but only ${detail.have_gb}GB available`;
      case 'max_cpu':
        return `CPU usage is ${detail.current_percent}%, exceeds maximum of ${detail.max_percent}%`;
      case 'max_memory':
        return `Memory usage is ${detail.current_percent}%, exceeds maximum of ${detail.max_percent}%`;
      case 'require_open_ports_free':
        return `Port ${detail.port} is already in use and needs to be free`;
      case 'require_ports_open':
        return `Port ${detail.port} is closed but needs to be open`;
      case 'min_uptime':
        const uptimeHours = Math.round((detail.have_seconds || 0) / 3600);
        const needHours = Math.round((detail.need_seconds || 0) / 3600);
        return `System uptime is ${uptimeHours}h, needs at least ${needHours}h`;
      case 'os_version':
        if (detail.required_os && detail.current_os) {
          return `OS is ${detail.current_os}, requires ${detail.required_os}`;
        }
        if (detail.required_version && detail.current_version) {
          return `Version is ${detail.current_version}, requires ${detail.required_version}+`;
        }
        return 'OS version requirements not met';
      case 'agent_heartbeat':
        if (detail.age_minutes) {
          return `Agent heartbeat is ${detail.age_minutes} minutes old (stale)`;
        }
        return detail.message || 'No recent heartbeat data available';
      default:
        return detail.message || `${detail.check} check failed`;
    }
  };

  const getStatusColor = (detail: PreflightDetail) => {
    switch (detail.status) {
      case 'insufficient_space':
      case 'high_cpu_usage':
      case 'high_memory_usage':
      case 'port_conflict':
      case 'port_unavailable':
      case 'insufficient_uptime':
      case 'os_mismatch':
      case 'version_too_old':
      case 'not_found':
      case 'stale':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className="border-destructive/20 bg-destructive/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Preflight Checks Failed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          The following issues need to be resolved before the task can run:
        </p>
        
        <div className="space-y-2">
          {details.map((detail, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg border bg-background">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {getCheckIcon(detail.check)}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{getCheckTitle(detail.check)}</span>
                    <Badge variant={getStatusColor(detail)} className="text-xs">
                      {detail.status?.replace(/_/g, ' ') || 'failed'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatCheckDetail(detail)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button 
            onClick={onRetry} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Checking...' : 'Retry'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Fix the issues on your server and click retry
          </p>
        </div>
      </CardContent>
    </Card>
  );
}