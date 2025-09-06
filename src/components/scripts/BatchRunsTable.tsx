import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Eye, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  StopCircle,
  Play,
  Download
} from 'lucide-react';
import { api } from '@/lib/api-wrapper';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface BatchRun {
  id: string;
  batch_id: string;
  agent_id: string;
  status: 'queued' | 'running' | 'success' | 'failed' | 'canceled' | 'timeout';
  started_at?: string;
  finished_at?: string;
  duration_sec?: number;
  contract?: {
    status: 'ok' | 'error' | 'partial';
    message: string;
    metrics?: Record<string, any>;
  };
  raw_stdout?: string;
  raw_stderr?: string;
  parser_warning?: boolean;
  created_at: string;
  agent?: {
    id: string;
    hostname?: string;
  };
  contract_status?: string;
  contract_message?: string;
  contract_metrics?: Record<string, any>;
}

interface BatchRunsTableProps {
  batchId: string;
  onViewRun: (run: BatchRun) => void;
}

const statusIcons = {
  queued: Clock,
  running: Play,
  success: CheckCircle2,
  failed: XCircle,
  canceled: StopCircle,
  timeout: AlertCircle
};

const statusColors = {
  queued: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  running: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  success: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
  failed: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
  canceled: 'bg-muted/50 text-muted-foreground border-muted hover:bg-muted/70',
  timeout: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
};

const contractStatusColors = {
  ok: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
  partial: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
};

export function BatchRunsTable({ batchId, onViewRun }: BatchRunsTableProps) {
  const [runs, setRuns] = useState<BatchRun[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (batchId) {
      loadRuns();
    }
  }, [batchId]);

  const loadRuns = async () => {
    setLoading(true);
    try {
      const response = await api.invokeFunction(`script-batches/${batchId}/runs`, {
        limit: 50
      });

      if (response.error) {
        throw new Error(response.error || 'Failed to load runs');
      }

      setRuns(response.data?.runs || []);
    } catch (error) {
      console.error('Error loading runs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load batch runs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (durationSec?: number) => {
    if (!durationSec) return '-';
    
    if (durationSec < 60) {
      return `${durationSec}s`;
    } else if (durationSec < 3600) {
      const minutes = Math.floor(durationSec / 60);
      const seconds = durationSec % 60;
      return `${minutes}m ${seconds}s`;
    } else {
      const hours = Math.floor(durationSec / 3600);
      const minutes = Math.floor((durationSec % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent Runs</h3>
        </div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Recent Runs</h3>
        <Button variant="outline" size="sm" onClick={loadRuns}>
          Refresh
        </Button>
      </div>

      {runs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Play className="h-8 w-8 mx-auto mb-2" />
          <p>No runs yet</p>
          <p className="text-sm">Runs will appear here after execution</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => {
                const StatusIcon = statusIcons[run.status];
                return (
                  <TableRow key={run.id}>
                    <TableCell>
                      <div className="font-medium">
                        {run.agent?.hostname || run.agent_id.slice(0, 8)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", statusColors[run.status])}
                      >
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {run.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {run.started_at ? formatTimestamp(run.started_at) : '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-mono">
                        {formatDuration(run.duration_sec)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {run.contract_status ? (
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", contractStatusColors[run.contract_status as keyof typeof contractStatusColors])}
                        >
                          {run.contract_status}
                        </Badge>
                      ) : run.parser_warning ? (
                        <Badge variant="outline" className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30">
                          Parse Error
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewRun(run)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}