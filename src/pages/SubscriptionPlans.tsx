import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Copy, 
  Trash2
} from 'lucide-react';
import { PlansTable } from '@/components/plans/PlansTable';
import { PlansEditorDrawer } from '@/components/plans/PlansEditorDrawer';
import { PlansStatsCards } from '@/components/plans/PlansStatsCards';
import { useSubscriptionPlans, SubscriptionPlan } from '@/hooks/useSubscriptionPlans';
import { useToast } from '@/hooks/use-toast';
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

export default function SubscriptionPlans() {
  const { 
    plans, 
    planUsageStats, 
    loading, 
    totalAgents, 
    totalUsage, 
    avgAiLimit,
    togglePlanStatus,
    deletePlan,
    refetch 
  } = useSubscriptionPlans();
  
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; plan: SubscriptionPlan | null }>({
    open: false,
    plan: null
  });
  const [duplicateDialog, setDuplicateDialog] = useState<{ open: boolean; plan: SubscriptionPlan | null }>({
    open: false,
    plan: null
  });
  const { toast } = useToast();

  const handleCreatePlan = () => {
    setSelectedPlan(null);
    setIsDrawerOpen(true);
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setIsDrawerOpen(true);
  };

  const handleDuplicatePlan = (plan: SubscriptionPlan) => {
    setDuplicateDialog({ open: true, plan });
  };

  const confirmDuplicate = async () => {
    if (!duplicateDialog.plan) return;

    try {
      const newName = `${duplicateDialog.plan.name} (Copy)`;
      const newKey = `${duplicateDialog.plan.key}_copy`;
      const newSlug = `${duplicateDialog.plan.slug}-copy`;
      
      // TODO: Implement duplicate functionality in useSubscriptionPlans hook
      toast({
        title: 'Feature Coming Soon',
        description: 'Plan duplication will be implemented soon',
        variant: 'destructive',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to duplicate plan';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setDuplicateDialog({ open: false, plan: null });
    }
  };

  const handleToggleStatus = (plan: SubscriptionPlan) => {
    togglePlanStatus(plan.id);
  };

  const handleDeletePlan = (plan: SubscriptionPlan) => {
    setDeleteDialog({ open: true, plan });
  };

  const confirmDelete = () => {
    if (!deleteDialog.plan) return;
    deletePlan(deleteDialog.plan.id);
    setDeleteDialog({ open: false, plan: null });
  };

  const handleSuccess = () => {
    refetch();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-2"></div>
          <div className="h-4 bg-muted rounded w-96"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Subscription Plans</h1>
          <p className="text-muted-foreground">
            Configure subscription plans for your company
          </p>
        </div>
        <Button onClick={handleCreatePlan}>
          <Plus className="h-4 w-4 mr-2" />
          Create Plan
        </Button>
      </div>

      {/* Stats Cards */}
      <PlansStatsCards
        plans={plans}
        planUsageStats={planUsageStats}
        totalAgents={totalAgents}
        totalUsage={totalUsage}
        avgAiLimit={avgAiLimit}
      />

      {/* Plans Table */}
      <PlansTable
        plans={plans}
        planUsageStats={planUsageStats}
        onEdit={handleEditPlan}
        onDuplicate={handleDuplicatePlan}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDeletePlan}
      />

      {/* Plans Editor Drawer */}
      <PlansEditorDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        plan={selectedPlan}
        onSuccess={handleSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={deleteDialog.open} 
        onOpenChange={(open) => setDeleteDialog({ open, plan: deleteDialog.plan })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Plan
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the plan "{deleteDialog.plan?.name}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Confirmation Dialog */}
      <AlertDialog 
        open={duplicateDialog.open} 
        onOpenChange={(open) => setDuplicateDialog({ open, plan: duplicateDialog.plan })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-primary" />
              Duplicate Plan
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will create a copy of "{duplicateDialog.plan?.name}" with the name 
              "{duplicateDialog.plan?.name} (Copy)". You can edit the details after creation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDuplicate}>
              Duplicate Plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}