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
  Hash
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
  const [showLineNumbers, setShowLineNumbers] = useState(true);

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

  const getLineNumbers = () => {
    const lines = content.split('\n');
    return lines.map((_, index) => index + 1).join('\n');
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Editor Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="font-medium">Script Editor</span>
          {readOnly && (
            <Badge variant="secondary">
              <Eye className="h-3 w-3 mr-1" />
              Read Only
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLineNumbers(!showLineNumbers)}
          >
            Line Numbers
          </Button>
          {validation.sha256 && (
            <div className="flex items-center gap-2">
              <Hash className="h-3 w-3 text-muted-foreground" />
              <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                {validation.sha256.substring(0, 8)}...
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(validation.sha256!)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Code Editor */}
      <Card>
        <CardContent className="p-0">
          <div className="flex">
            {showLineNumbers && (
              <div className="bg-muted/50 p-4 min-w-[60px] text-right border-r">
                <pre className="text-xs text-muted-foreground font-mono leading-6">
                  {getLineNumbers()}
                </pre>
              </div>
            )}
            <div className="flex-1">
              <Textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="#!/bin/bash\n\n# Your bash script here...\necho 'Hello, World!'"
                className="h-[600px] font-mono text-sm border-0 resize-none focus-visible:ring-0 overflow-y-auto"
                readOnly={readOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {validation.isValid ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
            Validation Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Size</p>
              <p className="text-sm font-medium">{formatBytes(validation.sizeBytes)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lines</p>
              <p className="text-sm font-medium">{content.split('\n').length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Errors</p>
              <p className="text-sm font-medium text-red-600">{validation.errors.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Warnings</p>
              <p className="text-sm font-medium text-yellow-600">{validation.warnings.length}</p>
            </div>
          </div>

          {/* SHA256 */}
          {validation.sha256 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">SHA256</p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-muted p-2 rounded flex-1 break-all">
                  {validation.sha256}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(validation.sha256!)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Errors */}
          {validation.errors.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-600">Errors</p>
              {validation.errors.map((error, index) => (
                <Alert key={index} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-yellow-600">Warnings</p>
              {validation.warnings.map((warning, index) => (
                <Alert key={index} className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">{warning}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Success */}
          {validation.isValid && validation.errors.length === 0 && validation.warnings.length === 0 && (
            <Alert className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/30 shadow-lg shadow-emerald-500/20 backdrop-blur-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <AlertDescription className="text-emerald-200">
                Script validation passed! No issues found.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}