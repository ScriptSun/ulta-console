import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Copy, CheckCircle, Code, Settings, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Widget } from "@/hooks/useWidgets";

interface EmbedCodeGeneratorProps {
  widget: Widget | null;
}

export function EmbedCodeGenerator({ widget }: EmbedCodeGeneratorProps) {
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // Client-side override options
  const [overrides, setOverrides] = useState({
    enabled: false,
    position: 'bottom-right',
    width: '400px',
    height: '600px',
    colorPrimary: widget?.theme.color_primary || '#007bff',
    textColor: widget?.theme.text_color || '#333333',
    welcomeText: widget?.theme.welcome_text || '',
    logoUrl: widget?.theme.logo_url || ''
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(label);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy the code manually",
        variant: "destructive",
      });
    }
  };

  if (!widget) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Embed Code Generator
          </CardTitle>
          <CardDescription>
            Select a widget to generate embed code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 bg-muted rounded-lg">
            <p className="text-muted-foreground">No widget selected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generate embed code based on current settings
  const generateBasicEmbedCode = () => {
    const baseUrl = window.location.origin;
    return `<script src="${baseUrl}/sdk/v1.js"></script>
<script>
  AltaAIWidget.load('${widget.site_key}');
</script>`;
  };

  const generateAdvancedEmbedCode = () => {
    const baseUrl = window.location.origin;
    const opts: any = {};
    
    if (overrides.enabled) {
      if (overrides.position !== 'bottom-right') opts.position = overrides.position;
      if (overrides.width !== '400px') opts.width = overrides.width;
      if (overrides.height !== '600px') opts.height = overrides.height;
      if (overrides.colorPrimary !== widget.theme.color_primary) opts.colorPrimary = overrides.colorPrimary;
      if (overrides.textColor !== widget.theme.text_color) opts.textColor = overrides.textColor;
      if (overrides.welcomeText && overrides.welcomeText !== widget.theme.welcome_text) opts.welcomeText = overrides.welcomeText;
      if (overrides.logoUrl && overrides.logoUrl !== widget.theme.logo_url) opts.logoUrl = overrides.logoUrl;
    }

    const hasOverrides = Object.keys(opts).length > 0;

    return `<script src="${baseUrl}/sdk/v1.js"></script>
<script>
  AltaAIWidget.load('${widget.site_key}'${hasOverrides ? `,
    ${JSON.stringify(opts, null, 4)}` : ''});
</script>`;
  };

  const generateAutoLoadCode = () => {
    const baseUrl = window.location.origin;
    const dataAttrs = [];
    dataAttrs.push(`data-altaai-site-key="${widget.site_key}"`);
    
    if (overrides.enabled) {
      if (overrides.position !== 'bottom-right') dataAttrs.push(`data-altaai-position="${overrides.position}"`);
      if (overrides.width !== '400px') dataAttrs.push(`data-altaai-width="${overrides.width}"`);
      if (overrides.height !== '600px') dataAttrs.push(`data-altaai-height="${overrides.height}"`);
      if (overrides.colorPrimary !== widget.theme.color_primary) dataAttrs.push(`data-altaai-colorprimary="${overrides.colorPrimary}"`);
      if (overrides.textColor !== widget.theme.text_color) dataAttrs.push(`data-altaai-textcolor="${overrides.textColor}"`);
      if (overrides.welcomeText && overrides.welcomeText !== widget.theme.welcome_text) dataAttrs.push(`data-altaai-welcometext="${overrides.welcomeText}"`);
      if (overrides.logoUrl && overrides.logoUrl !== widget.theme.logo_url) dataAttrs.push(`data-altaai-logourl="${overrides.logoUrl}"`);
    }

    return `<script src="${baseUrl}/sdk/v1.js"
  ${dataAttrs.join('\n  ')}
></script>`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="h-5 w-5" />
          Embed Code Generator
        </CardTitle>
        <CardDescription>
          Generate embed code for <Badge variant="secondary">{widget.name}</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Client-side Overrides */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">Client-side Overrides</Label>
              <p className="text-sm text-muted-foreground">
                Override server theme settings in the embed code
              </p>
            </div>
            <Switch
              checked={overrides.enabled}
              onCheckedChange={(enabled) => setOverrides(prev => ({ ...prev, enabled }))}
            />
          </div>

          {overrides.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <select
                  id="position"
                  value={overrides.position}
                  onChange={(e) => setOverrides(prev => ({ ...prev, position: e.target.value }))}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md"
                >
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="top-left">Top Left</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="width">Width</Label>
                <Input
                  id="width"
                  value={overrides.width}
                  onChange={(e) => setOverrides(prev => ({ ...prev, width: e.target.value }))}
                  placeholder="400px"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  value={overrides.height}
                  onChange={(e) => setOverrides(prev => ({ ...prev, height: e.target.value }))}
                  placeholder="600px"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="overrideColorPrimary">Primary Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={overrides.colorPrimary}
                    onChange={(e) => setOverrides(prev => ({ ...prev, colorPrimary: e.target.value }))}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={overrides.colorPrimary}
                    onChange={(e) => setOverrides(prev => ({ ...prev, colorPrimary: e.target.value }))}
                    placeholder="#007bff"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="overrideTextColor">Text Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={overrides.textColor}
                    onChange={(e) => setOverrides(prev => ({ ...prev, textColor: e.target.value }))}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={overrides.textColor}
                    onChange={(e) => setOverrides(prev => ({ ...prev, textColor: e.target.value }))}
                    placeholder="#333333"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="overrideLogoUrl">Logo URL</Label>
                <Input
                  id="overrideLogoUrl"
                  value={overrides.logoUrl}
                  onChange={(e) => setOverrides(prev => ({ ...prev, logoUrl: e.target.value }))}
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="overrideWelcomeText">Welcome Message</Label>
                <Textarea
                  id="overrideWelcomeText"
                  value={overrides.welcomeText}
                  onChange={(e) => setOverrides(prev => ({ ...prev, welcomeText: e.target.value }))}
                  placeholder="Custom welcome message"
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Embed Code Tabs */}
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="autoload">Auto-load</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Basic Embed Code</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Simple embed code with default settings
              </p>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                  <code>{generateBasicEmbedCode()}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(generateBasicEmbedCode(), "Basic embed code")}
                >
                  {copiedCode === "Basic embed code" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Advanced Embed Code</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Embed code with custom options and overrides
              </p>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                  <code>{generateAdvancedEmbedCode()}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(generateAdvancedEmbedCode(), "Advanced embed code")}
                >
                  {copiedCode === "Advanced embed code" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="autoload" className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Auto-load Embed Code</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Single script tag with data attributes for auto-loading
              </p>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                  <code>{generateAutoLoadCode()}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(generateAutoLoadCode(), "Auto-load embed code")}
                >
                  {copiedCode === "Auto-load embed code" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Implementation Notes */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Implementation Notes</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Place the script tags before the closing <code>&lt;/body&gt;</code> tag</li>
            <li>• The widget will automatically check domain permissions</li>
            <li>• Client-side overrides take precedence over server settings</li>
            <li>• Widget loads asynchronously and won't block page rendering</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}