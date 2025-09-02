import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, Terminal, FileText, X, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AiDraftAction } from '@/types/routerTypes';
import { i18n, sanitizeText } from '@/lib/i18n';

interface AiDraftActionCardProps {
  decision: AiDraftAction;
  onConfirm: () => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function AiDraftActionCard({ decision, onConfirm, onCancel, disabled = false }: AiDraftActionCardProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(true);

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
      case 'low': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800';
      case 'medium': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800';
      case 'high': return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800';
      default: return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700';
    }
  };

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
      <CardContent className="space-y-4 mt-6 px-8 py-5">
        {/* Command Section */}
        {decision.suggested.kind === "command" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                <span className="font-medium text-sm">{i18n.draft.command.title}</span>
              </div>
              <Badge className={`${getRiskColor(decision.risk)} font-medium`} variant="outline">
                {decision.risk.charAt(0).toUpperCase() + decision.risk.slice(1)} Risk
              </Badge>
            </div>
            <div className="group relative">
              <pre className="bg-muted/20 p-3 rounded-md text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                <code>{decision.suggested.kind === "command" ? decision.suggested.command : ""}</code>
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                onClick={() => decision.suggested.kind === "command" && copyToClipboard(decision.suggested.command)}
                aria-label="Copy command to clipboard"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {decision.suggested.kind === "command" ? sanitizeText(decision.suggested.description) : ""}
            </p>
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
              <Badge className={`${getRiskColor(decision.risk)} font-medium`} variant="outline">
                {decision.risk.charAt(0).toUpperCase() + decision.risk.slice(1)} Risk
              </Badge>
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
                      <pre className="flex-1">
                        <code className="text-sm font-mono">{command}</code>
                      </pre>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
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

        {/* Notes Section */}
        {decision.notes && decision.notes.length > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
            <h4 className="font-medium text-sm text-primary mb-2">Important notes:</h4>
            <ul className="space-y-1">
                  {decision.notes.map((note, index) => (
                    <li key={index} className="text-sm text-primary/80">
                      • {sanitizeText(note)}
                    </li>
                  ))}
            </ul>
          </div>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex justify-end">
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
              onClick={onConfirm}
              disabled={disabled}
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