import { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  History, 
  Info, 
  Shield, 
  Play, 
  Pause, 
  Download,
  GitCompare,
  Copy
} from 'lucide-react';
import { BatchCodeEditor } from './BatchCodeEditor';
import { BatchDiffViewer } from './BatchDiffViewer';
import { BatchRunsTable } from './BatchRunsTable';
import { BatchRunDetailsDrawer } from './BatchRunDetailsDrawer';
import { BatchVersionsTab } from './BatchVersionsTab';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ScriptBatch {
  id: string;
  name: string;
  os_targets: string[];
  risk: 'low' | 'medium' | 'high';
  max_timeout_sec: number;
  active_version?: number;
  auto_version: boolean;
  created_at: string;
  updated_at: string;
  customer_id: string;
  created_by: string;
  updated_by: string;
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

interface BatchDetailDrawerProps {
  batch: ScriptBatch | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userRole: 'viewer' | 'editor' | 'approver' | 'admin';
}

const riskColors = {
  low: 'text-green-600 bg-green-50 border-green-200',
  medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  high: 'text-red-600 bg-red-50 border-red-200'
};

export function BatchDetailDrawer({ batch, isOpen, onClose, onSuccess, userRole }: BatchDetailDrawerProps) {
  const [versions, setVersions] = useState<BatchVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<BatchVersion | null>(null);
  const [compareVersion, setCompareVersion] = useState<BatchVersion | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('versions');
  
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [runDetailsOpen, setRunDetailsOpen] = useState(false);
  const { toast } = useToast();
  const canActivate = userRole === 'approver' || userRole === 'admin';

  useEffect(() => {
    if (batch && isOpen) {
      fetchVersions();
    }
  }, [batch, isOpen]);

  const fetchVersions = async () => {
    if (!batch) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('script_batch_versions')
        .select('*')
        .eq('batch_id', batch.id)
        .order('version', { ascending: false });

      if (error) throw error;

      setVersions((data || []) as BatchVersion[]);
      
      // Set selected version to active version or latest
      const activeVersion = (data || []).find(v => v.status === 'active') as BatchVersion | undefined;
      const latestVersion = (data || [])[0] as BatchVersion | undefined;
      setSelectedVersion(activeVersion || latestVersion || null);
    } catch (error) {
      console.error('Error fetching versions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load batch versions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleActivateVersion = async (version: BatchVersion) => {
    if (!canActivate) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to activate versions',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('script-batches', {
        body: {
          action: 'activate',
          batch_id: batch!.id,
          version: version.version
        }
      });

      if (error) throw error;

      toast({
        title: 'Version Activated',
        description: `Version ${version.version} has been activated`,
      });

      fetchVersions();
      onSuccess();
    } catch (error) {
      console.error('Error activating version:', error);
      toast({
        title: 'Error',
        description: 'Failed to activate version',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadVersion = async (version: BatchVersion) => {
    const blob = new Blob([version.source], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${batch?.name || 'script'}_v${version.version}.sh`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied',
        description: 'SHA256 copied to clipboard',
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getStatusIcon = () => {
    return batch?.active_version ? (
      <Play className="h-4 w-4 text-green-600" />
    ) : (
      <Pause className="h-4 w-4 text-gray-600" />
    );
  };

  if (!batch) return null;

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-w-6xl mx-auto h-[90vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="flex items-center gap-3">
                <FileText className="h-5 w-5" />
                {batch.name}
                <div className="flex items-center gap-2">
                  {getStatusIcon()}
                  <Badge
                    variant={batch.active_version ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {batch.active_version ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </DrawerTitle>
              <DrawerDescription className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">OS:</span>
                  {batch.os_targets.map((os) => (
                    <Badge key={os} variant="outline" className="text-xs">
                      {os}
                    </Badge>
                  ))}
                </div>
                <Badge
                  variant="outline"
                  className={cn("text-xs", riskColors[batch.risk])}
                >
                  {batch.risk.charAt(0).toUpperCase() + batch.risk.slice(1)} Risk
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Timeout: {batch.max_timeout_sec}s
                </span>
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0">
              <TabsTrigger value="versions" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Versions
              </TabsTrigger>
              <TabsTrigger value="source" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Source
              </TabsTrigger>
              <TabsTrigger value="metadata" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Metadata
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security
              </TabsTrigger>
              {compareVersion && (
                <TabsTrigger value="diff" className="flex items-center gap-2">
                  <GitCompare className="h-4 w-4" />
                  Diff
                </TabsTrigger>
              )}
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="versions" className="h-full m-0">
                <BatchVersionsTab
                  batch={batch}
                  versions={versions}
                  selectedVersion={selectedVersion}
                  onVersionSelect={setSelectedVersion}
                  onCompareSelect={setCompareVersion}
                  onActivate={handleActivateVersion}
                  onDownload={handleDownloadVersion}
                  canActivate={canActivate}
                  loading={loading}
                />
              </TabsContent>

              <TabsContent value="source" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    {selectedVersion ? (
                      <BatchCodeEditor
                        content={selectedVersion.source}
                        onChange={() => {}} // Read-only
                        readOnly={true}
                        className="h-full"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        Select a version to view source code
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="metadata" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Batch Information</h3>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm text-muted-foreground">Name:</span>
                            <p className="font-medium">{batch.name}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Risk Level:</span>
                            <Badge
                              variant="outline"
                              className={cn("ml-2 text-xs", riskColors[batch.risk])}
                            >
                              {batch.risk.charAt(0).toUpperCase() + batch.risk.slice(1)}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Max Timeout:</span>
                            <p className="font-medium">{batch.max_timeout_sec} seconds</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Auto Version:</span>
                            <Badge variant={batch.auto_version ? "default" : "secondary"} className="ml-2 text-xs">
                              {batch.auto_version ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Timestamps</h3>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm text-muted-foreground">Created:</span>
                            <p className="font-medium">{new Date(batch.created_at).toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Updated:</span>
                            <p className="font-medium">{new Date(batch.updated_at).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {selectedVersion && (
                      <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold mb-4">Version {selectedVersion.version} Details</h3>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <div>
                              <span className="text-sm text-muted-foreground">Status:</span>
                              <Badge 
                                variant={selectedVersion.status === 'active' ? "default" : "secondary"}
                                className="ml-2 text-xs"
                              >
                                {selectedVersion.status}
                              </Badge>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Size:</span>
                              <p className="font-medium">{(selectedVersion.size_bytes / 1024).toFixed(1)} KB</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Created:</span>
                              <p className="font-medium">{new Date(selectedVersion.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <span className="text-sm text-muted-foreground">SHA256:</span>
                              <div className="flex items-center gap-2 mt-1">
                                <code className="text-xs font-mono bg-muted p-2 rounded flex-1 break-all">
                                  {selectedVersion.sha256}
                                </code>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyToClipboard(selectedVersion.sha256)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            {selectedVersion.notes && (
                              <div>
                                <span className="text-sm text-muted-foreground">Notes:</span>
                                <p className="font-medium">{selectedVersion.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="security" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="p-6 space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Security Information</h3>
                      
                      {selectedVersion && (
                        <div className="space-y-4">
                          <div className="p-4 border rounded-lg">
                            <h4 className="font-medium mb-2">Version {selectedVersion.version} Security</h4>
                            <div className="space-y-2">
                              <div>
                                <span className="text-sm text-muted-foreground">SHA256 Hash:</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <code className="text-xs font-mono bg-muted p-2 rounded flex-1 break-all">
                                    {selectedVersion.sha256}
                                  </code>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(selectedVersion.sha256)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <div>
                                <span className="text-sm text-muted-foreground">Status:</span>
                                <Badge 
                                  variant={selectedVersion.status === 'active' ? "default" : "secondary"}
                                  className="ml-2 text-xs"
                                >
                                  {selectedVersion.status}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 border rounded-lg">
                            <h4 className="font-medium mb-2">Risk Assessment</h4>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn("text-xs", riskColors[batch.risk])}
                              >
                                {batch.risk.charAt(0).toUpperCase() + batch.risk.slice(1)} Risk
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                Based on script content and configuration
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              {compareVersion && selectedVersion && (
                <TabsContent value="diff" className="h-full m-0">
                  <BatchDiffViewer
                    leftVersion={selectedVersion}
                    rightVersion={compareVersion}
                    onClose={() => {
                      setCompareVersion(null);
                      setActiveTab('versions');
                    }}
                  />
                </TabsContent>
              )}
            </div>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
}