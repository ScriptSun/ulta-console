import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, AlertTriangle, CheckCircle } from 'lucide-react';
import { BatchDependencyWarningModal } from './BatchDependencyWarningModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DependencyValidation {
  is_valid: boolean;
  missing_dependencies: string[];
  outdated_dependencies: string[];
}

interface BatchQuickRunModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: {
    id: string;
    name: string;
    active_version?: number | null;
  } | null;
  onRunSuccess?: () => void;
}

export function BatchQuickRunModal({
  open,
  onOpenChange,
  batch,
  onRunSuccess
}: BatchQuickRunModalProps) {
  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<DependencyValidation | null>(null);
  const [showDependencyWarning, setShowDependencyWarning] = useState(false);
  
  const { toast } = useToast();

  const handleQuickRun = async () => {
    if (!batch?.id) return;

    setLoading(true);
    try {
      // First validate dependencies
      const { data, error } = await supabase.functions.invoke('script-batches', {
        body: {
          action: 'validate_dependencies',
          batch_id: batch.id
        }
      });

      if (error) throw error;

      const validation = data?.validation;
      setValidationResult(validation);

      if (!validation?.is_valid) {
        // Show dependency warning modal
        setShowDependencyWarning(true);
        setLoading(false);
        return;
      }

      // Dependencies are satisfied, proceed with execution
      await proceedWithExecution();
    } catch (error) {
      console.error('Error validating dependencies:', error);
      toast({
        title: 'Validation Error',
        description: 'Failed to validate batch dependencies',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const proceedWithExecution = async () => {
    if (!batch?.id) return;

    try {
      // Here you would typically call your batch execution endpoint
      // For now, we'll simulate the execution
      toast({
        title: 'Batch Executed',
        description: `Batch "${batch.name}" has been queued for execution`,
      });

      onRunSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error executing batch:', error);
      toast({
        title: 'Execution Error',
        description: 'Failed to execute batch',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProceedAnyway = async () => {
    setShowDependencyWarning(false);
    await proceedWithExecution();
  };

  const handleCancel = () => {
    setShowDependencyWarning(false);
    setLoading(false);
  };

  if (!batch) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Quick Run Batch
            </DialogTitle>
            <DialogDescription>
              Execute batch "{batch.name}" immediately
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Batch:</span>
                <span>{batch.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Active Version:</span>
                {batch.active_version ? (
                  <Badge variant="default">v{batch.active_version}</Badge>
                ) : (
                  <Badge variant="destructive">No Active Version</Badge>
                )}
              </div>
            </div>

            {!batch.active_version && (
              <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Cannot Execute</span>
                </div>
                <p className="text-sm text-destructive/80 mt-1">
                  This batch has no active version. Please activate a version before running.
                </p>
              </div>
            )}

            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                This will immediately execute the batch on available agents. 
                Dependencies will be validated before execution.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleQuickRun}
              disabled={!batch.active_version || loading}
              className="bg-gradient-primary hover:bg-primary-dark"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent mr-2" />
                  Validating...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Now
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {validationResult && (
        <BatchDependencyWarningModal
          open={showDependencyWarning}
          onOpenChange={setShowDependencyWarning}
          batchName={batch.name}
          validation={validationResult}
          onProceed={handleProceedAnyway}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}