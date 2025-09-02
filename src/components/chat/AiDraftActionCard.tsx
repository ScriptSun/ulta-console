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
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!isExpanded) {
    return (
      <Card className="border-primary/20 bg-primary/5">
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
            >
              Show details
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{sanitizeText(decision.summary) || i18n.draft.cardTitle.fallback}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getRiskColor(decision.risk)} variant="outline">
              {decision.risk} risk
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Command Section */}
        {decision.suggested.kind === "command" && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="h-4 w-4" />
              <span className="font-medium text-sm">{i18n.draft.command.title}</span>
            </div>
            <div className="relative">
              <pre className="bg-muted p-3 rounded-md text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                <code>{decision.suggested.kind === "command" ? decision.suggested.command : ""}</code>
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0"
                onClick={() => decision.suggested.kind === "command" && copyToClipboard(decision.suggested.command)}
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
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4" />
              <span className="font-medium text-sm">{i18n.draft.batch.title}</span>
            </div>
            <div className="bg-muted p-3 rounded-md">
              <h4 className="font-medium text-sm mb-1">{sanitizeText(decision.suggested.name)}</h4>
              <p className="text-sm text-muted-foreground mb-3">{sanitizeText(decision.suggested.overview)}</p>
              
              <div className="space-y-2">
                {decision.suggested.commands.map((command, index) => (
                  <div key={index} className="relative">
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
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => copyToClipboard(command)}
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
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <h4 className="font-medium text-sm text-blue-800 mb-2">Important notes:</h4>
            <ul className="space-y-1">
                  {decision.notes.map((note, index) => (
                    <li key={index} className="text-sm text-blue-700">
                      • {sanitizeText(note)}
                    </li>
                  ))}
            </ul>
          </div>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {decision.human && (
              <span>{sanitizeText(decision.human)}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={disabled}
            >
              <X className="h-4 w-4 mr-1" />
              {i18n.draft.buttons.cancel}
            </Button>
            <Button
              size="sm"
              onClick={onConfirm}
              disabled={disabled}
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