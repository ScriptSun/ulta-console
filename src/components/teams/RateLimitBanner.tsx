import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Clock } from 'lucide-react';

interface RateLimitBannerProps {
  limitType: 'invites' | 'role_changes';
  retryAfterSeconds: number;
  onDismiss?: () => void;
}

export function RateLimitBanner({ limitType, retryAfterSeconds, onDismiss }: RateLimitBannerProps) {
  const formatRetryAfter = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds} seconds`;
    } else if (seconds < 3600) {
      return `${Math.ceil(seconds / 60)} minutes`;
    } else {
      return `${Math.ceil(seconds / 3600)} hours`;
    }
  };

  const getLimitDescription = () => {
    switch (limitType) {
      case 'invites':
        return 'You have reached the maximum number of invites allowed per hour (10).';
      case 'role_changes':
        return 'You have reached the maximum number of role changes allowed per day (10).';
      default:
        return 'Rate limit exceeded.';
    }
  };

  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-orange-800">
            {getLimitDescription()}
          </span>
          <div className="flex items-center gap-1 text-sm text-orange-600">
            <Clock className="h-3 w-3" />
            Try again in {formatRetryAfter(retryAfterSeconds)}
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-orange-600 hover:text-orange-800 text-sm font-medium"
          >
            Dismiss
          </button>
        )}
      </AlertDescription>
    </Alert>
  );
}