import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, CheckCircle, XCircle, Clock, Play, BarChart3, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TaskStatusCardProps {
  type: 'task_queued' | 'task_started' | 'task_progress' | 'task_succeeded' | 'task_failed' | 'done';
  intent: string;
  runId?: string;
  batchId?: string;
  summary?: string;
  progress?: number;
  contract?: any;
  error?: string;
  duration?: number;
  onViewTask?: (runId: string) => void;
}

export const TaskStatusCard: React.FC<TaskStatusCardProps> = ({
  type,
  intent,
  runId,
  batchId,
  summary,
  progress,
  contract,
  error,
  duration,
  onViewTask
}) => {
  const navigate = useNavigate();

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
    switch (type) {
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
          title: 'Task Running',
          description: summary || `Your ${intent.replace('_', ' ')} task is now running.`
        };
      case 'task_progress':
        return {
          icon: BarChart3,
          color: 'bg-orange-50 border-orange-200 text-orange-800',
          badgeColor: 'bg-orange-100 text-orange-800',
          title: `Progress ${progress || 0}%`,
          description: summary || `Your ${intent.replace('_', ' ')} task is in progress.`
        };
      case 'task_succeeded':
        return {
          icon: CheckCircle,
          color: 'bg-green-50 border-green-200 text-green-800',
          badgeColor: 'bg-green-100 text-green-800',
          title: 'Task Completed',
          description: contract?.message || summary || `Your ${intent.replace('_', ' ')} task completed successfully${duration ? ` in ${duration}s` : ''}.`
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
      default:
        return {
          icon: AlertCircle,
          color: 'bg-gray-50 border-gray-200 text-gray-800',
          badgeColor: 'bg-gray-100 text-gray-800',
          title: 'Task Status',
          description: 'Task status update'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

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
          {type === 'task_progress' && typeof progress === 'number' && (
            <div className="mb-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
            </div>
          )}

          {/* Contract details for successful tasks */}
          {type === 'task_succeeded' && contract && (
            <div className="mb-3 p-2 bg-white/50 rounded text-xs">
              {contract.metrics && (
                <div className="flex gap-4">
                  {contract.metrics.duration_sec && (
                    <span>Duration: {contract.metrics.duration_sec}s</span>
                  )}
                  {contract.status && (
                    <span>Status: {contract.status}</span>
                  )}
                </div>
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