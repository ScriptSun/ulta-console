import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, CheckCircle, XCircle, Clock, Play } from 'lucide-react';

interface TaskStatusCardProps {
  type: 'task_queued' | 'task_started' | 'task_succeeded' | 'task_failed';
  intent: string;
  runId?: string;
  batchId?: string;
  error?: string;
  duration?: number;
  onViewTask?: (runId: string) => void;
}

export const TaskStatusCard: React.FC<TaskStatusCardProps> = ({
  type,
  intent,
  runId,
  batchId,
  error,
  duration,
  onViewTask
}) => {
  const getStatusConfig = () => {
    switch (type) {
      case 'task_queued':
        return {
          icon: Clock,
          color: 'bg-blue-50 border-blue-200 text-blue-800',
          badgeColor: 'bg-blue-100 text-blue-800',
          title: 'Task Queued',
          description: `Your ${intent.replace('_', ' ')} task has been queued and will start shortly.`
        };
      case 'task_started':
        return {
          icon: Play,
          color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          badgeColor: 'bg-yellow-100 text-yellow-800',
          title: 'Task Running',
          description: `Your ${intent.replace('_', ' ')} task is now running.`
        };
      case 'task_succeeded':
        return {
          icon: CheckCircle,
          color: 'bg-green-50 border-green-200 text-green-800',
          badgeColor: 'bg-green-100 text-green-800',
          title: 'Task Completed',
          description: `Your ${intent.replace('_', ' ')} task completed successfully${duration ? ` in ${duration}s` : ''}.`
        };
      case 'task_failed':
        return {
          icon: XCircle,
          color: 'bg-red-50 border-red-200 text-red-800',
          badgeColor: 'bg-red-100 text-red-800',
          title: 'Task Failed',
          description: error || `Your ${intent.replace('_', ' ')} task encountered an error.`
        };
      default:
        return {
          icon: Clock,
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
          
          {runId && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onViewTask?.(runId)}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                View Details
              </Button>
              {runId && (
                <span className="text-xs opacity-60 font-mono">
                  ID: {runId.slice(0, 8)}...
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};