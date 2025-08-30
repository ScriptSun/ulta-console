import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Settings2, 
  Copy, 
  AlertCircle,
  Trash2
} from 'lucide-react';
import { PlansTable } from '@/components/plans/PlansTable';
import { PlansEditorDrawer } from '@/components/plans/PlansEditorDrawer';
import { Plan } from '@/types/planTypes';
import { planStorage } from '@/utils/planStorage';
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

export default function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; plan: Plan | null }>({
    open: false,
    plan: null
  });
  const [duplicateDialog, setDuplicateDialog] = useState<{ open: boolean; plan: Plan | null }>({
    open: false,
    plan: null
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = () => {
    try {
      const allPlans = planStorage.getPlans();
      setPlans(allPlans);
    } catch (error) {
      console.error('Error loading plans:', error);
      toast({
        title: 'Error',
        description: 'Failed to load plans',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = () => {
    setSelectedPlan(null);
    setIsDrawerOpen(true);
  };

  const handleEditPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsDrawerOpen(true);
  };

  const handleDuplicatePlan = (plan: Plan) => {
    setDuplicateDialog({ open: true, plan });
  };

  const confirmDuplicate = () => {
    if (!duplicateDialog.plan) return;

    try {
      const newName = `${duplicateDialog.plan.name} (Copy)`;
      const newSlug = `${duplicateDialog.plan.slug}-copy`;
      
      planStorage.duplicatePlan(
        duplicateDialog.plan.id,
        newName,
        newSlug
      );
      
      toast({
        title: 'Plan Duplicated',
        description: `Plan "${newName}" has been created`,
      });
      
      loadPlans();
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

  const handleToggleStatus = (plan: Plan) => {
    try {
      planStorage.togglePlanStatus(plan.id);
      toast({
        title: 'Plan Updated',
        description: `Plan "${plan.name}" has been ${plan.enabled ? 'disabled' : 'enabled'}`,
      });
      loadPlans();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update plan status',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePlan = (plan: Plan) => {
    setDeleteDialog({ open: true, plan });
  };

  const confirmDelete = () => {
    if (!deleteDialog.plan) return;

    try {
      planStorage.deletePlan(deleteDialog.plan.id);
      toast({
        title: 'Plan Deleted',
        description: `Plan "${deleteDialog.plan.name}" has been deleted`,
      });
      loadPlans();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete plan',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialog({ open: false, plan: null });
    }
  };

  const handleSuccess = () => {
    loadPlans();
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plans.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <Badge className="bg-success/10 text-success border-success/20">
              Active
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {plans.filter(p => p.enabled).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg AI Limit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {plans.length > 0 
                ? Math.round(plans.reduce((sum, p) => sum + p.limits.ai_requests, 0) / plans.length).toLocaleString()
                : '0'
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest Version</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              v{plans.length > 0 ? Math.max(...plans.map(p => p.version)) : '0'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plans Table */}
      <PlansTable
        plans={plans}
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