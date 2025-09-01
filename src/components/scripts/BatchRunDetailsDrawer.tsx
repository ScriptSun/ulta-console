import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Copy,
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  StopCircle,
  Play,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface BatchRun {
  id: string;
  batch_id: string;
  agent_id: string;
  status: 'queued' | 'running' | 'success' | 'failed' | 'canceled' | 'timeout';
  started_at?: string;
  finished_at?: string;
  duration_sec?: number;
  contract?: {
    status: 'ok' | 'error' | 'partial';
    message: string;
    metrics?: Record<string, any>;
  };
  raw_stdout?: string;
  raw_stderr?: string;
  parser_warning?: boolean;
  created_at: string;
  agent?: {
    id: string;
    hostname?: string;
  };
  contract_status?: string;
  contract_message?: string;
  contract_metrics?: Record<string, any>;
}

interface BatchRunDetailsDrawerProps {
  run: BatchRun | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusIcons = {
  queued: Clock,
  running: Play,
  success: CheckCircle2,
  failed: XCircle,
  canceled: StopCircle,
  timeout: AlertCircle
};

const statusColors = {
  queued: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  running: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  canceled: 'bg-muted/50 text-muted-foreground border-muted hover:bg-muted/70',
  timeout: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
};

const contractStatusColors = {
  ok: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
  partial: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
};

export function BatchRunDetailsDrawer({ run, isOpen, onClose }: BatchRunDetailsDrawerProps) {
  const { toast } = useToast();

  const formatDuration = (durationSec?: number) => {
    if (!durationSec) return 'N/A';
    
    if (durationSec < 60) {
      return `${durationSec} seconds`;
    } else if (durationSec < 3600) {
      const minutes = Math.floor(durationSec / 60);
      const seconds = durationSec % 60;
      return `${minutes}m ${seconds}s`;
    } else {
      const hours = Math.floor(durationSec / 3600);
      const minutes = Math.floor((durationSec % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  const copyToClipboard = async (text: string, description: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied',
        description: `${description} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const downloadOutput = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!run) return null;

  const StatusIcon = statusIcons[run.status];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <StatusIcon className="h-5 w-5" />
            Batch Run Details
          </SheetTitle>
          <SheetDescription>
            Run ID: {run.id}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          <div className="space-y-6">
            {/* Run Overview */}
            <div className="p-4 bg-card/30 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Run Overview</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge 
                      variant="outline" 
                      className={cn("text-sm", statusColors[run.status])}
                    >
                      <StatusIcon className="h-4 w-4 mr-1" />
                      {run.status}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Duration</label>
                  <div className="mt-1 font-mono text-sm">
                    {formatDuration(run.duration_sec)}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Agent</label>
                  <div className="mt-1 text-sm">
                    {run.agent?.hostname || run.agent_id.slice(0, 8)}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Started</label>
                  <div className="mt-1 text-sm">
                    {formatTimestamp(run.started_at)}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Finished</label>
                  <div className="mt-1 text-sm">
                    {formatTimestamp(run.finished_at)}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <div className="mt-1 text-sm">
                    {formatTimestamp(run.created_at)}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <Tabs defaultValue="contract" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="contract">Exit Contract</TabsTrigger>
                <TabsTrigger value="stdout">Output</TabsTrigger>
                <TabsTrigger value="stderr">Errors</TabsTrigger>
              </TabsList>

              <TabsContent value="contract" className="space-y-4 mt-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Exit Contract</h4>
                  {run.contract && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(JSON.stringify(run.contract, null, 2), 'Contract')}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy JSON
                    </Button>
                  )}
                </div>

                {run.contract ? (
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Status</label>
                          <div className="mt-1">
                            <Badge 
                              variant="outline" 
                              className={cn("text-sm", contractStatusColors[run.contract.status as keyof typeof contractStatusColors])}
                            >
                              {run.contract.status}
                            </Badge>
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Message</label>
                          <div className="mt-1 text-sm">
                            {run.contract.message || 'No message'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {run.contract.metrics && Object.keys(run.contract.metrics).length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Metrics</label>
                        <div className="mt-2 p-4 border rounded-lg bg-background">
                          <pre className="text-sm overflow-auto">
                            {JSON.stringify(run.contract.metrics, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Full Contract JSON</label>
                      <div className="mt-2 p-4 border rounded-lg bg-background">
                        <pre className="text-sm overflow-auto">
                          {JSON.stringify(run.contract, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : run.parser_warning ? (
                  <div className="p-4 border rounded-lg bg-amber-500/10 border-amber-500/20">
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">Contract Parse Warning</span>
                    </div>
                    <p className="text-sm mt-2">
                      The script output contained invalid JSON or no valid contract. 
                      Check the raw output below.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>No exit contract available</p>
                    <p className="text-sm">The script did not output a valid exit contract</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="stdout" className="space-y-4 mt-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Standard Output</h4>
                  {run.raw_stdout && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(run.raw_stdout!, 'Output')}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadOutput(run.raw_stdout!, `run-${run.id}-stdout.txt`)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  )}
                </div>

                <div className="border rounded-lg">
                  {run.raw_stdout ? (
                    <ScrollArea className="h-[400px] p-4">
                      <pre className="text-sm whitespace-pre-wrap font-mono">
                        {run.raw_stdout}
                      </pre>
                    </ScrollArea>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <p>No standard output captured</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="stderr" className="space-y-4 mt-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Standard Error</h4>
                  {run.raw_stderr && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(run.raw_stderr!, 'Error output')}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadOutput(run.raw_stderr!, `run-${run.id}-stderr.txt`)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  )}
                </div>

                <div className="border rounded-lg">
                  {run.raw_stderr ? (
                    <ScrollArea className="h-[400px] p-4">
                      <pre className="text-sm whitespace-pre-wrap font-mono text-red-400">
                        {run.raw_stderr}
                      </pre>
                    </ScrollArea>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <p>No error output captured</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}