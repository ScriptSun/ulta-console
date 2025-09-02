import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Eye, EyeOff, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface RouterEvent {
  id: string;
  run_id: string;
  event_type: string;
  payload: any;
  agent_id: string;
  conversation_id?: string;
  created_at: string;
}

const RouterLogs = () => {
  const [events, setEvents] = useState<RouterEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('router_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Failed to fetch router events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    
    if (autoRefresh) {
      const interval = setInterval(fetchEvents, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusIcon = (eventType: string, payload: any) => {
    if (eventType === 'validation_failed' || eventType === 'openai_error') {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    
    if (!payload) return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    
    if (payload.mode === 'action' && payload.status === 'rejected') {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    if (payload.mode === 'ai_draft_action' || payload.mode === 'action') {
      return <CheckCircle className="h-4 w-4 text-primary" />;
    }
    if (payload.mode === 'chat') {
      return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    }
    
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusBadge = (eventType: string, payload: any) => {
    if (eventType === 'validation_failed') {
      return <Badge variant="destructive">Validation Failed</Badge>;
    }
    if (eventType === 'openai_error') {
      return <Badge variant="destructive">OpenAI Error</Badge>;
    }
    
    if (!payload) return <Badge variant="secondary">Unknown</Badge>;
    
    if (payload.mode === 'action' && payload.status === 'rejected') {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    if (payload.mode === 'ai_draft_action') {
      return <Badge variant="default">Draft Action</Badge>;
    }
    if (payload.mode === 'action') {
      return <Badge variant="default">Action</Badge>;
    }
    if (payload.mode === 'chat') {
      return <Badge variant="secondary">Chat</Badge>;
    }
    
    return <Badge variant="outline">{payload.mode || eventType}</Badge>;
  };

  const toggleExpanded = (eventId: string) => {
    setExpandedEvent(expandedEvent === eventId ? null : eventId);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Router Final Responses</h1>
          <p className="text-muted-foreground">
            OpenAI API responses and router decision logs
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={fetchEvents} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading router events...</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  No router events found. Try making a request to the AI router.
                </div>
              </CardContent>
            </Card>
          ) : (
            events.map((event) => (
              <Card key={event.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(event.event_type, event.payload)}
                      <div>
                        <CardTitle className="text-sm font-medium">
                          Run ID: {event.run_id}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(event.event_type, event.payload)}
                          <Badge variant="outline" className="text-xs">
                            {event.event_type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.created_at).toLocaleString()}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(event.id)}
                      >
                        {expandedEvent === event.id ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {event.payload && (
                    <div className="space-y-3">
                      {/* Error Information for failed events */}
                      {(event.event_type === 'validation_failed' || event.event_type === 'openai_error') && (
                        <div className="space-y-2">
                          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded">
                            <div className="font-medium text-destructive mb-1">
                              {event.event_type === 'validation_failed' ? 'Validation Error' : 'OpenAI API Error'}
                            </div>
                            <div className="text-sm text-destructive">
                              {event.payload.error}: {event.payload.details}
                            </div>
                            {event.payload.missing_fields && (
                              <div className="text-xs text-destructive mt-1">
                                Missing fields: {event.payload.missing_fields.join(', ')}
                              </div>
                            )}
                          </div>
                          
                          {/* Show received response for validation failures */}
                          {event.event_type === 'validation_failed' && event.payload.received_response && (
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">
                                Received Response:
                              </span>
                              <div className="mt-1 p-2 bg-muted rounded text-xs font-mono">
                                {JSON.stringify(event.payload.received_response, null, 2)}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Regular Summary Info for successful events */}
                      {event.event_type === 'selected' && event.payload && (
                        <>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Agent ID:</span>
                              <div className="font-mono text-xs">{event.agent_id}</div>
                            </div>
                            {event.payload.task && (
                              <div>
                                <span className="text-muted-foreground">Task:</span>
                                <div className="font-medium">{event.payload.task}</div>
                              </div>
                            )}
                            {event.payload.summary && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Summary:</span>
                                <div>{event.payload.summary}</div>
                              </div>
                            )}
                            {event.payload.text && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Chat Text:</span>
                                <div>{event.payload.text}</div>
                              </div>
                            )}
                          </div>

                          {/* Commands for ai_draft_action */}
                          {event.payload.suggested && event.payload.suggested.commands && (
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Commands:</span>
                              <div className="mt-1 space-y-1">
                                {event.payload.suggested.commands.map((command: string, idx: number) => (
                                  <div key={idx} className="font-mono text-xs bg-muted p-2 rounded">
                                    {command}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {event.payload.notes && event.payload.notes.length > 0 && (
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Notes:</span>
                              <div className="mt-1 space-y-1">
                                {event.payload.notes.map((note: string, idx: number) => (
                                  <div key={idx} className="text-xs text-amber-600 dark:text-amber-400">
                                    • {note}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Expanded JSON View */}
                      {expandedEvent === event.id && (
                        <>
                          <Separator />
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">
                              Full JSON Response:
                            </span>
                            <ScrollArea className="h-64 w-full mt-2 rounded border">
                              <pre className="p-4 text-xs font-mono">
                                {JSON.stringify(event.payload, null, 2)}
                              </pre>
                            </ScrollArea>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default RouterLogs;