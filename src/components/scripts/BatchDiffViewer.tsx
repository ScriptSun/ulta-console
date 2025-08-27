import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  X, 
  Copy, 
  ArrowLeftRight,
  Plus,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BatchVersion {
  id: string;
  version: number;
  sha256: string;
  source: string;
  created_at: string;
  status: string;
}

interface BatchDiffViewerProps {
  leftVersion: BatchVersion;
  rightVersion: BatchVersion;
  onClose: () => void;
}

interface DiffLine {
  type: 'add' | 'remove' | 'normal' | 'header';
  leftNumber?: number;
  rightNumber?: number;
  content: string;
  leftContent?: string;
  rightContent?: string;
}

export function BatchDiffViewer({ leftVersion, rightVersion, onClose }: BatchDiffViewerProps) {
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
  const [stats, setStats] = useState({ added: 0, removed: 0 });

  useEffect(() => {
    computeDiff();
  }, [leftVersion, rightVersion]);

  const computeDiff = () => {
    const leftLines = leftVersion.source.split('\n');
    const rightLines = rightVersion.source.split('\n');
    
    const diff = calculateDiff(leftLines, rightLines);
    setDiffLines(diff.lines);
    setStats(diff.stats);
  };

  const calculateDiff = (left: string[], right: string[]) => {
    const lines: DiffLine[] = [];
    let added = 0;
    let removed = 0;
    
    // Simple line-by-line diff algorithm
    let leftIndex = 0;
    let rightIndex = 0;
    let leftLineNumber = 1;
    let rightLineNumber = 1;

    while (leftIndex < left.length || rightIndex < right.length) {
      const leftLine = leftIndex < left.length ? left[leftIndex] : null;
      const rightLine = rightIndex < right.length ? right[rightIndex] : null;

      if (leftLine === null) {
        // Only right lines remain
        lines.push({
          type: 'add',
          rightNumber: rightLineNumber,
          content: rightLine!,
          rightContent: rightLine!
        });
        rightIndex++;
        rightLineNumber++;
        added++;
      } else if (rightLine === null) {
        // Only left lines remain
        lines.push({
          type: 'remove',
          leftNumber: leftLineNumber,
          content: leftLine,
          leftContent: leftLine
        });
        leftIndex++;
        leftLineNumber++;
        removed++;
      } else if (leftLine === rightLine) {
        // Lines are the same
        lines.push({
          type: 'normal',
          leftNumber: leftLineNumber,
          rightNumber: rightLineNumber,
          content: leftLine,
          leftContent: leftLine,
          rightContent: rightLine
        });
        leftIndex++;
        rightIndex++;
        leftLineNumber++;
        rightLineNumber++;
      } else {
        // Lines are different - check if it's a modification or separate add/remove
        // For simplicity, treat as remove + add
        lines.push({
          type: 'remove',
          leftNumber: leftLineNumber,
          content: leftLine,
          leftContent: leftLine
        });
        lines.push({
          type: 'add',
          rightNumber: rightLineNumber,
          content: rightLine,
          rightContent: rightLine
        });
        leftIndex++;
        rightIndex++;
        leftLineNumber++;
        rightLineNumber++;
        removed++;
        added++;
      }
    }

    return { lines, stats: { added, removed } };
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getLineClass = (type: string) => {
    switch (type) {
      case 'add':
        return 'bg-green-50 border-l-2 border-green-500';
      case 'remove':
        return 'bg-red-50 border-l-2 border-red-500';
      case 'normal':
        return 'bg-background';
      default:
        return 'bg-background';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold">Diff Viewer</h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-600">
              <Plus className="h-3 w-3 mr-1" />
              +{stats.added}
            </Badge>
            <Badge variant="outline" className="text-red-600">
              <Minus className="h-3 w-3 mr-1" />
              -{stats.removed}
            </Badge>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Version Headers */}
      <div className="grid grid-cols-2 border-b">
        <div className="p-4 border-r">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Version {leftVersion.version}</h4>
              <div className="text-sm text-muted-foreground">
                {formatDate(leftVersion.created_at)}
              </div>
            </div>
            <Badge variant="outline" className={leftVersion.status === 'active' ? 'text-green-600' : ''}>
              {leftVersion.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
              {leftVersion.sha256.substring(0, 12)}...
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(leftVersion.sha256)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Version {rightVersion.version}</h4>
              <div className="text-sm text-muted-foreground">
                {formatDate(rightVersion.created_at)}
              </div>
            </div>
            <Badge variant="outline" className={rightVersion.status === 'active' ? 'text-green-600' : ''}>
              {rightVersion.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
              {rightVersion.sha256.substring(0, 12)}...
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(rightVersion.sha256)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Diff Content */}
      <ScrollArea className="flex-1">
        <div className="font-mono text-sm">
          {diffLines.map((line, index) => (
            <div
              key={index}
              className={cn(
                'grid grid-cols-2 border-b border-border/50',
                getLineClass(line.type)
              )}
            >
              {/* Left side */}
              <div className="p-2 border-r border-border/50">
                <div className="flex">
                  <span className="w-12 text-xs text-muted-foreground mr-2 text-right flex-shrink-0">
                    {line.leftNumber || ''}
                  </span>
                  <span className="flex-1 whitespace-pre-wrap">
                    {line.type === 'add' ? '' : (line.leftContent || line.content)}
                  </span>
                </div>
              </div>
              
              {/* Right side */}
              <div className="p-2">
                <div className="flex">
                  <span className="w-12 text-xs text-muted-foreground mr-2 text-right flex-shrink-0">
                    {line.rightNumber || ''}
                  </span>
                  <span className="flex-1 whitespace-pre-wrap">
                    {line.type === 'remove' ? '' : (line.rightContent || line.content)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {diffLines.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <ArrowLeftRight className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No differences found</p>
            <p className="text-sm">Both versions have identical content</p>
          </div>
        </div>
      )}
    </div>
  );
}