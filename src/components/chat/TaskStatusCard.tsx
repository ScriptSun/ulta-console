import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExternalLink, CheckCircle, XCircle, Clock, Play, BarChart3, AlertCircle, Brain, Search, Terminal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEventBus } from '@/hooks/useEventBus';
import { useToast } from '@/hooks/use-toast';

interface TaskStatusCardProps {
  type: 'task_queued' | 'task_started' | 'task_progress' | 'task_succeeded' | 'task_failed' | 'done' | 'input_error';
  intent: string;
  runId?: string;
  batchId?: string;
  summary?: string;
  progress?: number;
  contract?: any;
  error?: string;
  duration?: number;
  onViewTask?: (runId: string) => void;
  enableStreaming?: boolean; // New prop to enable streaming updates
}

export const TaskStatusCard: React.FC<TaskStatusCardProps> = ({
  type,
  intent,
  runId,
  batchId,
  summary,
  progress: initialProgress,
  contract,
  error,
  duration: initialDuration,
  onViewTask,
  enableStreaming = false
}) => {
  const navigate = useNavigate();
  const { onExec } = useEventBus();
  const { toast } = useToast();
  
  // Local state for streaming updates
  const [streamingProgress, setStreamingProgress] = useState(initialProgress || 0);
  const [streamingDuration, setStreamingDuration] = useState(initialDuration);
  const [streamingStatus, setStreamingStatus] = useState(type);
  const [stdoutLines, setStdoutLines] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [hasTimeout, setHasTimeout] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());

  // Listen to streaming events if enabled
  useEffect(() => {
    if (!enableStreaming || !runId) return;
    
    // Set timeout for exec (5 minutes idle)
    const resetTimeout = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        if (streamingStatus === 'task_started' || streamingStatus === 'task_progress') {
          setHasTimeout(true);
          setStreamingStatus('task_failed');
          toast({
            title: "Execution Timeout",
            description: "⚠️ Server stopped responding.",
            variant: "destructive"
          });
        }
      }, 300000); // 5 minutes
    };
    
    resetTimeout();
    
    const unsubscribe = onExec((eventType, data) => {
      if (data.run_id !== runId) return;
      
      lastActivityRef.current = Date.now();
      resetTimeout();
      
      switch (eventType) {
        case 'exec.started':
          setStreamingStatus('task_started');
          break;
          
        case 'exec.progress':
          setStreamingProgress(Math.min(100, Math.max(0, data.pct || 0)));
          setStreamingStatus('task_progress');
          break;
          
        case 'exec.stdout':
          setStdoutLines(prev => {
            const updated = [...prev, data.line];
            return updated.slice(-20); // Keep last 20 lines
          });
          break;
          
        case 'exec.finished':
          setStreamingStatus(data.success ? 'task_succeeded' : 'task_failed');
          setStreamingDuration(data.duration_ms);
          if (data.success) {
            setStreamingProgress(100);
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          break;
          
        case 'exec.error':
          setStreamingStatus('task_failed');
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          toast({
            title: "Execution Error",
            description: data.error || "An error occurred during execution.",
            variant: "destructive"
          });
          break;
          
        case 'exec.timeout':
          setHasTimeout(true);
          setStreamingStatus('task_failed');
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          toast({
            title: "Execution Timeout",
            description: "⚠️ Server stopped responding.",
            variant: "destructive"
          });
          break;
      }
    });
    
    return () => {
      unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onExec, runId, enableStreaming, streamingStatus, toast]);

  // Use streaming values if available, otherwise use props
  const currentProgress = enableStreaming ? streamingProgress : (initialProgress || 0);
  const currentDuration = enableStreaming ? streamingDuration : initialDuration;
  const currentType = enableStreaming ? streamingStatus : type;

  const handleViewDetails = () => {
    if (onViewTask && runId) {
      onViewTask(runId);
    } else if (runId) {
      // Navigate to batch run details page
      navigate(`/scripts/batches/runs/${runId}`);
    } else if (batchId) {
      // Navigate to batch details page  
      navigate(`/scripts/batches/${batchId}`);
    }
  };
  const getStatusConfig = () => {
    switch (currentType) {
      case 'task_queued':
        return {
          icon: Clock,
          color: 'bg-blue-50 border-blue-200 text-blue-800',
          badgeColor: 'bg-blue-100 text-blue-800',
          title: 'Task Queued',
          description: summary || `Your ${intent.replace('_', ' ')} task has been queued and will start shortly.`
        };
      case 'task_started':
        return {
          icon: Play,
          color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          badgeColor: 'bg-yellow-100 text-yellow-800',
          title: 'Working on server',
          description: summary || `Your ${intent.replace('_', ' ')} task is now running.`
        };
      case 'task_progress':
        return {
          icon: BarChart3,
          color: 'bg-orange-50 border-orange-200 text-orange-800',
          badgeColor: 'bg-orange-100 text-orange-800',
          title: `Progress ${currentProgress}%`,
          description: summary || `Your ${intent.replace('_', ' ')} task is in progress.`
        };
      case 'task_succeeded':
        return {
          icon: CheckCircle,
          color: 'bg-green-50 border-green-200 text-green-800',
          badgeColor: 'bg-green-100 text-green-800',
          title: 'Task Completed',
          description: contract?.message || summary || `Your ${intent.replace('_', ' ')} task completed successfully${currentDuration ? ` in ${Math.round(currentDuration / 1000)}s` : ''}.`
        };
      case 'task_failed':
        return {
          icon: XCircle,
          color: 'bg-red-50 border-red-200 text-red-800',
          badgeColor: 'bg-red-100 text-red-800',
          title: 'Task Failed',
          description: error || summary || `Your ${intent.replace('_', ' ')} task encountered an error.`
        };
      case 'done':
        return {
          icon: CheckCircle,
          color: 'bg-green-50 border-green-200 text-green-800',
          badgeColor: 'bg-green-100 text-green-800',
          title: 'Done',
          description: 'Task workflow completed'
        };
      case 'input_error':
        return {
          icon: AlertCircle,
          color: 'bg-orange-50 border-orange-200 text-orange-800',
          badgeColor: 'bg-orange-100 text-orange-800',
          title: 'Input Error',
          description: error || summary || 'Please correct the input errors and try again.'
        };
      default:
        return {
          icon: AlertCircle,
          color: 'bg-muted border-muted text-muted-foreground',
          badgeColor: 'bg-muted text-muted-foreground',
          title: 'Task Status',
          description: 'Task status update'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  // For successful tasks, show compact indicator
  if (currentType === 'task_succeeded' || currentType === 'done') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium">
        <CheckCircle className="w-4 h-4" />
        <span>Success</span>
        {currentDuration && (
          <Badge variant="outline" className="text-xs">
            {Math.round(currentDuration / 1000)}s
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={`p-4 ${config.color} border-l-4`}>
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm">{config.title}</h4>
            <Badge className={`text-xs ${config.badgeColor}`}>
              {intent.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-sm opacity-90 mb-3">{config.description}</p>

          {/* Progress bar for in-progress tasks */}
          {(currentType === 'task_progress' || currentType === 'task_started') && (
            <div className="mb-3">
              <div className="w-full bg-muted/30 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, Math.max(0, currentProgress))}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Progress</span>
                <span>{currentProgress}%</span>
              </div>
            </div>
          )}

          {/* Live stdout logs */}
          {enableStreaming && stdoutLines.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium flex items-center gap-1">
                  <Terminal className="h-3 w-3" />
                  Live Output
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLogs(!showLogs)}
                  className="h-5 text-xs"
                >
                  {showLogs ? 'Hide' : 'Show'}
                </Button>
              </div>
              {showLogs && (
                <ScrollArea className="h-20 w-full rounded border bg-background p-2">
                  <div className="font-mono text-xs space-y-0.5">
                    {stdoutLines.map((line, index) => (
                      <div key={`${index}-${line.substring(0, 10)}`} className="text-foreground/80">
                        {line}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {(runId || batchId) && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleViewDetails}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                View Details
              </Button>
              <span className="text-xs opacity-60 font-mono">
                ID: {(runId || batchId)?.slice(0, 8)}...
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};