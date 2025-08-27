import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Play, 
  Download, 
  GitCompare, 
  MoreVertical,
  RotateCcw,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ScriptBatch {
  id: string;
  name: string;
  active_version?: number;
}

interface BatchVersion {
  id: string;
  batch_id: string;
  version: number;
  sha256: string;
  size_bytes: number;
  source: string;
  notes?: string;
  status: string;
  created_at: string;
  created_by: string;
}

interface BatchVersionsTabProps {
  batch: ScriptBatch;
  versions: BatchVersion[];
  selectedVersion: BatchVersion | null;
  onVersionSelect: (version: BatchVersion) => void;
  onCompareSelect: (version: BatchVersion) => void;
  onActivate: (version: BatchVersion) => void;
  onDownload: (version: BatchVersion) => void;
  canActivate: boolean;
  loading: boolean;
}

export function BatchVersionsTab({
  batch,
  versions,
  selectedVersion,
  onVersionSelect,
  onCompareSelect,
  onActivate,
  onDownload,
  canActivate,
  loading
}: BatchVersionsTabProps) {
  const [compareMode, setCompareMode] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50 border-green-200';
      case 'draft': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'archived': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Versions ({versions.length})</h3>
          {compareMode && (
            <Badge variant="outline" className="text-xs">
              Compare Mode
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={compareMode ? "default" : "outline"}
            size="sm"
            onClick={() => setCompareMode(!compareMode)}
          >
            <GitCompare className="h-4 w-4 mr-2" />
            {compareMode ? 'Exit Compare' : 'Compare'}
          </Button>
        </div>
      </div>

      {/* Versions Table */}
      <ScrollArea className="flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>SHA256</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.map((version) => (
              <TableRow 
                key={version.id}
                className={cn(
                  "cursor-pointer hover:bg-muted/50",
                  selectedVersion?.id === version.id && "bg-muted",
                  compareMode && "hover:bg-blue-50"
                )}
                onClick={() => {
                  if (compareMode) {
                    onCompareSelect(version);
                    setCompareMode(false);
                  } else {
                    onVersionSelect(version);
                  }
                }}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    v{version.version}
                    {version.status === 'active' && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {version.sha256.substring(0, 8)}...
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(version.sha256);
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>{formatFileSize(version.size_bytes)}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("text-xs", getStatusColor(version.status))}
                  >
                    {version.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {new Date(version.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(version.created_at).toLocaleTimeString()}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm max-w-[200px] truncate">
                    {version.notes || '-'}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-background border shadow-lg z-50">
                      {canActivate && version.status !== 'active' && (
                        <>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              onActivate(version);
                            }}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Activate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload(version);
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onCompareSelect(version);
                        }}
                      >
                        <GitCompare className="h-4 w-4 mr-2" />
                        Compare
                      </DropdownMenuItem>
                      
                      {canActivate && version.status !== 'active' && (
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Implement rollback functionality
                          }}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Roll back to this version
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>

      {versions.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p>No versions found</p>
            <p className="text-sm">Create a version to see it here</p>
          </div>
        </div>
      )}
    </div>
  );
}