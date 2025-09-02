import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Clock, Send, ArrowDown, Terminal, BookOpen, Activity, AlertTriangle, Download } from 'lucide-react';
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
  const downloadAsText = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const content = logs.map(log => {
      const time = new Date(log.timestamp).toLocaleString();
      return `[${time}] ${log.type.toUpperCase()}\n${JSON.stringify(log.data, null, 2)}\n${'='.repeat(80)}`;
    }).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-logs-${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded API logs as text file');
  };

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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              API Debug Logs & Phase Analysis ({logs.length} total logs)
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadAsText}
              className="flex items-center gap-2"
              disabled={logs.length === 0}
            >
              <Download className="h-4 w-4" />
              Download as TXT
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-1">
            {/* Phase Analysis Section */}
            {logs.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-3 text-purple-600 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Phase Timeline & Performance Analysis
                </h3>
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 rounded-lg p-4 space-y-3">
                  {(() => {
                    const phases = [];
                    let startTime = null;
                    let currentPhase = null;
                    let phaseActions = [];
                    
                    logs.forEach((log, index) => {
                      const logTime = new Date(log.timestamp);
                      
                      if (log.type === 'router_request') {
                        startTime = logTime;
                        currentPhase = {
                          name: 'PLANNING',
                          description: 'Initializing request and preparing for analysis',
                          startTime: logTime,
                          actions: [`🚀 Started processing: "${log.userMessage}"`],
                          details: log.data,
                          apiCalls: []
                        };
                        phaseActions = [];
                      } else if (log.type === 'router_token' && currentPhase) {
                        if (currentPhase.name === 'PLANNING') {
                          currentPhase.name = 'ANALYZING';
                          currentPhase.description = 'AI analyzing request and generating response tokens';
                          currentPhase.actions.push('🧠 AI processing started');
                          currentPhase.apiCalls.push({
                            type: 'OpenAI Streaming',
                            startTime: logTime
                          });
                        }
                        phaseActions.push(`💭 Token: "${(log.data.delta || log.data.accumulated || '').substring(0, 50)}${(log.data.accumulated?.length > 50) ? '...' : ''}"`);
                      } else if (log.type === 'router_response' && currentPhase) {
                        if (phaseActions.length > 0) {
                          currentPhase.actions.push(...phaseActions);
                        }
                        currentPhase.endTime = logTime;
                        currentPhase.duration = logTime.getTime() - currentPhase.startTime.getTime();
                        currentPhase.actions.push(`✅ Decision: ${log.data.mode} mode${log.data.task ? ` (${log.data.task})` : ''}`);
                        
                        if (log.openaiRequest || log.openaiResponse) {
                          currentPhase.apiCalls.push({
                            type: 'OpenAI API',
                            endpoint: log.apiEndpoint,
                            model: log.openaiRequest?.model,
                            tokens: log.openaiResponse?.usage,
                            finishReason: log.openaiResponse?.finish_reason
                          });
                          
                          if (log.openaiResponse?.usage) {
                            const usage = log.openaiResponse.usage;
                            currentPhase.actions.push(`📊 API Usage: ${usage.prompt_tokens || 0}+${usage.completion_tokens || 0}=${usage.total_tokens || 0} tokens`);
                            if (usage.completion_tokens_details?.reasoning_tokens) {
                              currentPhase.actions.push(`🧮 Reasoning: ${usage.completion_tokens_details.reasoning_tokens} tokens`);
                            }
                            if (usage.prompt_tokens_details?.cached_tokens) {
                              currentPhase.actions.push(`💾 Cached: ${usage.prompt_tokens_details.cached_tokens} tokens`);
                            }
                          }
                        }
                        
                        phases.push(currentPhase);
                        currentPhase = null;
                        phaseActions = [];
                      }
                    });
                    
                    // Add incomplete phase if exists
                    if (currentPhase) {
                      if (phaseActions.length > 0) {
                        currentPhase.actions.push(...phaseActions);
                      }
                      currentPhase.endTime = new Date();
                      currentPhase.duration = currentPhase.endTime.getTime() - currentPhase.startTime.getTime();
                      phases.push(currentPhase);
                    }
                    
                    const totalDuration = phases.reduce((sum, phase) => sum + (phase.duration || 0), 0);
                    
                    return (
                      <>
                        {/* Total Performance Summary */}
                        <div className="bg-white border border-purple-300 rounded-lg p-4 mb-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-purple-800">Overall Performance Summary</h4>
                            <span className="text-lg font-bold text-purple-700">
                              {Math.round(totalDuration)}ms total
                            </span>
                          </div>
                          <div className="mt-2 text-sm text-gray-600">
                            {phases.length} phases • {logs.length} API events • Average: {phases.length > 0 ? Math.round(totalDuration / phases.length) : 0}ms per phase
                          </div>
                          {totalDuration > 5000 && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                              <div>
                                <span className="text-red-600 font-medium">Performance Alert:</span>
                                <span className="text-red-700 ml-1">Total processing time exceeds 5 seconds, which may impact user experience</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Phase Details */}
                        {phases.map((phase, index) => (
                          <div key={index} className="bg-white border border-purple-300 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  phase.name === 'PLANNING' ? 'bg-blue-100 text-blue-800' :
                                  phase.name === 'ANALYZING' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {phase.name}
                                </span>
                                <span className="text-sm text-gray-600">{phase.description}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`text-sm font-mono px-2 py-1 rounded ${
                                  phase.duration && phase.duration > 3000 ? 'bg-red-100 text-red-700' :
                                  phase.duration && phase.duration > 1000 ? 'bg-orange-100 text-orange-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {phase.duration ? `${Math.round(phase.duration)}ms` : 'In Progress...'}
                                </span>
                                 {phase.duration && phase.duration > 1000 && (
                                   <AlertTriangle className="w-4 h-4 text-orange-500" />
                                 )}
                              </div>
                            </div>
                            
                            {/* API Calls Summary */}
                            {phase.apiCalls && phase.apiCalls.length > 0 && (
                              <div className="mb-3 p-2 bg-indigo-50 border border-indigo-200 rounded">
                                <h5 className="text-sm font-medium text-indigo-800 mb-2">🔗 API Calls in this Phase:</h5>
                                {phase.apiCalls.map((apiCall, callIndex) => (
                                  <div key={callIndex} className="text-xs text-indigo-700 mb-1">
                                    • <strong>{apiCall.type}</strong>
                                    {apiCall.model && <span className="ml-2">Model: {apiCall.model}</span>}
                                    {apiCall.tokens && (
                                      <span className="ml-2">
                                        ({apiCall.tokens.prompt_tokens}+{apiCall.tokens.completion_tokens}={apiCall.tokens.total_tokens} tokens)
                                      </span>
                                    )}
                                    {apiCall.finishReason && <span className="ml-2">Finish: {apiCall.finishReason}</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Detailed Actions */}
                            <div className="space-y-1">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">📋 Detailed Actions:</h5>
                              {phase.actions.map((action, actionIndex) => (
                                <div key={actionIndex} className="text-sm text-gray-700 flex items-start gap-2 pl-2">
                                  <span className="text-purple-500 mt-1">•</span>
                                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded flex-1">{action}</span>
                                </div>
                              ))}
                            </div>
                            
                            {/* Performance Warning */}
                            {phase.duration && phase.duration > 3000 && (
                              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <div>
                                  <span className="text-red-600 font-medium">🚨 Critical Delay Detected:</span>
                                  <div className="text-red-700 mt-1">
                                    This phase took <strong>{Math.round(phase.duration / 1000)}s</strong>, which significantly impacts user experience.
                                    <br />
                                    <span className="text-sm">Consider optimizing API calls or implementing caching for this phase.</span>
                                  </div>
                                </div>
                              </div>
                            )}
                            {phase.duration && phase.duration > 1000 && phase.duration <= 3000 && (
                              <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded flex items-start gap-2">
                                <Clock className="w-4 h-4 text-orange-500 mt-0.5" />
                                <div>
                                  <span className="text-orange-600 font-medium">⚠️ Potential Delay:</span>
                                  <span className="text-orange-700 ml-1">This phase took {Math.round(phase.duration / 1000)}s</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
            
            {/* System Prompt Section */}
            {(() => {
              const systemPrompt = logs
                .filter(log => log.type === 'router_response')
                .find(log => log.systemPrompt)?.systemPrompt;
              
              return systemPrompt ? (
                <div>
                  <h3 className="text-lg font-medium mb-2 text-blue-600 flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    System Prompt (Shared)
                  </h3>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-4">
                    <details className="cursor-pointer">
                      <summary className="font-medium text-blue-800 dark:text-blue-200 hover:text-blue-900">
                        📋 Click to view system prompt ({systemPrompt.length} characters) - Used for all requests
                      </summary>
                      <pre className="mt-3 text-xs bg-white dark:bg-gray-800 p-3 rounded border overflow-auto max-h-40 whitespace-pre-wrap text-gray-700 dark:text-gray-300 font-mono">
                        {systemPrompt}
                      </pre>
                    </details>
                  </div>
                </div>
              ) : null;
            })()}
            
            {/* All API Logs */}
            <div>
              <h3 className="text-lg font-medium mb-3 text-gray-600 flex items-center gap-2">
                <Send className="w-5 h-5" />
                All API Events ({logs.length})
              </h3>
              <div className="space-y-4">
                {logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No API logs yet. Send a message to see the debug information.
                  </div>
                ) : (
                  logs.map((log, index) => (
                    <div
                      key={log.id}
                      className={`border rounded-lg p-4 space-y-3 ${
                        log.type === 'router_request' ? 'bg-blue-50 border-blue-200' :
                        log.type === 'router_token' ? 'bg-yellow-50 border-yellow-200' :
                        log.type === 'router_response' ? 'bg-green-50 border-green-200' :
                        'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(log.type)}
                          <Badge variant={getTypeBadgeVariant(log.type)}>
                            {log.type.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatTimestamp(log.timestamp)}
                          </span>
                          {index > 0 && (() => {
                            const prevTime = new Date(logs[index - 1].timestamp);
                            const currentTime = new Date(log.timestamp);
                            const timeDiff = currentTime.getTime() - prevTime.getTime();
                            return timeDiff > 100 ? (
                              <span className={`text-xs px-2 py-1 rounded font-mono ${
                                timeDiff > 2000 ? 'bg-red-100 text-red-700' :
                                timeDiff > 500 ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                +{Math.round(timeDiff)}ms
                              </span>
                            ) : null;
                          })()}
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
                                {log.openaiRequest.max_completion_tokens && <span className="ml-2 text-muted-foreground">({log.openaiRequest.max_completion_tokens} max tokens)</span>}
                                {log.openaiRequest.temperature && <span className="ml-2 text-muted-foreground">(temp: {log.openaiRequest.temperature})</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* OpenAI Response Metadata */}
                      {log.openaiResponse && (
                        <div className="text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded border">
                          <div className="font-medium text-green-800 dark:text-green-200 mb-2">🤖 OpenAI Response Metadata</div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div><strong>Model:</strong> {log.openaiResponse.model}</div>
                            <div><strong>Finish:</strong> {log.openaiResponse.finish_reason}</div>
                            {log.openaiResponse.usage && (
                              <>
                                <div><strong>Total Tokens:</strong> {log.openaiResponse.usage.total_tokens}</div>
                                <div><strong>Prompt:</strong> {log.openaiResponse.usage.prompt_tokens}</div>
                                <div><strong>Completion:</strong> {log.openaiResponse.usage.completion_tokens}</div>
                                {log.openaiResponse.usage.completion_tokens_details?.reasoning_tokens && (
                                  <div className="col-span-3"><strong>Reasoning:</strong> {log.openaiResponse.usage.completion_tokens_details.reasoning_tokens} tokens</div>
                                )}
                                {log.openaiResponse.usage.prompt_tokens_details?.cached_tokens && (
                                  <div className="col-span-3"><strong>Cached:</strong> {log.openaiResponse.usage.prompt_tokens_details.cached_tokens} tokens</div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Raw Data */}
                      <details className="text-sm">
                        <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900 mb-2">
                          📄 Raw Data (Click to expand)
                        </summary>
                        <div className="bg-muted/50 p-3 rounded overflow-hidden">
                          <pre className="text-xs whitespace-pre-wrap break-all font-mono max-h-60 overflow-y-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </div>
                      </details>
                      
                      {/* AI Draft Action Analysis */}
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
                  ))
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};