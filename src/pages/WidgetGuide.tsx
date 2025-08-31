import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Plus, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWidgets, Widget, NewWidget } from "@/hooks/useWidgets";
import { WidgetList } from "@/components/widgets/WidgetList";
import { WidgetEditForm } from "@/components/widgets/WidgetEditForm";
import { WidgetPreview } from "@/components/widgets/WidgetPreview";
import { EmbedCodeGenerator } from "@/components/widgets/EmbedCodeGenerator";

export default function WidgetGuide() {
  const { widgets, loading, createWidget, updateWidget, refetch } = useWidgets();
  const { toast } = useToast();
  
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewConfig, setPreviewConfig] = useState<any>(null);

  // Auto-select first widget when widgets load
  useEffect(() => {
    if (widgets.length > 0 && !selectedWidget) {
      setSelectedWidget(widgets[0]);
    }
  }, [widgets, selectedWidget]);

  const handleCreateWidget = () => {
    setIsCreating(true);
    setEditingWidget(null);
    setSelectedWidget(null);
    setPreviewConfig({
      name: 'New Widget',
      theme: {
        color_primary: '#007bff',
        text_color: '#333333',
        logo_url: '',
        welcome_text: 'Hello! How can I help you today?'
      }
    });
  };

  const handleEditWidget = (widget: Widget) => {
    setEditingWidget(widget);
    setIsCreating(false);
    setSelectedWidget(widget);
    setPreviewConfig(null);
  };

  const handleSaveWidget = async (widgetId: string | null, data: NewWidget) => {
    setSaving(true);
    try {
      if (widgetId) {
        // Update existing widget
        await updateWidget(widgetId, data);
        const updatedWidget = widgets.find(w => w.id === widgetId);
        if (updatedWidget) {
          setSelectedWidget({ ...updatedWidget, ...data });
        }
      } else {
        // Create new widget
        const result = await createWidget(data);
        if (result) {
          // Find the newly created widget and select it
          await refetch();
          // The new widget will be selected automatically via useEffect
        }
      }
      
      setEditingWidget(null);
      setIsCreating(false);
      setPreviewConfig(null);
      
      // Refresh preview after 1 second
      setTimeout(() => {
        setPreviewConfig(null);
      }, 1000);
      
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingWidget(null);
    setIsCreating(false);
    setPreviewConfig(null);
    
    // Restore previous selection
    if (widgets.length > 0 && !selectedWidget) {
      setSelectedWidget(widgets[0]);
    }
  };

  const handleRefresh = async () => {
    await refetch();
    toast({
      title: "Refreshed",
      description: "Widget list has been refreshed",
    });
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
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleCreateWidget}>
            <Plus className="h-4 w-4 mr-2" />
            Create Widget
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={isCreating || editingWidget ? "edit" : "list"} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="list">Widget List</TabsTrigger>
          <TabsTrigger value="edit" disabled={!isCreating && !editingWidget}>
            {isCreating ? 'Create Widget' : 'Edit Widget'}
          </TabsTrigger>
          <TabsTrigger value="preview" disabled={!selectedWidget && !previewConfig}>
            Preview
          </TabsTrigger>
          <TabsTrigger value="embed" disabled={!selectedWidget}>
            Embed Code
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <WidgetList />
        </TabsContent>

        <TabsContent value="edit" className="space-y-6">
          <WidgetEditForm
            widget={editingWidget}
            onSave={handleSaveWidget}
            onCancel={handleCancelEdit}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <WidgetPreview
            widget={selectedWidget}
            previewConfig={previewConfig}
          />
        </TabsContent>

        <TabsContent value="embed" className="space-y-6">
          <EmbedCodeGenerator widget={selectedWidget} />
        </TabsContent>
      </Tabs>

      {/* Side Panel for Preview (when editing) */}
      {(isCreating || editingWidget) && (
        <div className="fixed right-4 top-4 bottom-4 w-96 z-50">
          <div className="h-full bg-background border rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Live Preview</h3>
              <p className="text-sm text-muted-foreground">
                Preview updates as you edit
              </p>
            </div>
            <div className="p-4 h-full overflow-auto">
              <WidgetPreview
                widget={editingWidget}
                previewConfig={previewConfig}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}