import { useState, useEffect } from 'react';
import { Plus, Search, Filter, FileText, Copy, MoreVertical } from 'lucide-react';
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
  latest_version?: {
    version: number;
    sha256: string;
    status: string;
  };
}

const riskColors = {
  low: 'text-green-600 bg-green-50 border-green-200',
  medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  high: 'text-red-600 bg-red-50 border-red-200'
};

export default function ScriptsBatches() {
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
  const [userRole, setUserRole] = useState<'viewer' | 'editor' | 'approver' | 'admin'>('viewer');
  
  const { toast } = useToast();

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
    try {
      // Fetch batches with their latest version info
      const { data: batchData, error: batchError } = await supabase
        .from('script_batches')
        .select(`
          *,
          script_batch_versions!inner (
            version,
            sha256,
            status
          )
        `)
        .order('updated_at', { ascending: false });

      if (batchError) throw batchError;

      // If no batches exist, seed with demo data
      if (!batchData || batchData.length === 0) {
        await seedDemoBatches();
        // Fetch again after seeding
        const { data: newBatchData, error: fetchError } = await supabase
          .from('script_batches')
          .select(`
            *,
            script_batch_versions!inner (
              version,
              sha256,
              status
            )
          `)
          .order('updated_at', { ascending: false });
        
        if (fetchError) throw fetchError;
        
        // Process the new data
        const processedBatches = newBatchData?.map(batch => {
          const versions = batch.script_batch_versions || [];
          const latestVersion = versions.reduce((latest: any, current: any) => {
            return (!latest || current.version > latest.version) ? current : latest;
          }, null);

          return {
            ...batch,
            latest_version: latestVersion,
            script_batch_versions: undefined
          };
        }) || [];

        setBatches(processedBatches as ScriptBatch[]);
      } else {
        // Process the existing data
        const processedBatches = batchData?.map(batch => {
          const versions = batch.script_batch_versions || [];
          const latestVersion = versions.reduce((latest: any, current: any) => {
            return (!latest || current.version > latest.version) ? current : latest;
          }, null);

          return {
            ...batch,
            latest_version: latestVersion,
            script_batch_versions: undefined // Remove the nested data
          };
        }) || [];

        setBatches(processedBatches as ScriptBatch[]);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
      toast({
        title: 'Error',
        description: 'Failed to load script batches',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const seedDemoBatches = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('No authenticated user found');
        return;
      }

      // Use the user's ID as the customer_id for demo purposes
      const demoCustomerId = user.id;

      const demoBatches = [
        {
          name: 'System Health Check',
          customer_id: demoCustomerId,
          os_targets: ['ubuntu', 'debian'],
          risk: 'low',
          max_timeout_sec: 300,
          auto_version: true,
          created_by: user.id,
          updated_by: user.id
        },
        {
          name: 'Security Audit Script',
          customer_id: demoCustomerId,
          os_targets: ['ubuntu', 'debian', 'almalinux'],
          risk: 'medium',
          max_timeout_sec: 600,
          auto_version: false,
          created_by: user.id,
          updated_by: user.id
        }
      ];

      console.log('Attempting to create demo batches with customer_id:', demoCustomerId);

      // Create the batches
      const { data: createdBatches, error: batchError } = await supabase
        .from('script_batches')
        .insert(demoBatches)
        .select();

      if (batchError) {
        console.error('Error creating demo batches:', batchError);
        toast({
          title: 'Demo Setup Issue',
          description: `Database error: ${batchError.message}`,
          variant: 'destructive',
        });
        return;
      }

      console.log('Demo batches created successfully:', createdBatches);

      // Create demo versions for each batch
      const demoScripts = [
        {
          // System Health Check script
          source: `#!/bin/bash

# System Health Check Script
# Performs basic system health monitoring

echo "=== System Health Check ==="
echo "Timestamp: $(date)"
echo

# Check system uptime
echo "System Uptime:"
uptime
echo

# Check disk usage
echo "Disk Usage:"
df -h | head -n 5
echo

# Check memory usage
echo "Memory Usage:"
free -h
echo

# Check CPU load
echo "CPU Load Average:"
cat /proc/loadavg
echo

# Check running processes
echo "Top Processes by CPU:"
ps aux --sort=-%cpu | head -n 6
echo

echo "=== Health Check Complete ==="`,
          notes: 'Initial version of system health monitoring script'
        },
        {
          // Security Audit script
          source: `#!/bin/bash

# Security Audit Script
# Performs basic security checks on the system

echo "=== Security Audit Started ==="
echo "Timestamp: $(date)"
echo

# Check for unauthorized users
echo "Checking user accounts:"
awk -F: '$3 >= 1000 {print $1}' /etc/passwd
echo

# Check SSH configuration
echo "SSH Configuration Check:"
if [ -f /etc/ssh/sshd_config ]; then
    echo "SSH config file exists"
    grep -E "^(PasswordAuthentication|PermitRootLogin)" /etc/ssh/sshd_config || echo "Default SSH settings"
else
    echo "SSH config not found"
fi
echo

# Check for failed login attempts
echo "Recent Failed Login Attempts:"
grep "Failed password" /var/log/auth.log 2>/dev/null | tail -n 5 || echo "No recent failed attempts found"
echo

# Check running services
echo "Active Network Services:"
ss -tuln | head -n 10
echo

# Check file permissions on sensitive files
echo "Checking critical file permissions:"
ls -l /etc/passwd /etc/shadow /etc/group 2>/dev/null || echo "Some files not accessible"
echo

echo "=== Security Audit Complete ==="`,
          notes: 'Basic security audit with login and configuration checks'
        }
      ];

      // Create versions for each batch
      for (let i = 0; i < createdBatches.length; i++) {
        const batch = createdBatches[i];
        const script = demoScripts[i];
        
        // Calculate SHA256 (simplified for demo)
        const sha256 = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(script.source));
        const hashArray = Array.from(new Uint8Array(sha256));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        const { error: versionError } = await supabase
          .from('script_batch_versions')
          .insert({
            batch_id: batch.id,
            version: 1,
            sha256: hashHex,
            size_bytes: new TextEncoder().encode(script.source).length,
            source: script.source,
            notes: script.notes,
            status: 'active',
            created_by: user.id
          });

        if (versionError) {
          console.error('Error creating demo version:', versionError);
        }

        // Update batch to set active_version
        await supabase
          .from('script_batches')
          .update({ active_version: 1 })
          .eq('id', batch.id);
      }

      toast({
        title: 'Demo Batches Created',
        description: 'Two demo script batches have been added for testing purposes',
      });

    } catch (error) {
      console.error('Error in seedDemoBatches:', error);
      toast({
        title: 'Demo Setup Error',
        description: 'Failed to create demo batches - check console for details',
        variant: 'destructive',
      });
    }
  };

  const filterBatches = () => {
    let filtered = batches;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(batch =>
        batch.name.toLowerCase().includes(searchQuery.toLowerCase())
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
      const { error } = await supabase.functions.invoke('script-batches', {
        body: {
          action: 'duplicate',
          batch_id: batch.id
        }
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
      const { error } = await supabase
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
    const newStatus = batch.active_version ? null : batch.latest_version?.version;
    
    try {
      if (newStatus) {
        // Activate the latest version
        const { error } = await supabase.functions.invoke('script-batches', {
          body: {
            action: 'activate',
            batch_id: batch.id,
            version: newStatus
          }
        });

        if (error) throw error;
      } else {
        // Deactivate by setting active_version to null
        const { error } = await supabase
          .from('script_batches')
          .update({ active_version: null })
          .eq('id', batch.id);

        if (error) throw error;
      }

      toast({
        title: newStatus ? 'Batch Activated' : 'Batch Deactivated',
        description: `${batch.name} has been ${newStatus ? 'activated' : 'deactivated'}`,
      });

      fetchBatches();
    } catch (error) {
      console.error('Error toggling batch status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update batch status',
        variant: 'destructive',
      });
    }
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
          <h1 className="text-3xl font-bold">Batches</h1>
          <p className="text-muted-foreground mt-1">
            Batch script templates and versioned releases
          </p>
        </div>
        <Button onClick={handleNewBatch} disabled={!canEdit}>
          <Plus className="h-4 w-4 mr-2" />
          New Batch
        </Button>
      </div>

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
                  <TableHead>OS Targets</TableHead>
                  <TableHead>Latest Version</TableHead>
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
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {batch.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {batch.os_targets.map((os) => (
                          <Badge key={os} variant="outline" className="text-xs">
                            {os}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {batch.latest_version ? `v${batch.latest_version.version}` : 'No versions'}
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
    </div>
  );
}