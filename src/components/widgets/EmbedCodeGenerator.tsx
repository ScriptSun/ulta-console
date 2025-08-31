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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
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

  // Advanced options state
  const [displayMode, setDisplayMode] = useState('standard'); // 'standard' or 'open'
  const [advancedOptions, setAdvancedOptions] = useState({
    hideOnMobile: false,
    showBadge: true,
    enableEvents: false,
    userIdentification: false,
    programmaticControl: false
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
    // Use the deployed Lovable domain for the SDK URL
    const sdkUrl = 'https://preview--ultaai-console.lovable.app/sdk/v1.js';
    
    return `<script src="${sdkUrl}"></script>
<script>
  UltaAIWidget.load('${widget.site_key}');
</script>`;
  };

  const generateAdvancedEmbedCode = () => {
    // Use the deployed Lovable domain for the SDK URL
    const sdkUrl = 'https://preview--ultaai-console.lovable.app/sdk/v1.js';
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

    // Add advanced options
    if (displayMode === 'open') opts.autoOpen = true;
    if (advancedOptions.hideOnMobile) opts.hideOnMobile = true;
    if (!advancedOptions.showBadge) opts.showBadge = false;
    
    // Add event handlers if enabled
    let eventHandlers = '';
    if (advancedOptions.enableEvents) {
      eventHandlers = `,
    onReady: function() {
      console.log('🤖 UltaAI widget is ready');
    },
    onOpen: function() {
      console.log('Widget opened');
    },
    onClose: function() {
      console.log('Widget closed');
    },
    onMessage: function(message) {
      console.log('New message:', message);
    }`;
    }

    // Add user identification if enabled
    let userIdCode = '';
    if (advancedOptions.userIdentification) {
      userIdCode = `,
    userId: 'user_12345',
    userEmail: 'user@example.com',
    userName: 'John Doe'`;
    }

    const hasOverrides = Object.keys(opts).length > 0 || eventHandlers || userIdCode;

    let baseCode = `<script src="${sdkUrl}"></script>
<script>
  UltaAIWidget.load('${widget.site_key}'${hasOverrides ? `,
    ${JSON.stringify(opts, null, 4).slice(1, -1)}${eventHandlers}${userIdCode}
  }` : ''});`;

    if (advancedOptions.programmaticControl) {
      baseCode += `
  
  // Programmatic control (available after widget loads)
  setTimeout(() => {
    // UltaAIWidget.open();  // Open widget
    // UltaAIWidget.close(); // Close widget
    // UltaAIWidget.sendMessage('Hello!'); // Send message
  }, 1000);`;
    }

    baseCode += `
</script>`;

    return baseCode;
  };

  const generateAutoLoadCode = () => {
    // Use the deployed Lovable domain for the SDK URL
    const sdkUrl = 'https://preview--ultaai-console.lovable.app/sdk/v1.js';
    const dataAttrs = [];
    dataAttrs.push(`data-ultaai-site-key="${widget.site_key}"`);
    
    if (overrides.enabled) {
      if (overrides.position !== 'bottom-right') dataAttrs.push(`data-ultaai-position="${overrides.position}"`);
      if (overrides.width !== '400px') dataAttrs.push(`data-ultaai-width="${overrides.width}"`);
      if (overrides.height !== '600px') dataAttrs.push(`data-ultaai-height="${overrides.height}"`);
      if (overrides.colorPrimary !== widget.theme.color_primary) dataAttrs.push(`data-ultaai-colorprimary="${overrides.colorPrimary}"`);
      if (overrides.textColor !== widget.theme.text_color) dataAttrs.push(`data-ultaai-textcolor="${overrides.textColor}"`);
      if (overrides.welcomeText && overrides.welcomeText !== widget.theme.welcome_text) dataAttrs.push(`data-ultaai-welcometext="${overrides.welcomeText}"`);
      if (overrides.logoUrl && overrides.logoUrl !== widget.theme.logo_url) dataAttrs.push(`data-ultaai-logourl="${overrides.logoUrl}"`);
    }

    return `<script src="${sdkUrl}"
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
            {/* Display Mode and Advanced Options */}
            <div className="space-y-6">
              {/* Display Mode Radio Group */}
              <div>
                <div className="mb-4">
                  <Label className="text-base font-semibold">Display Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose how the widget appears to visitors
                  </p>
                </div>
                <RadioGroup
                  value={displayMode}
                  onValueChange={setDisplayMode}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="standard" id="standard" />
                    <Label htmlFor="standard" className="font-normal">
                      Standard Mode
                      <span className="block text-xs text-muted-foreground">
                        Widget appears as a button
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="open" id="open" />
                    <Label htmlFor="open" className="font-normal">
                      Open Mode
                      <span className="block text-xs text-muted-foreground">
                        Widget opens automatically
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Advanced Options Checkboxes */}
              <div>
                <div className="mb-4">
                  <Label className="text-base font-semibold">Advanced Options</Label>
                  <p className="text-sm text-muted-foreground">
                    Select additional features for your widget
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hideOnMobile"
                      checked={advancedOptions.hideOnMobile}
                      onCheckedChange={(checked) =>
                        setAdvancedOptions(prev => ({ ...prev, hideOnMobile: checked as boolean }))
                      }
                    />
                    <Label htmlFor="hideOnMobile" className="font-normal">
                      Hide on Mobile
                      <span className="block text-xs text-muted-foreground">
                        Don't show widget on mobile devices
                      </span>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="showBadge"
                      checked={advancedOptions.showBadge}
                      onCheckedChange={(checked) =>
                        setAdvancedOptions(prev => ({ ...prev, showBadge: checked as boolean }))
                      }
                    />
                    <Label htmlFor="showBadge" className="font-normal">
                      Show Badge
                      <span className="block text-xs text-muted-foreground">
                        Display "Powered by 🤖 UltaAI" badge
                      </span>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enableEvents"
                      checked={advancedOptions.enableEvents}
                      onCheckedChange={(checked) =>
                        setAdvancedOptions(prev => ({ ...prev, enableEvents: checked as boolean }))
                      }
                    />
                    <Label htmlFor="enableEvents" className="font-normal">
                      Event Handlers
                      <span className="block text-xs text-muted-foreground">
                        Include event tracking callbacks
                      </span>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="userIdentification"
                      checked={advancedOptions.userIdentification}
                      onCheckedChange={(checked) =>
                        setAdvancedOptions(prev => ({ ...prev, userIdentification: checked as boolean }))
                      }
                    />
                    <Label htmlFor="userIdentification" className="font-normal">
                      User Identification
                      <span className="block text-xs text-muted-foreground">
                        Include user ID and contact info
                      </span>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 md:col-span-2">
                    <Checkbox
                      id="programmaticControl"
                      checked={advancedOptions.programmaticControl}
                      onCheckedChange={(checked) =>
                        setAdvancedOptions(prev => ({ ...prev, programmaticControl: checked as boolean }))
                      }
                    />
                    <Label htmlFor="programmaticControl" className="font-normal">
                      Programmatic Control
                      <span className="block text-xs text-muted-foreground">
                        Include JavaScript methods to control widget
                      </span>
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-sm font-medium">Advanced Embed Code</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Embed code with custom options, event handling, and advanced features
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
            
            {/* Advanced Features Documentation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-lg backdrop-blur-sm">
                <h4 className="font-medium text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-2">
                  🎯 User Identification
                </h4>
                <ul className="text-sm text-foreground/70 space-y-1">
                  <li>• Pass user ID, email, and name for personalized experience</li>
                  <li>• Enables conversation history and context</li>
                  <li>• Better support team visibility</li>
                </ul>
              </div>
              
              <div className="p-4 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 rounded-lg backdrop-blur-sm">
                <h4 className="font-medium text-purple-700 dark:text-purple-400 mb-2 flex items-center gap-2">
                  🎨 Dynamic Customization
                </h4>
                <ul className="text-sm text-foreground/70 space-y-1">
                  <li>• Override colors and branding in real-time</li>
                  <li>• Responsive themes (light/dark/auto)</li>
                  <li>• Custom positioning and sizing</li>
                </ul>
              </div>
              
              <div className="p-4 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent border border-orange-500/20 rounded-lg backdrop-blur-sm">
                <h4 className="font-medium text-orange-700 dark:text-orange-400 mb-2 flex items-center gap-2">
                  📊 Event Tracking
                </h4>
                <ul className="text-sm text-foreground/70 space-y-1">
                  <li>• Track widget opens, closes, and messages</li>
                  <li>• Integrate with Google Analytics or other tools</li>
                  <li>• Custom error handling and logging</li>
                </ul>
              </div>
              
              <div className="p-4 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 rounded-lg backdrop-blur-sm">
                <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
                  🔧 Programmatic Control
                </h4>
                <ul className="text-sm text-foreground/70 space-y-1">
                  <li>• Open/close widget via JavaScript</li>
                  <li>• Send messages programmatically</li>
                  <li>• Update user information dynamically</li>
                </ul>
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
        <div className="p-6 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border border-primary/20 rounded-xl backdrop-blur-sm">
          <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            Implementation Notes
          </h4>
          <ul className="text-sm text-foreground/80 space-y-2">
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-primary/60 rounded-full mt-2 flex-shrink-0"></div>
              Place the script tags before the closing <code className="px-1.5 py-0.5 bg-muted/50 rounded text-xs">&lt;/body&gt;</code> tag
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-primary/60 rounded-full mt-2 flex-shrink-0"></div>
              The widget will automatically check domain permissions
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-primary/60 rounded-full mt-2 flex-shrink-0"></div>
              Client-side overrides take precedence over server settings
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-primary/60 rounded-full mt-2 flex-shrink-0"></div>
              Widget loads asynchronously and won't block page rendering
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}