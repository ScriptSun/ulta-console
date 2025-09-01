import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { WidgetEditForm } from "@/components/widgets/WidgetEditForm";
import { EnhancedWidgetPreview } from "@/components/widgets/EnhancedWidgetPreview";
import { EmbedCodeGenerator } from "@/components/widgets/EmbedCodeGenerator";
import { useWidgets } from "@/hooks/useWidgets";
import { toast } from "@/components/ui/use-toast";

export default function WidgetEdit() {
  const { widgetId } = useParams<{ widgetId: string }>();
  const navigate = useNavigate();
  const { widgets, loading, updateWidget } = useWidgets();
  const [saving, setSaving] = useState(false);
  const [previewConfig, setPreviewConfig] = useState<any>(null);

  const widget = widgets.find(w => w.id === widgetId);

  useEffect(() => {
    if (!loading && !widget && widgetId) {
      toast({
        title: "Widget not found",
        description: "The widget you're looking for doesn't exist.",
        variant: "destructive"
      });
      navigate("/widget-management");
    }
  }, [widget, loading, widgetId, navigate]);

  const handleSave = async (widgetId: string | null, data: any) => {
    if (!widget) return;
    
    setSaving(true);
    try {
      await updateWidget(widget.id, data);
      toast({
        title: "Widget updated",
        description: "Your widget has been successfully updated.",
      });
      navigate("/widget-management");
    } catch (error) {
      toast({
        title: "Update failed",
        description: "There was an error updating your widget. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate("/widget-management");
  };

  // Handle live preview updates
  const handlePreviewUpdate = (formData: any) => {
    setPreviewConfig({
      name: formData.name || widget?.name || 'Preview',
      theme: formData.theme
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading widget...</p>
        </div>
      </div>
    );
  }

  if (!widget) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCancel}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Widget Management
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              Edit widget / <span className="text-primary">{widget.name}</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={() => window.open(`/widget-management?preview=${widget.id}`, '_blank')}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview in New Tab
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column - Edit Form */}
        <div>
          <WidgetEditForm
            widget={widget}
            onSave={handleSave}
            onCancel={handleCancel}
            saving={saving}
            onPreviewUpdate={handlePreviewUpdate}
          />
        </div>

        {/* Right Column - Preview Only */}
        <div className="space-y-6">
          {/* Widget Preview */}
              <EnhancedWidgetPreview 
                widget={widget}
                previewConfig={previewConfig}
              />

          {/* Widget Info */}
          <Card>
            <CardHeader>
              <CardTitle>Widget Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Site Key</label>
                <div className="mt-1 p-2 bg-muted rounded-md font-mono text-sm break-all">
                  {widget.site_key}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Allowed Domains</label>
                <div className="mt-1 space-y-1">
                  {widget.allowed_domains.map((domain, index) => (
                    <div key={index} className="p-2 bg-muted rounded-md text-sm">
                      {domain}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <div className="mt-1 text-sm">
                  {new Date(widget.created_at).toLocaleDateString()} at {new Date(widget.created_at).toLocaleTimeString()}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <div className="mt-1 text-sm">
                  {new Date(widget.updated_at).toLocaleDateString()} at {new Date(widget.updated_at).toLocaleTimeString()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}