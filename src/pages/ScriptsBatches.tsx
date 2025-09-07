import { useState, useEffect } from 'react';
import { Plus, Search, Filter, FileText, Copy, MoreVertical, Link, AlertTriangle, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BatchDrawer } from '@/components/scripts/BatchDrawer';
import { BatchDetailDrawer } from '@/components/scripts/BatchDetailDrawer';
import { BatchQuickRunModal } from '@/components/scripts/BatchQuickRunModal';
import { api } from '@/lib/api-wrapper';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { useAuth } from '@/contexts/AuthContext';

interface ScriptBatch {
  id: string;
  name: string;
  key?: string;
  description?: string;
  os_targets: string[];
  risk: 'low' | 'medium' | 'high';
  max_timeout_sec: number;
  per_agent_concurrency: number;
  per_tenant_concurrency: number;
  active_version?: number;
  auto_version: boolean;
  created_at: string;
  updated_at: string;
  customer_id: string;
  created_by: string;
  updated_by: string;
  latest_version?: {
    version: number;
    sha256: string;
    status: string;
  };
  dependencies_count?: number;
  dependencies_preview?: string;
  inputs_schema?: any;
  inputs_defaults?: any;
  render_config?: any;
}

const riskColors = {
  low: 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/1 shadow-sm',
  medium: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 shadow-amber-500/1 shadow-sm',
  high: 'bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-400 border border-red-500/30 shadow-red-500/1 shadow-sm'
};

export default function ScriptsBatches() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [batches, setBatches] = useState<ScriptBatch[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<ScriptBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [osFilter, setOSFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<ScriptBatch | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [quickRunModalOpen, setQuickRunModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<'viewer' | 'editor' | 'approver' | 'admin'>('admin');

  useEffect(() => {
    fetchBatches();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('script-batches-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'script_batches'
        },
        () => {
          fetchBatches();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'script_batch_versions'
        },
        () => {
          fetchBatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterBatches();
  }, [batches, searchQuery, statusFilter, osFilter, riskFilter]);

  const fetchBatches = async () => {
    console.log('Fetching batches - user authenticated:', !!user);
    
    try {
      setLoading(true);
      
      // Use direct Supabase client with shorter timeout for better performance
      const { data: batchData, error: batchError } = await supabase
        .from('script_batches')
        .select(`
          id,
          name,
          key,
          description,
          os_targets,
          risk,
          max_timeout_sec,
          per_agent_concurrency,
          per_tenant_concurrency,
          active_version,
          auto_version,
          created_at,
          updated_at,
          customer_id,
          created_by,
          updated_by,
          inputs_schema,
          inputs_defaults,
          render_config
        `)
        .order('updated_at', { ascending: false })
        .limit(50); // Reduced limit for faster loading

      if (batchError) {
        console.error('Batches query error:', batchError);
        throw batchError;
      }

      console.log('Batches loaded:', batchData?.length || 0);

      if (!batchData || batchData.length === 0) {
        setBatches([]);
        return;
      }

      // Simple processing without complex joins for faster loading
      const processedBatches: ScriptBatch[] = batchData.map(batch => ({
        ...batch,
        risk: batch.risk as 'low' | 'medium' | 'high',
        latest_version: null, // Will load separately if needed
        dependencies_count: 0,
        dependencies_preview: '',
      }));

      setBatches(processedBatches);

      // Load additional data asynchronously for better UX
      loadBatchMetadata(batchData.map(b => b.id));
      
    } catch (error: any) {
      console.error('Error fetching batches:', error);
      
      // Provide more detailed error information
      let errorMessage = 'Failed to load script batches';
      if (error?.message?.includes('timeout') || error?.message?.includes('timed out')) {
        errorMessage = 'Request timed out. The server may be slow. Please try again.';
      } else if (error?.message?.includes('Failed to fetch') || error?.code === 'NETWORK_ERROR') {
        errorMessage = 'Network connection failed. Check your internet connection.';
      } else if (error?.code === 'PGRST116' || error?.message?.includes('permission')) {
        errorMessage = 'Access denied. You may not have permission to view batches.';
      } else if (error?.message) {
        errorMessage = `Database error: ${error.message}`;
      }

      toast({
        title: 'Loading Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  // Load additional metadata asynchronously to avoid blocking initial load
  const loadBatchMetadata = async (batchIds: string[]) => {
    if (batchIds.length === 0) return;

    try {
      // Load versions and dependencies separately with shorter timeouts
      const [versionsData, dependenciesData] = await Promise.allSettled([
        supabase
          .from('script_batch_versions')
          .select('batch_id, version, sha256, status')
          .in('batch_id', batchIds)
          .order('batch_id')
          .order('version', { ascending: false }),
        
        supabase
          .from('batch_dependencies')
          .select('batch_id, min_version')
          .in('batch_id', batchIds)
      ]);

      // Process versions
      const versionsMap = new Map();
      if (versionsData.status === 'fulfilled' && versionsData.value.data) {
        for (const version of versionsData.value.data) {
          if (!versionsMap.has(version.batch_id)) {
            versionsMap.set(version.batch_id, version);
          }
        }
      }

      // Process dependencies count
      const depsCountMap = new Map();
      if (dependenciesData.status === 'fulfilled' && dependenciesData.value.data) {
        for (const dep of dependenciesData.value.data) {
          const count = depsCountMap.get(dep.batch_id) || 0;
          depsCountMap.set(dep.batch_id, count + 1);
        }
      }

      // Update batches with metadata
      setBatches(prevBatches => 
        prevBatches.map(batch => ({
          ...batch,
          latest_version: versionsMap.get(batch.id) || null,
          dependencies_count: depsCountMap.get(batch.id) || 0,
        }))
      );

    } catch (error) {
      console.log('Failed to load batch metadata (non-critical):', error);
    }
  };

  const filterBatches = () => {
    let filtered = batches;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(batch =>
        batch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (batch.description && batch.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(batch => batch.active_version !== null);
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(batch => batch.active_version === null);
      }
    }

    // OS filter
    if (osFilter !== 'all') {
      filtered = filtered.filter(batch =>
        batch.os_targets.includes(osFilter)
      );
    }

    // Risk filter
    if (riskFilter !== 'all') {
      filtered = filtered.filter(batch => batch.risk === riskFilter);
    }

    setFilteredBatches(filtered);
  };

  const handleNewBatch = () => {
    setSelectedBatch(null);
    setDrawerOpen(true);
  };

  const handleViewBatch = (batch: ScriptBatch) => {
    setSelectedBatch(batch);
    setDetailDrawerOpen(true);
  };

  const handleEditBatch = (batch: ScriptBatch) => {
    setSelectedBatch(batch);
    setDrawerOpen(true);
  };

  const handleDuplicateBatch = async (batch: ScriptBatch) => {
    try {
      const { error } = await api.invokeFunction('script-batches', {
        action: 'duplicate',
        batch_id: batch.id
      });

      if (error) throw error;

      toast({
        title: 'Batch Duplicated',
        description: `${batch.name} has been duplicated successfully`,
      });

      fetchBatches();
    } catch (error) {
      console.error('Error duplicating batch:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate batch',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteBatch = async (batch: ScriptBatch) => {
    if (!confirm(`Are you sure you want to delete "${batch.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await api
        .from('script_batches')
        .delete()
        .eq('id', batch.id);

      if (error) throw error;

      toast({
        title: 'Batch Deleted',
        description: `${batch.name} has been deleted successfully`,
      });

      fetchBatches();
    } catch (error) {
      console.error('Error deleting batch:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete batch',
        variant: 'destructive',
      });
    }
  };

  const handleToggleStatus = async (batch: ScriptBatch) => {
    // Log current state for debugging
    console.log('Toggle status for batch:', batch.name, 'Current active_version:', batch.active_version, 'Latest version:', batch.latest_version?.version);
    
    const isCurrentlyActive = batch.active_version !== null && batch.active_version !== undefined;
    const newStatus = isCurrentlyActive ? null : batch.latest_version?.version;
    const actionType = isCurrentlyActive ? 'deactivate' : 'activate';
    
    console.log('Will', actionType, 'batch. Setting active_version to:', newStatus);
    
    // Check if we have a version to activate
    if (!isCurrentlyActive && !batch.latest_version?.version) {
      toast({
        title: 'Cannot Activate',
        description: 'This batch has no versions to activate',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Both activation and deactivation now use direct database updates
      const currentUser = await api.getCurrentUser();
      const response = await api
        .from('script_batches')
        .update({ 
          active_version: newStatus,
          updated_by: currentUser.data?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', batch.id);

      if (!response.success) throw new Error(response.error);

      const successMessage = actionType === 'activate' ? 'Batch Activated' : 'Batch Deactivated';
      const description = `${batch.name} has been ${actionType}d successfully`;

      toast({
        title: successMessage,
        description: description,
      });

      // Refresh the data to show updated status
      console.log('Refreshing batches after', actionType);
      fetchBatches();
    } catch (error) {
      console.error(`Error ${actionType}ing batch:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${actionType} batch: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleQuickRun = (batch: ScriptBatch) => {
    setSelectedBatch(batch);
    setQuickRunModalOpen(true);
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

  const canEdit = userRole === 'editor' || userRole === 'approver' || userRole === 'admin';
  const canActivate = userRole === 'approver' || userRole === 'admin';

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Batches</h1>
            {/* Statistics Badge */}
            <Badge variant="outline" className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium">
              <FileText className="h-4 w-4" />
              {batches.length} Batches
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Batch script templates and versioned releases
          </p>
        </div>
        
        <Button onClick={handleNewBatch} disabled={!canEdit}>
          <Plus className="h-4 w-4 mr-2" />
          New Batch
        </Button>
      </div>

      {/* Connection Status - Simplified */}
      {batches.length === 0 && !loading && (
        <Card className="border-warning">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <div>
                  <p className="font-medium">No Batches Found</p>
                  <p className="text-sm text-muted-foreground">Try refreshing or check your permissions</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchBatches}
                disabled={loading}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search batches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={osFilter} onValueChange={setOSFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="OS" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All OS</SelectItem>
            <SelectItem value="ubuntu">Ubuntu</SelectItem>
            <SelectItem value="debian">Debian</SelectItem>
            <SelectItem value="almalinux">AlmaLinux</SelectItem>
            <SelectItem value="windows">Windows</SelectItem>
          </SelectContent>
        </Select>

        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Risk" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredBatches.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Name</TableHead>
                  <TableHead>Script Keys</TableHead>
                  <TableHead>Latest SHA256</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Max Timeout</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{batch.name}</span>
                        {batch.dependencies_count > 0 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                  <Link className="h-3 w-3" />
                                  {batch.dependencies_count}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <p className="font-semibold">Requires:</p>
                                <p className="text-sm">{batch.dependencies_preview}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {batch.key ? (
                        <div className="flex flex-col">
                          <span className="text-primary font-mono text-sm font-semibold">
                            {batch.key}
                          </span>
                          {batch.description && (
                            <p className="text-xs text-muted-foreground mt-1 max-w-xs line-clamp-2">
                              {batch.description.length > 80 
                                ? `${batch.description.substring(0, 80)}...` 
                                : batch.description
                              }
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {batch.latest_version?.sha256 ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono text-xs">
                            {batch.latest_version.sha256.substring(0, 8)}...
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(batch.latest_version!.sha256)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("text-xs", riskColors[batch.risk])}
                      >
                        {batch.risk.charAt(0).toUpperCase() + batch.risk.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{batch.max_timeout_sec}s</TableCell>
                    <TableCell>
                      <Badge
                        variant={batch.active_version ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {batch.active_version ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(batch.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background border shadow-lg z-50">
                          <DropdownMenuItem onClick={() => handleViewBatch(batch)}>
                            View
                          </DropdownMenuItem>
                          {canEdit && (
                            <>
                              <DropdownMenuItem onClick={() => handleEditBatch(batch)}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicateBatch(batch)}>
                                Duplicate
                              </DropdownMenuItem>
                            </>
                          )}
                          {canActivate && (
                            <DropdownMenuItem onClick={() => handleToggleStatus(batch)}>
                              {batch.active_version ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                          )}
                          {batch.active_version && (
                            <DropdownMenuItem onClick={() => handleQuickRun(batch)}>
                              Quick Run
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleViewBatch(batch)}>
                            History
                          </DropdownMenuItem>
                          {canActivate && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteBatch(batch)}
                                className="text-destructive"
                              >
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {batches.length === 0 ? 'No script batches yet' : 'No batches match your filters'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {batches.length === 0 
                  ? 'Create your first batch to get started with script management'
                  : 'Try adjusting your search criteria or filters'
                }
              </p>
              {batches.length === 0 && canEdit && (
                <Button onClick={handleNewBatch}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Batch
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch Drawers */}
      <BatchDrawer
        batch={selectedBatch}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={fetchBatches}
        userRole={userRole}
      />

      <BatchDetailDrawer
        batch={selectedBatch}
        isOpen={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        onSuccess={fetchBatches}
        userRole={userRole}
      />

      <BatchQuickRunModal
        batch={selectedBatch}
        open={quickRunModalOpen}
        onOpenChange={setQuickRunModalOpen}
        onRunSuccess={fetchBatches}
      />
    </div>
  );
}