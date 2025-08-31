import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings, RefreshCw, TestTube, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { WidgetList } from "@/components/widgets/WidgetList";
import { WidgetEditForm } from "@/components/widgets/WidgetEditForm";
import { useWidgets, NewWidget } from "@/hooks/useWidgets";
import { useState } from "react";

export default function WidgetGuide() {
  const { toast } = useToast();
  const { createWidget, refetch } = useWidgets();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleRefresh = () => {
    window.location.reload();
    toast({
      title: "Refreshed",
      description: "Widget list has been refreshed",
    });
  };

  const handleOpenQAChecklist = () => {
    window.open('/qa-checklist', '_blank');
  };

  const handleCreateWidget = async (widgetId: string | null, data: NewWidget) => {
    try {
      setSaving(true);
      await createWidget(data);
      setIsCreateDialogOpen(false);
      refetch();
      toast({
        title: "Widget Created",
        description: "Your widget has been created successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create widget. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            Widget Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure and manage your chat widget embed codes with live preview
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Widget
          </Button>
          <Button variant="outline" onClick={handleOpenQAChecklist}>
            <TestTube className="h-4 w-4 mr-2" />
            Test
          </Button>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <WidgetList />

      {/* Create Widget Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Widget</DialogTitle>
          </DialogHeader>
          <WidgetEditForm
            widget={null}
            onSave={handleCreateWidget}
            onCancel={() => setIsCreateDialogOpen(false)}
            saving={saving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}