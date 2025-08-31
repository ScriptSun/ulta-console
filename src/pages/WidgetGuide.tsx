import { Button } from "@/components/ui/button";
import { Settings, RefreshCw, TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { WidgetList } from "@/components/widgets/WidgetList";

export default function WidgetGuide() {
  const { toast } = useToast();

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
    </div>
  );
}