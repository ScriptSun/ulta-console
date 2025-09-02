import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Brain, Search, CheckCircle, Code } from 'lucide-react';
import { RouterPhases } from '@/lib/i18n';

interface StreamingChatBubbleProps {
  content: string;
  pending?: boolean;
  routerPhase?: string;
  candidateCount?: number;
  onCopy?: (content: string) => void;
  timestamp?: Date;
  rawResponse?: string; // Raw API response for debugging
}

export const StreamingChatBubble: React.FC<StreamingChatBubbleProps> = ({
  content,
  pending = false,
  routerPhase,
  candidateCount,
  onCopy,
  timestamp,
  rawResponse
}) => {
  const [showRawResponse, setShowRawResponse] = useState(false);
  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case RouterPhases.THINKING:
        return <Brain className="w-4 h-4 text-blue-500 animate-pulse" aria-hidden="true" />;
      case RouterPhases.ANALYZING:
        return <Search className="w-4 h-4 text-orange-500 animate-pulse" aria-hidden="true" />;
      case RouterPhases.SELECTING:
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
              {routerPhase === RouterPhases.SELECTING && '...'}
            </span>
            {candidateCount > 0 && routerPhase === RouterPhases.ANALYZING && (
              <Badge variant="outline" className="text-xs" aria-label={`${candidateCount} matches found`}>
                {candidateCount} matches
              </Badge>
            )}
          </div>
        )}

        {/* Content */}
        {content && (
          <ScrollArea className="w-full max-h-32">
            <div className="text-sm whitespace-pre-wrap font-mono">
              {content}
              {pending && (
                <span className="inline-block w-2 h-4 bg-foreground/50 ml-1 animate-pulse" />
              )}
            </div>
          </ScrollArea>
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
          <div className="flex items-center gap-1">
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
            {rawResponse && (
              <Dialog open={showRawResponse} onOpenChange={setShowRawResponse}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"  
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 h-5 w-5 p-0"
                    aria-label="View raw API response"
                  >
                    <Code className="w-3 h-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
                  <DialogHeader>
                    <DialogTitle>Raw API Response</DialogTitle>
                  </DialogHeader>
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-[60vh] whitespace-pre-wrap">
                      {rawResponse}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => navigator.clipboard.writeText(rawResponse)}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};