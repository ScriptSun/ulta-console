import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Terminal, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { useEventBus } from '@/hooks/useEventBus';
import { useNavigate } from 'react-router-dom';
import { TaskDetailsDialog } from './TaskDetailsDialog';

interface ExecutionStatusCardProps {
  run_id: string;
  onComplete?: (success: boolean) => void;
}

export function ExecutionStatusCard({ run_id, onComplete }: ExecutionStatusCardProps) {
  const { on } = useEventBus();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<'queued' | 'running' | 'completed' | 'failed'>('queued');
  const [progress, setProgress] = useState(0);
  const [stdoutLines, setStdoutLines] = useState<string[]>([]);
  const [duration, setDuration] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribers = [
      on('exec.queued', (data) => {
        if (data.run_id === run_id) {
          console.log('Execution queued:', data);
          setStatus('queued');
          setProgress(0);
        }
      }),
      
      on('exec.started', (data) => {
        if (data.run_id === run_id) {
          console.log('Execution started:', data);
          setStatus('running');
          setStartedAt(data.started_at);
          setProgress(0);
        }
      }),
      
      on('exec.progress', (data) => {
        if (data.run_id === run_id) {
          console.log('Execution progress:', data);
          setProgress(Math.min(100, Math.max(0, data.pct || 0)));
        }
      }),
      
      on('exec.stdout', (data) => {
        if (data.run_id === run_id) {
          console.log('Execution stdout:', data.line);
          setStdoutLines(prev => {
            const updated = [...prev, data.line];
            // Keep only last 20 lines for performance
            return updated.slice(-20);
          });
          // Auto-show logs when stdout comes in
          if (!showLogs) {
            setShowLogs(true);
          }
        }
      }),
      
      on('exec.finished', (data) => {
        if (data.run_id === run_id) {
          console.log('Execution finished:', data);
          setStatus(data.success ? 'completed' : 'failed');
          setDuration(data.duration_ms);
          if (data.success) {
            setProgress(100);
          }
          onComplete?.(data.success);
        }
      }),
      
      on('exec.error', (data) => {
        console.error('Execution error:', data);
        setStatus('failed');
        onComplete?.(false);
      })
    ];
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [on, run_id, onComplete, showLogs]);

  // Auto-scroll to bottom when new stdout lines are added
  useEffect(() => {
    if (scrollAreaRef.current && showLogs) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [stdoutLines, showLogs]);

  const getStatusIcon = () => {
    switch (status) {
      case 'queued':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'running':
        return <Play className="h-4 w-4 text-orange-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'queued':
        return 'Task Queued';
      case 'running':
        return 'Working on server';
      case 'completed':
        return 'Task Completed';
      case 'failed':
        return 'Task Failed';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'queued':
        return 'border-blue-500/20 bg-blue-500/5';
      case 'running':
        return 'border-orange-500/20 bg-orange-500/5';
      case 'completed':
        return 'border-green-500/20 bg-green-500/5';
      case 'failed':
        return 'border-red-500/20 bg-red-500/5';
    }
  };

  return (
    <Card className={getStatusColor()}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            {getStatusText()}
            {duration && (
              <Badge variant="outline" className="text-xs">
                {Math.round(duration / 1000)}s
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {stdoutLines.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLogs(!showLogs)}
                className="h-7 px-2"
              >
                <Terminal className="h-3 w-3 mr-1" />
                Logs
                {showLogs ? 
                  <ChevronUp className="h-3 w-3 ml-1" /> : 
                  <ChevronDown className="h-3 w-3 ml-1" />
                }
              </Button>
            )}
            
            <TaskDetailsDialog 
              runId={run_id} 
              title={getStatusText()}
              status={status}
            >
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
              >
                <Info className="h-3 w-3 mr-1" />
                Details
              </Button>
            </TaskDetailsDialog>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {status === 'running' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Progress</span>
              <span className="text-sm font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2 transition-all duration-500" />
          </div>
        )}

        {showLogs && stdoutLines.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Live Output
            </h4>
            <ScrollArea ref={scrollAreaRef} className="h-32 w-full rounded border bg-background p-2">
              <div className="font-mono text-xs space-y-0.5" style={{ scrollBehavior: 'smooth' }}>
                {stdoutLines.map((line, index) => (
                  <div key={`${index}-${line.substring(0, 10)}`} className="text-foreground/80">
                    {line}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {status === 'queued' && (
          <p className="text-sm text-muted-foreground">
            Task has been queued and will start shortly...
          </p>
        )}
        
        {status === 'running' && (
          <p className="text-sm text-muted-foreground">
            Executing on the server. This may take a few minutes...
          </p>
        )}
        
        {status === 'completed' && (
          <p className="text-sm text-green-600">
            ✅ Task completed successfully!
          </p>
        )}
        
        {status === 'failed' && (
          <p className="text-sm text-red-600">
            ❌ Task failed. Check the logs for details.
          </p>
        )}
        
        <div className="text-xs text-muted-foreground font-mono">
          Run ID: {run_id.slice(0, 8)}...
        </div>
      </CardContent>
    </Card>
  );
}