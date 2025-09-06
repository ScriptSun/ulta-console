import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Terminal, FileText, X, CheckCircle, Shield, XCircle, Info, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEventBus } from '@/hooks/useEventBus';
import { AiDraftAction } from '@/types/routerTypes';
import { i18n, sanitizeText } from '@/lib/i18n';
import { TaskDetailsDialog } from './TaskDetailsDialog';

interface AiDraftActionCardProps {
  decision: AiDraftAction;
  onConfirm: (params?: Record<string, any>) => void;
  onCancel: () => void;
  disabled?: boolean;
  run_id?: string;
  executionStatus?: 'queued' | 'running' | 'completed' | 'failed' | null;
}

export function AiDraftActionCard({ decision, onConfirm, onCancel, disabled = false, run_id, executionStatus }: AiDraftActionCardProps) {
  const { toast } = useToast();
  const { on } = useEventBus();
  const [isExpanded, setIsExpanded] = useState(true);
  const [internalStatus, setInternalStatus] = useState<'queued' | 'running' | 'completed' | 'failed' | null>(executionStatus || null);
  const [failureDetails, setFailureDetails] = useState<string>('');
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [paramErrors, setParamErrors] = useState<Record<string, string>>({});

  // Listen for execution events if run_id is provided
  useEffect(() => {
    if (!run_id) return;
    
    const unsubscribers = [
      on('exec.finished', (data) => {
        if (data.run_id === run_id) {
          setInternalStatus(data.success ? 'completed' : 'failed');
          if (!data.success) {
            setFailureDetails('Task failed. Check the logs for details.');
          }
        }
      }),
      
      on('exec.error', (data) => {
        if (data.run_id === run_id) {
          setInternalStatus('failed');
          setFailureDetails(data.error || 'Task failed with an error.');
        }
      }),
      
      on('exec.started', (data) => {
        if (data.run_id === run_id) {
          setInternalStatus('running');
        }
      })
    ];
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [on, run_id]);

  // Update internal status when prop changes
  useEffect(() => {
    if (executionStatus) {
      setInternalStatus(executionStatus);
    }
  }, [executionStatus]);

  // Initialize form values with default values
  useEffect(() => {
    if ((decision as any).missing_params) {
      const initialValues: Record<string, string> = {};
      (decision as any).missing_params.forEach((param: any) => {
        initialValues[param.key] = param.defaultValue || '';
      });
      setParamValues(initialValues);
    }
  }, [decision]);

  const validateParams = () => {
    const errors: Record<string, string> = {};
    const missingParams = (decision as any).missing_params || [];
    
    missingParams.forEach((param: any) => {
      const value = paramValues[param.key] || '';
      
      if (param.required && !value.trim()) {
        errors[param.key] = `${param.label} is required`;
      } else if (value) {
        if (param.minLength && value.length < param.minLength) {
          errors[param.key] = `${param.label} must be at least ${param.minLength} characters`;
        }
        if (param.maxLength && value.length > param.maxLength) {
          errors[param.key] = `${param.label} must not exceed ${param.maxLength} characters`;
        }
      }
    });
    
    setParamErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleParamChange = (key: string, value: string) => {
    setParamValues(prev => ({ ...prev, [key]: value }));
    // Clear error for this field when user starts typing
    if (paramErrors[key]) {
      setParamErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const handleConfirm = () => {
    if ((decision as any).missing_params && (decision as any).missing_params.length > 0) {
      if (validateParams()) {
        onConfirm(paramValues);
      }
    } else {
      onConfirm();
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Command copied to clipboard",
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500 text-white border-green-500 shadow-sm dark:bg-green-600 dark:text-white dark:border-green-600';
      case 'medium': return 'bg-orange-500 text-white border-orange-500 shadow-sm dark:bg-orange-600 dark:text-white dark:border-orange-600';
      case 'high': return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800';
      default: return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700';
    }
  };

  // Handle incomplete AI draft action responses - should not happen with proper backend
  if (!decision.suggested || !decision.suggested.kind) {
    return (
      <Card className="border-l-4 border-l-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="h-4 w-4 text-primary" />
            <span className="font-medium">AI Response Error</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Backend returned incomplete ai_draft_action response. Expected complete structure with task, status, risk, suggested commands, notes, and human fields.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-4">
            <pre className="text-xs">{JSON.stringify(decision, null, 2)}</pre>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={disabled}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isExpanded) {
    return (
      <Card className="border-l-4 border-l-primary/20 bg-primary/5">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">{sanitizeText(decision.summary) || i18n.draft.cardTitle.fallback}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsExpanded(true)}
              className="h-6 px-2"
              aria-label="Show details"
            >
              Show details
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-primary/20 bg-primary/5">
      <CardContent className="space-y-2 mt-3 px-6 py-3">
        {/* Command Section */}
        {(decision.suggested.kind === "command" || decision.suggested.kind === "commands") && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                <span className="font-medium text-sm">Commands to run:</span>
              </div>
              <div className="flex items-center gap-2">
               <Badge 
                 className={`${getRiskColor(decision.risk || 'medium')} font-medium flex items-center gap-1.5 px-2.5 py-1`} 
                 variant="outline"
               >
                 <Shield className="h-3 w-3" />
                 {(decision.risk || 'medium').charAt(0).toUpperCase() + (decision.risk || 'medium').slice(1)} Risk
               </Badge>
              </div>
            </div>
            <div className="bg-muted/20 p-3 rounded-md">
              <div className="space-y-2">
                {/* Handle both single command and commands array */}
                {(() => {
                  let commands: string[] = [];
                  if (decision.suggested.kind === "command") {
                    // Handle both command string and commands array for backward compatibility
                    commands = (decision.suggested as any).commands || [decision.suggested.command];
                  } else if (decision.suggested.kind === "commands") {
                    commands = decision.suggested.commands;
                  }
                  return commands.map((command: string, index: number) => (
                      <div className="group relative">
                        <div className="flex gap-2">
                          <pre className="flex-1 bg-background/50 p-2 rounded border overflow-x-auto scrollbar-hide">
                            <code className="text-sm font-mono whitespace-nowrap">{command}</code>
                          </pre>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex-shrink-0"
                            onClick={() => copyToClipboard(command)}
                            aria-label={`Copy command to clipboard`}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Batch Script Section */}
        {decision.suggested.kind === "batch_script" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="font-medium text-sm">{i18n.draft.batch.title}</span>
              </div>
               <div className="flex items-center gap-2">
                 <Badge 
                   className={`${getRiskColor(decision.risk || 'medium')} font-medium flex items-center gap-1.5 px-2.5 py-1`} 
                   variant="outline"
                 >
                   <Shield className="h-3 w-3" />
                   {(decision.risk || 'medium').charAt(0).toUpperCase() + (decision.risk || 'medium').slice(1)} Risk
                 </Badge>
               </div>
            </div>
            <div className="bg-muted/20 p-3 rounded-md">
              <h4 className="font-medium text-sm mb-1">{sanitizeText(decision.suggested.name)}</h4>
              <p className="text-sm text-muted-foreground mb-3">{sanitizeText(decision.suggested.overview)}</p>
              
              <div className="space-y-2">
                {decision.suggested.commands.map((command, index) => (
                    <div key={index} className="group relative">
                      <div className="flex gap-2">
                        <span className="text-xs text-muted-foreground font-mono w-4 flex-shrink-0 mt-0.5">
                          {index + 1}.
                        </span>
                        <pre className="flex-1 overflow-x-auto scrollbar-hide">
                          <code className="text-sm font-mono whitespace-nowrap">{command}</code>
                        </pre>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex-shrink-0"
                          onClick={() => copyToClipboard(command)}
                          aria-label={`Copy command ${index + 1} to clipboard`}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                ))}
              </div>

              {decision.suggested.post_checks && decision.suggested.post_checks.length > 0 && (
                <div className="mt-3 pt-3 border-t border-muted-foreground/20">
                  <span className="text-xs font-medium text-muted-foreground">Post checks:</span>
                  <ul className="mt-1 space-y-1">
                    {decision.suggested.post_checks.map((check, index) => (
                      <li key={index} className="text-xs text-muted-foreground font-mono">
                        • {check}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conditional Notes/Failure Section */}
        {internalStatus === 'failed' ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <h4 className="font-medium text-sm text-destructive">Task Failed</h4>
              </div>
              {run_id && (
                <TaskDetailsDialog 
                  runId={run_id} 
                  title="Task Failed"
                  status="failed"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                  >
                    <Info className="h-3 w-3 mr-1" />
                    Details
                  </Button>
                </TaskDetailsDialog>
              )}
            </div>
            <p className="text-sm text-destructive">
              ❌ {failureDetails || 'Task failed. Check the logs for details.'}
            </p>
            {run_id && (
              <div className="text-xs text-muted-foreground font-mono mt-2">
                Run ID: {run_id.slice(0, 8)}...
              </div>
            )}
          </div>
        ) : internalStatus === 'completed' ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-md p-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <h4 className="font-medium text-sm text-green-600">Task Completed</h4>
            </div>
            <p className="text-sm text-green-600">
              ✅ Task completed successfully!
            </p>
          </div>
        ) : (decision.notes && decision.notes.length > 0) || (decision as any).estimated_time ? (
          <div className="bg-muted/20 border border-muted-foreground/20 rounded-md p-3">
            <h4 className="font-medium text-sm text-foreground mb-2">Important notes:</h4>
            <ul className="space-y-1">
              {decision.notes && decision.notes.map((note, index) => (
                <li key={index} className="text-sm text-muted-foreground">
                  • {sanitizeText(note)}
                </li>
              ))}
              {(decision as any).estimated_time && (
                <li className="text-sm text-muted-foreground">
                  • Estimated Time: {(decision as any).estimated_time}
                </li>
              )}
            </ul>
          </div>
        ) : null}

        {/* Missing Parameters Form */}
        {(decision as any).missing_params && (decision as any).missing_params.length > 0 && (
          <div className="bg-muted/10 border border-muted-foreground/20 rounded-md p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-primary" />
              <h4 className="font-medium text-sm">Required Parameters</h4>
            </div>
            <div className="space-y-4">
              {(decision as any).missing_params.map((param: any) => (
                <div key={param.key} className="space-y-2">
                  <Label htmlFor={param.key} className="text-sm font-medium">
                    {param.label}
                    {param.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <Input
                    id={param.key}
                    type={param.masked ? "password" : "text"}
                    value={paramValues[param.key] || ''}
                    onChange={(e) => handleParamChange(param.key, e.target.value)}
                    placeholder={param.description}
                    className={paramErrors[param.key] ? "border-destructive" : ""}
                  />
                  {paramErrors[param.key] && (
                    <p className="text-sm text-destructive">{paramErrors[param.key]}</p>
                  )}
                  {param.helpText && !paramErrors[param.key] && (
                    <p className="text-xs text-muted-foreground">{param.helpText}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(decision as any).impact && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Impact:</span>
                <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/50 dark:text-purple-400 dark:border-purple-800">
                  {(decision as any).impact}
                </Badge>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={disabled}
              aria-label="Cancel action"
            >
              <X className="h-4 w-4 mr-1" />
              {i18n.draft.buttons.cancel}
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={disabled || ((decision as any).missing_params && (decision as any).missing_params.length > 0 && Object.keys(paramErrors).length > 0)}
              aria-label="Confirm and execute action"  
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              {i18n.draft.buttons.confirm}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}