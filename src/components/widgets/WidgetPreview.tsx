import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor, Smartphone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Widget } from "@/hooks/useWidgets";
import { ChatDemo } from "@/components/chat/ChatDemo";

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
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

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

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Interactive Preview
          {widget && (
            <Badge variant="secondary" className="text-xs">
              {widget.name}
            </Badge>
          )}
          {previewConfig && !widget && (
            <Badge variant="outline" className="text-xs">
              Live Demo
            </Badge>
          )}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Test your theme settings with this interactive chat demo
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-6 min-h-[500px] flex items-center justify-center">
            {/* View Mode Toggle */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
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
            </div>

            {/* Chat Demo Container */}
            <div 
              className={`relative transition-all duration-300 ${
                viewMode === 'desktop' 
                  ? 'w-full max-w-4xl h-[80vh]' 
                  : 'w-[380px] h-[600px]'
              }`}
            >
              {/* Apply theme customization via CSS variables */}
              <div
                style={{
                  '--primary': config.theme.color_primary || '#007bff',
                  '--primary-foreground': '#ffffff',
                  '--muted': '#f8f9fa',
                  '--muted-foreground': config.theme.text_color || '#333333',
                  '--background': '#ffffff',
                  '--foreground': config.theme.text_color || '#333333',
                } as React.CSSProperties}
                className="w-full h-full"
              >
                <ChatDemo currentRoute="/widget-preview" />
              </div>
            </div>

            {/* Theme Info Overlay */}
            <div className="absolute top-4 left-4 z-10">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm">
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>
                    <span className="font-medium">View:</span> {viewMode}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Theme:</span>
                    <div 
                      className="w-3 h-3 rounded border"
                      style={{ backgroundColor: config.theme.color_primary }}
                    ></div>
                    <span className="text-xs">{config.theme.color_primary}</span>
                  </div>
                  {config.theme.logo_url && (
                    <div>
                      <span className="font-medium">Logo:</span> ✓
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Name:</span> {config.name}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Note */}
          <div className="p-4 bg-muted/50 rounded-b-lg border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Interactive Demo:</strong> This is the full ChatDemo system with your theme settings applied. 
              You can interact with agents, run commands, and test all functionality as users would experience it.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}