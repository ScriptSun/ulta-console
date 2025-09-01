import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Clock, Send, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

interface ApiLog {
  id: string;
  timestamp: string;
  type: 'request' | 'response' | 'error' | 'router_request' | 'router_response' | 'router_token';
  data: any;
  userMessage?: string;
}

interface ApiLogsViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logs: ApiLog[];
}

export const ApiLogsViewer: React.FC<ApiLogsViewerProps> = ({
  open,
  onOpenChange,
  logs
}) => {
  const copyToClipboard = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success('Copied to clipboard');
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'request':
        return <Send className="h-4 w-4" />;
      case 'response':
        return <ArrowDown className="h-4 w-4" />;
      case 'router_request':
        return <Send className="h-4 w-4 text-blue-500" />;
      case 'router_response':
        return <ArrowDown className="h-4 w-4 text-blue-500" />;
      case 'router_token':
        return <span className="text-blue-500">🔄</span>;
      case 'error':
        return <span className="text-destructive">❌</span>;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'request':
        return 'outline' as const;
      case 'response':
        return 'default' as const;
      case 'router_request':
        return 'outline' as const;
      case 'router_response':
        return 'default' as const;
      case 'router_token':
        return 'secondary' as const;
      case 'error':
        return 'destructive' as const;
      default:
        return 'secondary' as const;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Router Final Responses ({logs.filter(log => log.type === 'router_response').length})
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[600px] w-full">
          <div className="space-y-4">
            {logs.filter(log => log.type === 'router_response').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No router responses yet. Send a message to see the final responses.
              </div>
            ) : (
              logs
                .filter(log => log.type === 'router_response')
                .map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(log.type)}
                      <Badge variant={getTypeBadgeVariant(log.type)}>
                        FINAL RESPONSE
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(log.data)}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {log.userMessage && (
                    <div className="text-sm bg-muted p-2 rounded">
                      <strong>User Message:</strong> {log.userMessage}
                    </div>
                  )}
                  
                  <div className="bg-muted/50 p-3 rounded overflow-hidden">
                    <pre className="text-xs whitespace-pre-wrap break-all">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};