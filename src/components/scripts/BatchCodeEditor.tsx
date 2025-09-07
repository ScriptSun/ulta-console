import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Eye,
  Hash,
  LineChart
} from 'lucide-react';
import { validateScript, formatBytes, type ValidationResult } from '@/utils/scriptValidation';
import { cn } from '@/lib/utils';

interface BatchCodeEditorProps {
  content: string;
  onChange: (content: string) => void;
  onValidationChange?: (result: ValidationResult) => void;
  readOnly?: boolean;
  className?: string;
}

export function BatchCodeEditor({ 
  content, 
  onChange, 
  onValidationChange,
  readOnly = false,
  className 
}: BatchCodeEditorProps) {
  const [validation, setValidation] = useState<ValidationResult>({
    isValid: true,
    errors: [],
    warnings: [],
    sizeBytes: 0
  });

  const validateContent = useCallback(async (content: string) => {
    const result = await validateScript({ content });
    setValidation(result);
    onValidationChange?.(result);
  }, [onValidationChange]);

  useEffect(() => {
    validateContent(content);
  }, [content, validateContent]);

  const handleContentChange = (newContent: string) => {
    if (!readOnly) {
      onChange(newContent);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* SHA256 Hash Section - Top */}
      {validation.sha256 && (
        <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">SHA256 Hash</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono bg-background/50 px-3 py-1 rounded border text-foreground">
                {validation.sha256.substring(0, 16)}...
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(validation.sha256!)}
                className="border-primary/20 text-primary hover:bg-primary/10"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}


      {/* Code Editor */}
      <Card className="bg-card border-border overflow-hidden">
        <CardContent className="p-0">
          <div className="flex w-full min-h-[300px]">
            <div className="flex-1 relative">
              <Textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="#!/bin/bash

# Your bash script here...
echo 'Hello, World!'

# Add your commands below
"
                className="min-h-[300px] w-full font-mono text-sm leading-6 border-0 resize-none focus-visible:ring-0 bg-background text-foreground placeholder:text-muted-foreground p-4 rounded-none"
                readOnly={readOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-foreground">
            {validation.isValid ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            )}
            Validation Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-muted/30 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground mb-1">File Size</p>
              <p className="text-sm font-semibold text-foreground">{formatBytes(validation.sizeBytes)}</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground mb-1">Lines</p>
              <p className="text-sm font-semibold text-foreground">{content.split('\n').length}</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground mb-1">Errors</p>
              <p className="text-sm font-semibold text-destructive">{validation.errors.length}</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground mb-1">Warnings</p>
              <p className="text-sm font-semibold text-warning">{validation.warnings.length}</p>
            </div>
          </div>

          {/* SHA256 Hash */}
          {validation.sha256 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">SHA256 Hash</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border border-border">
                <code className="text-xs font-mono text-foreground flex-1 break-all">
                  {validation.sha256}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(validation.sha256!)}
                  className="border-border text-foreground hover:bg-accent flex-shrink-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Errors */}
          {validation.errors.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Errors ({validation.errors.length})
              </p>
              <div className="space-y-2">
                {validation.errors.map((error, index) => (
                  <Alert key={index} variant="destructive" className="bg-destructive/10 border-destructive/20">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-destructive-foreground">{error}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-warning flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Warnings ({validation.warnings.length})
              </p>
              <div className="space-y-2">
                {validation.warnings.map((warning, index) => (
                  <Alert key={index} className="bg-warning/10 border-warning/20">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-warning-foreground">{warning}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          {/* Success State */}
          {validation.isValid && validation.errors.length === 0 && validation.warnings.length === 0 && (
            <Alert className="bg-success/10 border-success/20">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription className="text-success-foreground">
                Script validation passed! No issues found. Your script is ready for deployment.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}