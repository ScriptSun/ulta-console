import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ExternalLink, 
  Terminal, 
  AlertCircle, 
  Clock, 
  CheckCircle,
  XCircle,
  FileText,
  Activity,
  Server,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TaskDetailsDialogProps {
  runId: string;
  title?: string;
  status?: 'queued' | 'running' | 'completed' | 'failed';
  children: React.ReactNode;
}

interface BatchRunDetails {
  id: string;
  batch_id: string;
  agent_id: string;
  tenant_id: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  duration_sec: number | null;
  contract: any;
  raw_stdout: string | null;
  raw_stderr: string | null;
  parser_warning: boolean;
  created_at: string;
  updated_at: string;
  batch: {
    name: string;
    description: string;
    risk: string;
  };
  agent: {
    hostname: string | null;
    agent_type: string;
    os: string;
  };
}

interface ErrorDetails {
  error_message: string;
  error_code?: string;
  stack_trace?: string;
  context?: any;
}

export function TaskDetailsDialog({ runId, title, status, children }: TaskDetailsDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<BatchRunDetails | null>(null);
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);

  const loadDetails = async () => {
    if (!runId) return;
    
    setLoading(true);
    try {
      // Load batch run details
      const { data: runData, error: runError } = await supabase
        .from('batch_runs')
        .select(`
          *,
          batch:script_batches (
            name,
            description,
            risk
          ),
          agent:agents (
            hostname,
            agent_type,
            os
          )
        `)
        .eq('id', runId)
        .single();

      if (runError) {
        console.error('Error loading batch run details:', runError);
        throw runError;
      }

      setDetails(runData);

      // If task failed, try to extract error details from stdout/stderr
      if (runData?.status === 'failed' || status === 'failed') {
        const errorInfo: ErrorDetails = {
          error_message: 'Task execution failed'
        };

        // Parse stderr for error information
        if (runData?.raw_stderr) {
          const stderrLines = runData.raw_stderr.split('\n').filter(line => line.trim());
          const lastErrorLine = stderrLines[stderrLines.length - 1];
          if (lastErrorLine) {
            errorInfo.error_message = lastErrorLine;
          }
        }

        // Parse stdout for additional context
        if (runData?.raw_stdout) {
          const stdoutLines = runData.raw_stdout.split('\n').filter(line => line.trim());
          // Look for error patterns in stdout
          const errorPatterns = [
            /error:/i,
            /failed:/i,
            /exception:/i,
            /cannot/i,
            /permission denied/i,
            /command not found/i,
            /no such file/i
          ];
          
          const errorLines = stdoutLines.filter(line => 
            errorPatterns.some(pattern => pattern.test(line))
          );

          if (errorLines.length > 0) {
            errorInfo.context = {
              error_lines: errorLines,
              total_output_lines: stdoutLines.length
            };
          }
        }

        // Check for parser warnings
        if (runData?.parser_warning) {
          errorInfo.error_code = 'PARSER_WARNING';
          errorInfo.context = {
            ...errorInfo.context,
            parser_warning: 'Failed to parse execution output properly'
          };
        }

        setErrorDetails(errorInfo);
      }

    } catch (error) {
      console.error('Error loading task details:', error);
      toast({
        title: 'Error Loading Details',
        description: 'Failed to load task execution details.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadDetails();
    }
  }, [open, runId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'running':
        return <Activity className="h-4 w-4 text-orange-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatDuration = (durationSec: number | null) => {
    if (!durationSec) return 'N/A';
    if (durationSec < 60) return `${Math.round(durationSec)}s`;
    const minutes = Math.floor(durationSec / 60);
    const seconds = Math.round(durationSec % 60);
    return `${minutes}m ${seconds}s`;
  };

  const formatOutput = (output: string | null) => {
    if (!output) return 'No output available';
    return output.split('\n').map((line, index) => (
      <div key={index} className="font-mono text-xs text-foreground/80">
        {line || ' '}
      </div>
    ));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {details && getStatusIcon(details.status)}
            {title || 'Task Execution Details'}
          </DialogTitle>
          <DialogDescription>
            Detailed information about task execution and any errors encountered.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : details ? (
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="overview" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="output">Output</TabsTrigger>
                <TabsTrigger value="errors">Errors</TabsTrigger>
                <TabsTrigger value="contract">Results</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Execution Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(details.status)}
                          <Badge variant={details.status === 'completed' ? 'default' : 
                                         details.status === 'failed' ? 'destructive' : 'secondary'}>
                            {details.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration:</span>
                        <span>{formatDuration(details.duration_sec)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Started:</span>
                        <span>{details.started_at ? new Date(details.started_at).toLocaleString() : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Finished:</span>
                        <span>{details.finished_at ? new Date(details.finished_at).toLocaleString() : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Run ID:</span>
                        <span className="font-mono text-xs">{details.id}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Task Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Batch:</span>
                        <span className="text-right">{details.batch?.name || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Risk Level:</span>
                        <Badge variant={details.batch?.risk === 'high' ? 'destructive' : 
                                       details.batch?.risk === 'medium' ? 'secondary' : 'outline'}>
                          {details.batch?.risk || 'unknown'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Agent:</span>
                        <span className="text-right">{details.agent?.hostname || details.agent?.agent_type || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">OS:</span>
                        <span>{details.agent?.os || 'Unknown'}</span>
                      </div>
                      {details.parser_warning && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Parser:</span>
                          <Badge variant="secondary" className="text-orange-600">
                            Warning
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {details.batch?.description && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Task Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{details.batch.description}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="output" className="flex-1">
                <Card className="h-full flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Terminal className="h-4 w-4" />
                      Standard Output
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ScrollArea className="h-full w-full rounded border bg-muted/30 p-3">
                      {formatOutput(details.raw_stdout)}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="errors" className="flex-1 space-y-4">
                {details.status === 'failed' || errorDetails ? (
                  <>
                    {errorDetails && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            Error Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <span className="text-sm font-medium">Error Message:</span>
                            <p className="text-sm text-red-600 mt-1 p-2 bg-red-50 rounded border">
                              {errorDetails.error_message}
                            </p>
                          </div>
                          {errorDetails.error_code && (
                            <div>
                              <span className="text-sm font-medium">Error Code:</span>
                              <p className="text-sm font-mono mt-1">{errorDetails.error_code}</p>
                            </div>
                          )}
                          {errorDetails.context?.error_lines && (
                            <div>
                              <span className="text-sm font-medium">Error Context:</span>
                              <ScrollArea className="h-32 w-full rounded border bg-muted/30 p-2 mt-1">
                                {errorDetails.context.error_lines.map((line: string, index: number) => (
                                  <div key={index} className="font-mono text-xs text-red-600">
                                    {line}
                                  </div>
                                ))}
                              </ScrollArea>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {details.raw_stderr && (
                      <Card className="flex-1 flex flex-col">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            Standard Error
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1">
                          <ScrollArea className="h-64 w-full rounded border bg-red-50 p-3">
                            {formatOutput(details.raw_stderr)}
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card>
                    <CardContent className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No errors detected in this execution.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="contract" className="flex-1">
                <Card className="h-full flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Execution Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
                    {details.contract ? (
                      <ScrollArea className="h-full w-full rounded border bg-muted/30 p-3">
                        <pre className="text-xs whitespace-pre-wrap">
                          {JSON.stringify(details.contract, null, 2)}
                        </pre>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No execution results available.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Failed to load task details.</p>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          {details && (
            <Button 
              variant="outline" 
              onClick={() => window.open(`/scripts/batches/runs/${runId}`, '_blank')}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open Full Details
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}