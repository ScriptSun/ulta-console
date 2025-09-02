import React from 'react';
import { Badge } from '@/components/ui/badge';
import { i18n } from '@/lib/i18n';
import { Brain, Search, CheckCircle, Cog, AlertCircle, CheckCircle2 } from 'lucide-react';

type ChipPhase = 
  | 'planning'
  | 'analyzing'
  | 'ready'
  | 'working'
  | 'completed'
  | 'failed';

interface ActionChipsProps {
  phase: ChipPhase;
  className?: string;
}

export function ActionChips({ phase, className = "" }: ActionChipsProps) {
  const getChipConfig = (phase: ChipPhase) => {
    switch (phase) {
      case 'planning':
        return {
          icon: Brain,
          text: i18n.phases.planning,
          className: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse'
        };
      case 'analyzing':
        return {
          icon: Search,
          text: i18n.phases.analyzing,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200 animate-pulse'
        };
      case 'ready':
        return {
          icon: CheckCircle,
          text: i18n.phases.ready,
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'working':
        return {
          icon: Cog,
          text: i18n.phases.working,
          className: 'bg-purple-100 text-purple-800 border-purple-200 animate-pulse'
        };
      case 'completed':
        return {
          icon: CheckCircle2,
          text: i18n.phases.done,
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'failed':
        return {
          icon: AlertCircle,
          text: i18n.phases.failed,
          className: 'bg-red-100 text-red-800 border-red-200'
        };
      default:
        return {
          icon: Brain,
          text: 'Processing',
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  };

  const config = getChipConfig(phase);
  const IconComponent = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium ${config.className} ${className}`}
    >
      <IconComponent className="h-3 w-3" />
      {config.text}
    </Badge>
  );
}