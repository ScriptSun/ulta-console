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

  // Size control options
  const [sizeOptions, setSizeOptions] = useState({
    customSize: false,
    width: '400',
    height: '600',
    position: 'bottom-right'
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
    
    return `<span style="color: #4FC3F7">&lt;script</span> <span style="color: #26C6DA">src</span>=<span style="color: #FFD54F">"${sdkUrl}"</span><span style="color: #4FC3F7">&gt;&lt;/script&gt;</span>
<span style="color: #4FC3F7">&lt;script&gt;</span>
  <span style="color: #FFEB3B">UltaAIWidget</span>.<span style="color: #FFEB3B">load</span>(<span style="color: #FFD54F">'${widget.site_key}'</span>);
<span style="color: #4FC3F7">&lt;/script&gt;</span>`;
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

    // Add size control options
    if (sizeOptions.customSize) {
      opts.width = `${sizeOptions.width}px`;
      opts.height = `${sizeOptions.height}px`;
      opts.position = sizeOptions.position;
    }

    // Add advanced options
    if (displayMode === 'open') opts.autoOpen = true;
    if (advancedOptions.hideOnMobile) opts.hideOnMobile = true;
    if (!advancedOptions.showBadge) opts.showBadge = false;
    
    const hasOptions = Object.keys(opts).length > 0;
    const hasEvents = advancedOptions.enableEvents;
    const hasUserData = advancedOptions.userIdentification;
    
    let code = `<span style="color: #4FC3F7">&lt;script</span> <span style="color: #26C6DA">src</span>=<span style="color: #FFD54F">"${sdkUrl}"</span><span style="color: #4FC3F7">&gt;&lt;/script&gt;</span>
<span style="color: #4FC3F7">&lt;script&gt;</span>
  <span style="color: #81C784">// 🤖 UltaAI Widget Configuration</span>
  <span style="color: #FFEB3B">UltaAIWidget</span>.<span style="color: #FFEB3B">load</span>(<span style="color: #FFD54F">'${widget.site_key}'</span>`;

    if (hasOptions || hasEvents || hasUserData) {
      code += `, <span style="color: #FFFFFF">{</span>`;
      
      // Add basic options
      const optionsArray = [];
      Object.entries(opts).forEach(([key, value]) => {
        if (typeof value === 'string') {
          optionsArray.push(`    <span style="color: #FFD54F">"${key}"</span>: <span style="color: #FFD54F">"${value}"</span>`);
        } else {
          optionsArray.push(`    <span style="color: #FFD54F">"${key}"</span>: <span style="color: #4DD0E1">${value}</span>`);
        }
      });
      
      // Add user identification
      if (hasUserData) {
        optionsArray.push(`    <span style="color: #FFD54F">"userId"</span>: <span style="color: #FFD54F">"user_12345"</span>`);
        optionsArray.push(`    <span style="color: #FFD54F">"userEmail"</span>: <span style="color: #FFD54F">"user@example.com"</span>`);
        optionsArray.push(`    <span style="color: #FFD54F">"userName"</span>: <span style="color: #FFD54F">"John Doe"</span>`);
      }
      
      // Add event handlers
      if (hasEvents) {
        optionsArray.push(`    <span style="color: #FFD54F">"onReady"</span>: <span style="color: #BA68C8">function</span>() {
      <span style="color: #FFEB3B">console</span>.<span style="color: #FFEB3B">log</span>(<span style="color: #FFD54F">'🤖 UltaAI widget is ready'</span>);
    }`);
        optionsArray.push(`    <span style="color: #FFD54F">"onOpen"</span>: <span style="color: #BA68C8">function</span>() {
      <span style="color: #FFEB3B">console</span>.<span style="color: #FFEB3B">log</span>(<span style="color: #FFD54F">'Widget opened'</span>);
    }`);
      }
      
      code += `\n${optionsArray.join(',\n')}\n  <span style="color: #FFFFFF">}</span>`;
    }
    
    code += `);`;

    if (advancedOptions.programmaticControl) {
      code += `
  
  <span style="color: #81C784">// Programmatic control methods (available after widget loads)</span>
  <span style="color: #FFEB3B">setTimeout</span>(() => {
    <span style="color: #81C784">// UltaAIWidget.open();  // Open widget</span>
    <span style="color: #81C784">// UltaAIWidget.close(); // Close widget</span>
    <span style="color: #81C784">// UltaAIWidget.sendMessage('Hello from website!'); // Send message</span>
  }, <span style="color: #4DD0E1">1000</span>);`;
    }

    code += `
<span style="color: #4FC3F7">&lt;/script&gt;</span>`;

    return code;
  };

  const generateAutoLoadCode = () => {
    // Use the deployed Lovable domain for the SDK URL
    const sdkUrl = 'https://preview--ultaai-console.lovable.app/sdk/v1.js';
    const dataAttrs = [];
    dataAttrs.push(`<span style="color: #26C6DA">data-ultaai-site-key</span>=<span style="color: #FFD54F">"${widget.site_key}"</span>`);
    
    if (sizeOptions.customSize) {
      if (sizeOptions.width !== '400') dataAttrs.push(`<span style="color: #26C6DA">data-ultaai-width</span>=<span style="color: #FFD54F">"${sizeOptions.width}px"</span>`);
      if (sizeOptions.height !== '600') dataAttrs.push(`<span style="color: #26C6DA">data-ultaai-height</span>=<span style="color: #FFD54F">"${sizeOptions.height}px"</span>`);
      if (sizeOptions.position !== 'bottom-right') dataAttrs.push(`<span style="color: #26C6DA">data-ultaai-position</span>=<span style="color: #FFD54F">"${sizeOptions.position}"</span>`);
    }

    return `<span style="color: #4FC3F7">&lt;script</span> <span style="color: #26C6DA">src</span>=<span style="color: #FFD54F">"${sdkUrl}"</span>
  ${dataAttrs.join('\n  ')}
<span style="color: #4FC3F7">&gt;&lt;/script&gt;</span>`;
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Code className="h-5 w-5" />
          Embed Code for "UltaAI"
        </CardTitle>
        <CardDescription className="text-sm">
          Copy this code to embed the widget on your website
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Embed Code Tabs */}
        <Tabs defaultValue="basic" className="w-full">
          <div className="mb-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
              <TabsTrigger value="autoload">Auto-load</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="basic" className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Basic Embed Code</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Simple embed code with default settings
              </p>
              <div className="relative">
                 <pre className="bg-black p-4 rounded-lg overflow-x-auto text-sm font-mono border">
                   <code dangerouslySetInnerHTML={{ __html: generateBasicEmbedCode() }}></code>
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
            <div className="space-y-6 mt-6">
              {/* Display Mode Radio Group */}
              <div>
                <div className="mb-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Display Mode
                  </Label>
                </div>
                <RadioGroup
                  value={displayMode}
                  onValueChange={setDisplayMode}
                  className="flex gap-6"
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

              {/* Size Control Options */}
              <div>
                <div className="mb-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Widget Size Control
                  </Label>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="customSize"
                      checked={sizeOptions.customSize}
                      onCheckedChange={(checked) =>
                        setSizeOptions(prev => ({ ...prev, customSize: checked as boolean }))
                      }
                    />
                    <Label htmlFor="customSize" className="font-normal">
                      Enable Custom Size
                    </Label>
                  </div>

                  {sizeOptions.customSize && (
                    <div className="grid grid-cols-3 gap-3 p-3 bg-muted rounded-lg">
                      <div className="space-y-1">
                        <Label htmlFor="widgetWidth" className="text-sm">Width (px)</Label>
                        <Input
                          id="widgetWidth"
                          type="number"
                          value={sizeOptions.width}
                          onChange={(e) => setSizeOptions(prev => ({ ...prev, width: e.target.value }))}
                          placeholder="400"
                          min="200"
                          max="800"
                          className="h-8"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="widgetHeight" className="text-sm">Height (px)</Label>
                        <Input
                          id="widgetHeight"
                          type="number"
                          value={sizeOptions.height}
                          onChange={(e) => setSizeOptions(prev => ({ ...prev, height: e.target.value }))}
                          placeholder="600"
                          min="300"
                          max="800"
                          className="h-8"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="widgetPosition" className="text-sm">Position</Label>
                        <select
                          id="widgetPosition"
                          value={sizeOptions.position}
                          onChange={(e) => setSizeOptions(prev => ({ ...prev, position: e.target.value }))}
                          className="w-full px-2 py-1 h-8 border border-input bg-background rounded-md text-sm"
                        >
                          <option value="bottom-right">Bottom Right</option>
                          <option value="bottom-left">Bottom Left</option>
                          <option value="top-right">Top Right</option>
                          <option value="top-left">Top Left</option>
                          <option value="center">Center</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Advanced Options Checkboxes */}
              <div>
                <div className="mb-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Advanced Options
                  </Label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hideOnMobile"
                      checked={advancedOptions.hideOnMobile}
                      onCheckedChange={(checked) =>
                        setAdvancedOptions(prev => ({ ...prev, hideOnMobile: checked as boolean }))
                      }
                    />
                    <Label htmlFor="hideOnMobile" className="font-normal text-sm">
                      Hide on Mobile
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
                    <Label htmlFor="showBadge" className="font-normal text-sm">
                      Show Badge
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
                    <Label htmlFor="enableEvents" className="font-normal text-sm">
                      Event Handlers
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
                    <Label htmlFor="userIdentification" className="font-normal text-sm">
                      User Identification
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 col-span-2">
                    <Checkbox
                      id="programmaticControl"
                      checked={advancedOptions.programmaticControl}
                      onCheckedChange={(checked) =>
                        setAdvancedOptions(prev => ({ ...prev, programmaticControl: checked as boolean }))
                      }
                    />
                    <Label htmlFor="programmaticControl" className="font-normal text-sm">
                      Programmatic Control
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
                <pre className="bg-black p-4 rounded-lg overflow-x-auto text-sm font-mono border">
                  <code dangerouslySetInnerHTML={{ __html: generateAdvancedEmbedCode() }}></code>
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
                 <pre className="bg-black p-4 rounded-lg overflow-x-auto text-sm font-mono border">
                   <code dangerouslySetInnerHTML={{ __html: generateAutoLoadCode() }}></code>
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