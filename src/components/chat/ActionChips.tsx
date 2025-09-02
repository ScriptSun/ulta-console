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
          className: 'bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 border-indigo-200/50 animate-fade-in shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300'
        };
      case 'analyzing':
        return {
          icon: Search,
          text: i18n.phases.analyzing,
          className: 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border-amber-200/50 animate-scale-in shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300'
        };
      case 'ready':
        return {
          icon: CheckCircle,
          text: i18n.phases.ready,
          className: 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border-emerald-200/50 animate-fade-in shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300'
        };
      case 'working':
        return {
          icon: Cog,
          text: i18n.phases.working,
          className: 'bg-gradient-to-r from-violet-50 to-purple-50 text-violet-700 border-violet-200/50 animate-[spin_2s_linear_infinite] shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300'
        };
      case 'completed':
        return {
          icon: CheckCircle2,
          text: i18n.phases.done,
          className: 'bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-700 border-teal-200/50 animate-scale-in shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300'
        };
      case 'failed':
        return {
          icon: AlertCircle,
          text: i18n.phases.failed,
          className: 'bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 border-rose-200/50 animate-fade-in shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300'
        };
      default:
        return {
          icon: Brain,
          text: 'Processing',
          className: 'bg-gradient-to-r from-slate-50 to-gray-50 text-slate-700 border-slate-200/50 animate-pulse shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300'
        };
    }
  };

  const config = getChipConfig(phase);
  const IconComponent = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-full transform ${config.className} ${className}`}
    >
      <IconComponent className={`h-3.5 w-3.5 ${phase === 'working' ? 'animate-spin' : ''}`} />
      {config.text}
    </Badge>
  );
}