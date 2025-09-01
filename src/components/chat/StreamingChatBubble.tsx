import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Brain, Search, CheckCircle } from 'lucide-react';

interface StreamingChatBubbleProps {
  content: string;
  pending?: boolean;
  routerPhase?: string;
  candidateCount?: number;
  onCopy?: (content: string) => void;
  timestamp?: Date;
}

export const StreamingChatBubble: React.FC<StreamingChatBubbleProps> = ({
  content,
  pending = false,
  routerPhase,
  candidateCount,
  onCopy,
  timestamp
}) => {
  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'Thinking':
        return <Brain className="w-4 h-4 text-blue-500 animate-pulse" aria-hidden="true" />;
      case 'Analyzing server':
        return <Search className="w-4 h-4 text-orange-500 animate-pulse" aria-hidden="true" />;
      case 'Selecting installer':
        return <CheckCircle className="w-4 h-4 text-green-500 animate-pulse" aria-hidden="true" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex justify-start group">
      <div className="bg-muted rounded-lg p-3 max-w-[70%] break-words">
        {/* Status Phase Display */}
        {pending && routerPhase && (
          <div 
            className="flex items-center gap-2 mb-2 text-sm text-muted-foreground"
            role="status" 
            aria-live="polite"
            aria-label={`Status: ${routerPhase}`}
          >
            {getPhaseIcon(routerPhase)}
            <span className="font-medium">
              {routerPhase}
              {routerPhase === 'Selecting installer' && '...'}
            </span>
            {candidateCount > 0 && routerPhase === 'Analyzing server' && (
              <Badge variant="outline" className="text-xs" aria-label={`${candidateCount} matches found`}>
                {candidateCount} matches
              </Badge>
            )}
          </div>
        )}

        {/* Content */}
        {content && (
          <div className="text-sm">
            {content}
            {pending && (
              <span className="inline-block w-2 h-4 bg-foreground/50 ml-1 animate-pulse" />
            )}
          </div>
        )}

        {/* Fallback typing animation when no content yet */}
        {!content && pending && !routerPhase && (
          <div className="flex gap-1" aria-label="Processing...">
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-2">
          {timestamp && (
            <span className="text-xs opacity-70">
              {timestamp.toLocaleTimeString()}
            </span>
          )}
          {content && onCopy && (
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 h-5 w-5 p-0"
              onClick={() => onCopy(content)}
              aria-label="Copy message"
            >
              <Copy className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};