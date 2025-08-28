import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BatchDependency {
  id: string;
  batch_id: string;
  depends_on_batch_id: string;
  min_version: number;
  dependency_name: string;
  current_version?: number | null;
}

interface ScriptBatch {
  id: string;
  name: string;
  active_version?: number | null;
}

interface BatchDependenciesTabProps {
  batchId?: string;
  canEdit: boolean;
  onDependencyChange?: () => void;
}

export function BatchDependenciesTab({ batchId, canEdit, onDependencyChange }: BatchDependenciesTabProps) {
  const [dependencies, setDependencies] = useState<BatchDependency[]>([]);
  const [availableBatches, setAvailableBatches] = useState<ScriptBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [minVersion, setMinVersion] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    if (batchId) {
      fetchDependencies();
    }
    fetchAvailableBatches();
  }, [batchId]);

  const fetchDependencies = async () => {
    if (!batchId) return;

    try {
      const { data, error } = await supabase
        .from('batch_dependencies')
        .select(`
          *,
          dependency_batch:script_batches!depends_on_batch_id (
            name,
            active_version
          )
        `)
        .eq('batch_id', batchId);

      if (error) throw error;

      const formattedDependencies = data?.map(dep => ({
        id: dep.id,
        batch_id: dep.batch_id,
        depends_on_batch_id: dep.depends_on_batch_id,
        min_version: dep.min_version,
        dependency_name: dep.dependency_batch?.name || 'Unknown Batch',
        current_version: dep.dependency_batch?.active_version || null
      })) || [];

      setDependencies(formattedDependencies);
    } catch (error) {
      console.error('Error fetching dependencies:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dependencies',
        variant: 'destructive',
      });
    }
  };

  const fetchAvailableBatches = async () => {
    try {
      const { data, error } = await supabase
        .from('script_batches')
        .select('id, name, active_version')
        .order('name');

      if (error) throw error;

      // Filter out current batch to prevent self-dependency
      const filtered = data?.filter(batch => batch.id !== batchId) || [];
      setAvailableBatches(filtered);
    } catch (error) {
      console.error('Error fetching available batches:', error);
      toast({
        title: 'Error',
        description: 'Failed to load available batches',
        variant: 'destructive',
      });
    }
  };

  const handleAddDependency = async () => {
    if (!selectedBatchId || !batchId) return;

    setAdding(true);
    try {
      const { error } = await supabase
        .from('batch_dependencies')
        .insert({
          batch_id: batchId,
          depends_on_batch_id: selectedBatchId,
          min_version: minVersion,
        });

      if (error) throw error;

      // Log the dependency addition
      const selectedBatch = availableBatches.find(b => b.id === selectedBatchId);
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          customer_id: (await supabase.from('script_batches').select('customer_id').eq('id', batchId).single()).data?.customer_id,
          actor: (await supabase.auth.getUser()).data.user?.email || 'unknown',
          action: 'batch_dependency_add',
          target: `batch_dependency:${selectedBatch?.name}`,
          meta: {
            batch_id: batchId,
            depends_on_batch_id: selectedBatchId,
            min_version: minVersion
          }
        });

      toast({
        title: 'Dependency Added',
        description: `Dependency on ${selectedBatch?.name} v${minVersion}+ added successfully`,
      });

      setSelectedBatchId('');
      setMinVersion(1);
      await fetchDependencies();
      onDependencyChange?.();
    } catch (error: any) {
      console.error('Error adding dependency:', error);
      toast({
        title: 'Error',
        description: error.message?.includes('duplicate') 
          ? 'This dependency already exists'
          : 'Failed to add dependency',
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveDependency = async (dependencyId: string, dependencyName: string) => {
    if (!canEdit) return;

    try {
      const { error } = await supabase
        .from('batch_dependencies')
        .delete()
        .eq('id', dependencyId);

      if (error) throw error;

      // Log the dependency removal
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          customer_id: (await supabase.from('script_batches').select('customer_id').eq('id', batchId).single()).data?.customer_id,
          actor: (await supabase.auth.getUser()).data.user?.email || 'unknown',
          action: 'batch_dependency_remove',
          target: `batch_dependency:${dependencyName}`,
          meta: {
            batch_id: batchId,
            dependency_id: dependencyId
          }
        });

      toast({
        title: 'Dependency Removed',
        description: `Dependency on ${dependencyName} removed successfully`,
      });

      await fetchDependencies();
      onDependencyChange?.();
    } catch (error) {
      console.error('Error removing dependency:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove dependency',
        variant: 'destructive',
      });
    }
  };

  const getDependencyStatus = (dependency: BatchDependency) => {
    if (dependency.current_version === null) {
      return { status: 'inactive', label: 'No Active Version', variant: 'destructive' as const };
    } else if (dependency.current_version < dependency.min_version) {
      return { 
        status: 'outdated', 
        label: `v${dependency.current_version} < v${dependency.min_version}`, 
        variant: 'destructive' as const 
      };
    } else {
      return { 
        status: 'satisfied', 
        label: `v${dependency.current_version} ≥ v${dependency.min_version}`, 
        variant: 'default' as const 
      };
    }
  };

  return (
    <div className="space-y-6">
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Dependency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-[2fr_1fr_auto] gap-4">
              <div className="space-y-2">
                <Label>Batch</Label>
                <Select
                  value={selectedBatchId}
                  onValueChange={setSelectedBatchId}
                  disabled={!canEdit || adding}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBatches
                      .filter(batch => !dependencies.some(dep => dep.depends_on_batch_id === batch.id))
                      .map((batch) => (
                        <SelectItem key={batch.id} value={batch.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{batch.name}</span>
                            {batch.active_version && (
                              <Badge variant="outline" className="ml-2">
                                v{batch.active_version}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Min Version</Label>
                <Input
                  type="number"
                  min={1}
                  value={minVersion}
                  onChange={(e) => setMinVersion(parseInt(e.target.value) || 1)}
                  disabled={!canEdit || adding}
                />
              </div>
              
              <div className="flex items-end">
                <Button
                  onClick={handleAddDependency}
                  disabled={!selectedBatchId || !canEdit || adding}
                  className="whitespace-nowrap"
                >
                  {adding ? 'Adding...' : 'Add'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Dependencies</CardTitle>
        </CardHeader>
        <CardContent>
          {dependencies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No dependencies defined</p>
              <p className="text-sm">This batch can run independently</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Name</TableHead>
                  <TableHead>Required Version</TableHead>
                  <TableHead>Current Status</TableHead>
                  {canEdit && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {dependencies.map((dependency) => {
                  const status = getDependencyStatus(dependency);
                  return (
                    <TableRow key={dependency.id}>
                      <TableCell className="font-medium">
                        {dependency.dependency_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          v{dependency.min_version}+
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveDependency(dependency.id, dependency.dependency_name)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}