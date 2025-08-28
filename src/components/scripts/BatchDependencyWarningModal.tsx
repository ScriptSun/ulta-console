import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, X } from 'lucide-react';

interface DependencyValidation {
  is_valid: boolean;
  missing_dependencies: string[];
  outdated_dependencies: string[];
}

interface BatchDependencyWarningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchName: string;
  validation: DependencyValidation;
  onProceed?: () => void;
  onCancel?: () => void;
}

export function BatchDependencyWarningModal({
  open,
  onOpenChange,
  batchName,
  validation,
  onProceed,
  onCancel
}: BatchDependencyWarningModalProps) {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleProceed = () => {
    onProceed?.();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Dependency Requirements Not Met
          </AlertDialogTitle>
          <AlertDialogDescription>
            Batch '<strong>{batchName}</strong>' has unmet dependencies that may cause execution to fail.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {validation.missing_dependencies.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-destructive flex items-center gap-2">
                <X className="h-4 w-4" />
                Missing Dependencies ({validation.missing_dependencies.length})
              </h4>
              <div className="space-y-1">
                {validation.missing_dependencies.map((dep, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Badge variant="destructive" className="text-xs">
                      Missing
                    </Badge>
                    <span>{dep}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {validation.outdated_dependencies.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Outdated Dependencies ({validation.outdated_dependencies.length})
              </h4>
              <div className="space-y-1">
                {validation.outdated_dependencies.map((dep, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Badge variant="destructive" className="text-xs">
                      Outdated
                    </Badge>
                    <span>{dep}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Recommendation:</strong> Ensure all required dependencies are active and meet the minimum version requirements before running this batch.
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleProceed}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Proceed Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}