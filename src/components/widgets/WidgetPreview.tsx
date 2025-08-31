import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor, Smartphone, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Widget } from "@/hooks/useWidgets";

interface WidgetPreviewProps {
  widget: Widget | null;
  previewConfig?: {
    name: string;
    theme: {
      color_primary?: string;
      text_color?: string;
      logo_url?: string;
      welcome_text?: string;
    };
  };
}

export function WidgetPreview({ widget, previewConfig }: WidgetPreviewProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Force iframe refresh when widget or preview config changes
  useEffect(() => {
    setIframeKey(prev => prev + 1);
  }, [widget, previewConfig]);

  const refreshPreview = () => {
    setIframeKey(prev => prev + 1);
  };

  if (!widget && !previewConfig) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Widget Preview</CardTitle>
          <CardDescription>
            Select or create a widget to see the preview
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96 bg-muted rounded-lg">
            <p className="text-muted-foreground">No widget selected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const config = previewConfig || widget;
  if (!config) return null;

  // Build iframe URL with preview parameters
  const currentOrigin = window.location.origin;
  const siteKey = widget?.site_key || 'preview-key';
  
  const opts = {
    colorPrimary: config.theme.color_primary || '#007bff',
    textColor: config.theme.text_color || '#333333',
    logoUrl: config.theme.logo_url || '',
    welcomeText: config.theme.welcome_text || 'Hello! How can I help you today?'
  };

  const iframeUrl = `/public/widget/frame.html?site_key=${encodeURIComponent(siteKey)}&origin=${encodeURIComponent(currentOrigin)}&opts=${encodeURIComponent(JSON.stringify(opts))}`;

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          Widget Preview
          {widget && (
            <Badge variant="secondary" className="text-xs">
              {widget.name}
            </Badge>
          )}
          {previewConfig && !widget && (
            <Badge variant="outline" className="text-xs">
              Preview Mode
            </Badge>
          )}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Live preview of your widget with current settings
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-6 min-h-[500px] flex items-center justify-center">
            {/* View Mode Toggle */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <div className="flex items-center border rounded-lg p-1 bg-white/90 backdrop-blur-sm">
                <Button
                  variant={viewMode === 'desktop' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('desktop')}
                  className="h-8 px-3"
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'mobile' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('mobile')}
                  className="h-8 px-3"
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={refreshPreview} className="bg-white/90 backdrop-blur-sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Preview Container */}
            <div 
              className={`relative bg-white rounded-lg shadow-lg transition-all duration-300 ${
                viewMode === 'desktop' 
                  ? 'w-[400px] h-[600px]' 
                  : 'w-[320px] h-[500px]'
              }`}
            >
              <iframe
                key={iframeKey}
                src={iframeUrl}
                className="w-full h-full rounded-lg border-0"
                title="Widget Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>

            {/* Preview Overlay Info */}
            <div className="absolute top-4 left-4">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm">
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>
                    <span className="font-medium">View:</span> {viewMode}
                  </div>
                  <div>
                    <span className="font-medium">Theme:</span> {config.theme.color_primary}
                  </div>
                  {config.theme.logo_url && (
                    <div>
                      <span className="font-medium">Logo:</span> ✓
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Preview Note */}
          <div className="p-4 bg-muted/50 rounded-b-lg border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Preview Note:</strong> This shows how your widget will appear on websites. 
              Changes to theme settings will be reflected automatically.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}