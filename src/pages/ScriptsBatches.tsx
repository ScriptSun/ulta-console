import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EnhancedBatchesTable } from '@/components/scripts/EnhancedBatchesTable';
import { useToast } from '@/hooks/use-toast';

// Use the same interface as EnhancedBatchesTable for consistency
interface ScriptBatch {
  id: string;
  batch_name: string;
  script_keys: string[];
  latest_sha256: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  max_timeout_sec: number;
  status: 'active' | 'inactive' | 'deprecated' | 'testing';
  updated_at: string;
  created_at: string;
  version_count: number;
  last_run?: string;
  success_rate?: number;
}

export default function ScriptsBatches() {
  const { toast } = useToast();

  const handleViewBatch = (batch: ScriptBatch) => {
    // Handle view batch
    console.log('View batch:', batch);
  };

  const handleEditBatch = (batch: ScriptBatch) => {
    // Handle edit batch
    console.log('Edit batch:', batch);
  };

  const handleDeleteBatch = (batch: ScriptBatch) => {
    // Handle batch deletion
    console.log('Delete batch:', batch);
    toast({
      title: 'Batch Deleted',
      description: `${batch.batch_name} has been deleted successfully`,
    });
  };

  const handleBatchRun = (batch: ScriptBatch) => {
    // Handle batch run
    console.log('Run batch:', batch);
    toast({
      title: 'Batch Started',
      description: `${batch.batch_name} has been queued for execution`,
    });
  };

  const handleViewVersions = (batch: ScriptBatch) => {
    // Handle view versions
    console.log('View versions for batch:', batch);
  };

  const handleViewLogs = (batch: ScriptBatch) => {
    // Handle view logs
    console.log('View logs for batch:', batch);
  };

  const handleNewBatch = () => {
    // Handle new batch creation
    console.log('Create new batch');
    toast({
      title: 'Feature Coming Soon',
      description: 'Batch creation functionality will be available soon',
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Script Batches</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Batch script templates and versioned releases
          </p>
        </div>
        
        <Button onClick={handleNewBatch}>
          <Plus className="h-4 w-4 mr-2" />
          New Batch
        </Button>
      </div>

      {/* Enhanced Table */}
      <EnhancedBatchesTable
        onBatchClick={handleViewBatch}
        onBatchEdit={handleEditBatch}
        onBatchDelete={handleDeleteBatch}
        onBatchRun={handleBatchRun}
        onViewVersions={handleViewVersions}
        onViewLogs={handleViewLogs}
      />
    </div>
  );
}