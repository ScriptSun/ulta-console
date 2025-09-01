import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, RefreshCw, HardDrive, Cpu, MemoryStick, Wifi, Clock, Monitor, CheckCircle, X, Loader } from 'lucide-react';
import { useEventBus } from '@/hooks/useEventBus';
import { useToast } from '@/hooks/use-toast';

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
  details?: PreflightDetail[];
  onRetry?: () => void;
  loading?: boolean;
  agent_id?: string;
  decision?: any;
  onPreflightComplete?: (success: boolean, runId?: string) => void;
}

export function PreflightBlockCard({ 
  details = [], 
  onRetry, 
  loading = false, 
  agent_id, 
  decision, 
  onPreflightComplete 
}: PreflightBlockCardProps) {
  const { onPreflight } = useEventBus();
  const { toast } = useToast();
  const [streamingChecks, setStreamingChecks] = useState<Map<string, { status: string; message?: string; }>>(new Map());
  const [isStreaming, setIsStreaming] = useState(false);
  const [preflightDone, setPreflightDone] = useState(false);
  const [hasTimeout, setHasTimeout] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Listen to preflight streaming events
  useEffect(() => {
    if (!agent_id || !decision) return;
    
    // Set timeout for preflight checks (60 seconds)
    timeoutRef.current = setTimeout(() => {
      if (isStreaming) {
        setHasTimeout(true);
        setIsStreaming(false);
        toast({
          title: "Preflight Timeout",
          description: "⚠️ Checks stalled.",
          variant: "destructive"
        });
        onPreflightComplete?.(false);
      }
    }, 60000);
    
    const unsubscribe = onPreflight((eventType, data) => {
      switch (eventType) {
        case 'preflight.start':
          console.log('Preflight checks starting');
          setIsStreaming(true);
          setStreamingChecks(new Map());
          setPreflightDone(false);
          setHasTimeout(false);
          break;
          
        case 'preflight.item':
          console.log('Preflight check update:', data);
          setStreamingChecks(prev => {
            const updated = new Map(prev);
            updated.set(data.name, {
              status: data.status,
              message: data.message
            });
            return updated;
          });
          break;
          
        case 'preflight.done':
          console.log('Preflight checks completed:', data);
          setIsStreaming(false);
          setPreflightDone(true);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          onPreflightComplete?.(data.ok, data.run_id);
          break;
          
        case 'preflight.error':
          console.error('Preflight error:', data);
          setIsStreaming(false);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          toast({
            title: "Preflight Error",
            description: data.error || "An error occurred during preflight checks.",
            variant: "destructive"
          });
          onPreflightComplete?.(false);
          break;
          
        case 'preflight.timeout':
          setHasTimeout(true);
          setIsStreaming(false);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          toast({
            title: "Preflight Timeout",
            description: "⚠️ Checks stalled.",
            variant: "destructive"
          });
          onPreflightComplete?.(false);
          break;
      }
    });
    
    return () => {
      unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onPreflight, agent_id, decision, onPreflightComplete, toast, isStreaming]);

  // Combine static details with streaming checks
  const allChecks = [...details];
  streamingChecks.forEach((checkData, checkName) => {
    if (!allChecks.find(d => d.check === checkName)) {
      allChecks.push({
        check: checkName,
        status: checkData.status,
        message: checkData.message
      });
    }
  });

  const hasFailures = allChecks.some(check => 
    streamingChecks.get(check.check)?.status === 'fail' || 
    (check.status && !['pass', 'ok'].includes(check.status))
  );
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

  const getStatusIcon = (check: PreflightDetail) => {
    const streamingData = streamingChecks.get(check.check);
    const status = streamingData?.status || check.status;
    
    if (isStreaming && !streamingData && !check.status) {
      return <Loader className="h-4 w-4 animate-spin text-blue-500" />;
    }
    
    switch (status) {
      case 'pass':
      case 'ok':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail':
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return getCheckIcon(check.check);
    }
  };

  return (
    <Card className={hasFailures || hasTimeout ? "border-destructive/20 bg-destructive/5" : "border-green-500/20 bg-green-500/5"}>
      <CardHeader className="pb-3">
        <CardTitle className={`flex items-center gap-2 text-base ${hasFailures || hasTimeout ? 'text-destructive' : 'text-green-600'}`}>
          {isStreaming ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              Running Preflight Checks
            </>
          ) : hasTimeout ? (
            <>
              <AlertTriangle className="h-4 w-4" />
              Preflight Checks Stalled
            </>
          ) : hasFailures ? (
            <>
              <AlertTriangle className="h-4 w-4" />
              Preflight Checks Failed
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              Preflight Checks Passed
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasTimeout && (
          <p className="text-sm text-destructive">
            ⚠️ Checks stalled. Please try again.
          </p>
        )}
        
        {!preflightDone && !hasFailures && !hasTimeout && (
          <p className="text-sm text-muted-foreground">
            {isStreaming ? 'Checking system requirements...' : 'Preparing to run preflight checks...'}
          </p>
        )}
        
        {hasFailures && !hasTimeout && (
          <p className="text-sm text-muted-foreground">
            The following issues need to be resolved before the task can run:
          </p>
        )}
        
        {allChecks.length > 0 && (
          <div className="space-y-2">
            {allChecks.map((detail, index) => {
              const streamingData = streamingChecks.get(detail.check);
              const status = streamingData?.status || detail.status;
              const message = streamingData?.message || detail.message;
              
              return (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg border bg-background">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {getStatusIcon(detail)}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{getCheckTitle(detail.check)}</span>
                        {status && (
                          <Badge 
                            variant={status === 'pass' || status === 'ok' ? 'default' : getStatusColor(detail)} 
                            className="text-xs"
                          >
                            {status === 'pass' || status === 'ok' ? 'passed' : status?.replace(/_/g, ' ') || 'checking'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {message || formatCheckDetail(detail)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasFailures && onRetry && (
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
        )}
      </CardContent>
    </Card>
  );
}