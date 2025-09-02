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
  systemPrompt?: string;
  apiEndpoint?: string;
  openaiRequest?: any;
  openaiResponse?: any;
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

                  {/* OpenAI API Details */}
                  {log.apiEndpoint && (
                    <div className="text-sm bg-blue-50 dark:bg-blue-900/20 p-3 rounded border">
                      <div className="font-medium text-blue-800 dark:text-blue-200 mb-2">📡 OpenAI API Request</div>
                      <div className="space-y-2 text-xs">
                        <div><strong>Endpoint:</strong> <code className="bg-blue-100 dark:bg-blue-800/30 px-1 rounded">{log.apiEndpoint}</code></div>
                        {log.openaiRequest && (
                          <div>
                            <strong>Model:</strong> <span className="font-mono">{log.openaiRequest.model}</span>
                            {log.openaiRequest.max_completion_tokens && <span className="ml-2 text-muted-foreground">({log.openaiRequest.max_completion_tokens} tokens)</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                   {/* System Prompt */}
                  {log.systemPrompt && (
                    <div className="text-sm bg-amber-50 dark:bg-amber-900/20 p-3 rounded border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-amber-800 dark:text-amber-200">
                          📋 System Prompt ({log.systemPrompt.length} chars) - LIVE FROM DATABASE
                        </span>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-xs">
                            Updated: {new Date().toLocaleTimeString()}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(log.systemPrompt)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <pre className="text-xs whitespace-pre-wrap break-words bg-amber-100 dark:bg-amber-800/30 p-2 rounded font-mono max-h-40 overflow-y-auto">
                        {log.systemPrompt}
                      </pre>
                    </div>
                  )}

                  {/* OpenAI Response Metadata */}
                  {log.openaiResponse && (
                    <div className="text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded border">
                      <div className="font-medium text-green-800 dark:text-green-200 mb-2">🤖 OpenAI Response Metadata</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><strong>Model:</strong> {log.openaiResponse.model}</div>
                        <div><strong>Finish Reason:</strong> {log.openaiResponse.finish_reason}</div>
                        {log.openaiResponse.usage && (
                          <>
                            <div><strong>Prompt Tokens:</strong> {log.openaiResponse.usage.prompt_tokens}</div>
                            <div><strong>Completion Tokens:</strong> {log.openaiResponse.usage.completion_tokens}</div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-muted/50 p-3 rounded overflow-hidden">
                    <pre className="text-xs whitespace-pre-wrap break-all font-mono">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                    
                    {/* Highlight key missing fields for ai_draft_action */}
                    {log.data.mode === 'ai_draft_action' && (
                      <div className="mt-3 pt-3 border-t border-muted-foreground/20">
                        <div className="text-xs font-medium text-muted-foreground mb-2">AI Draft Action Analysis:</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className={`p-1 rounded ${log.data.task ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            Task: {log.data.task ? '✓' : '✗ Missing'}
                          </div>
                          <div className={`p-1 rounded ${log.data.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            Status: {log.data.status ? '✓' : '✗ Missing'}
                          </div>
                          <div className={`p-1 rounded ${log.data.risk ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            Risk: {log.data.risk ? '✓' : '✗ Missing'}
                          </div>
                          <div className={`p-1 rounded ${log.data.suggested ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            Suggested: {log.data.suggested ? '✓' : '✗ Missing'}
                          </div>
                          <div className={`p-1 rounded ${log.data.notes ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            Notes: {log.data.notes ? '✓' : '○ Optional'}
                          </div>
                          <div className={`p-1 rounded ${log.data.human ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            Human: {log.data.human ? '✓' : '○ Optional'}
                          </div>
                        </div>
                        {log.data.suggested && (
                          <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                            <strong>Suggested Type:</strong> {log.data.suggested.kind || 'Not specified'}
                            {log.data.suggested.kind === 'command' && log.data.suggested.command && (
                              <div><strong>Command:</strong> {log.data.suggested.command}</div>
                            )}
                            {log.data.suggested.kind === 'batch_script' && log.data.suggested.commands && (
                              <div><strong>Commands:</strong> {log.data.suggested.commands.length} steps</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
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