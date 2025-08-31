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
import { Copy, CheckCircle, Code, Settings, Palette, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Widget } from "@/hooks/useWidgets";
import { EmbedOverrides, EmbedAdvancedOptions, EmbedSizeOptions } from "@/types/embed";
import { EmbedCodeGenerator as CodeGenerator } from "@/lib/embed-code-generator";
import { copyToClipboard, validateWidget } from "@/lib/utils";
import { CONFIG } from "@/lib/config";

interface EmbedCodeGeneratorProps {
  widget: Widget | null;
}

export function EmbedCodeGenerator({ widget }: EmbedCodeGeneratorProps) {
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  
  // Validate widget on load
  const widgetValidation = validateWidget(widget);
  
  // Client-side override options with safe defaults
  const [overrides, setOverrides] = useState<EmbedOverrides>({
    enabled: false,
    position: CONFIG.WIDGET_DEFAULTS.position,
    width: CONFIG.WIDGET_DEFAULTS.width,
    height: CONFIG.WIDGET_DEFAULTS.height,
    colorPrimary: widget?.theme?.color_primary || '#007bff',
    textColor: widget?.theme?.text_color || '#333333',
    welcomeText: widget?.theme?.welcome_text || '',
    logoUrl: widget?.theme?.logo_url || ''
  });

  // Advanced options state
  const [displayMode, setDisplayMode] = useState('standard');
  const [advancedOptions, setAdvancedOptions] = useState<EmbedAdvancedOptions>({
    hideOnMobile: false,
    showBadge: true,
    enableEvents: false,
    userIdentification: false,
    programmaticControl: false,
    debugMode: false
  });

  // Size control options
  const [sizeOptions, setSizeOptions] = useState<EmbedSizeOptions>({
    customSize: false,
    width: '400',
    height: '600',
    position: CONFIG.WIDGET_DEFAULTS.position
  });

  const handleCopyToClipboard = async (rawCode: string, label: string) => {
    // Remove HTML formatting for actual copying
    const cleanCode = rawCode.replace(/<[^>]*>/g, '');
    
    const success = await copyToClipboard(cleanCode);
    
    if (success) {
      setCopiedCode(label);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
      setTimeout(() => setCopiedCode(null), 2000);
    } else {
      toast({
        title: "Copy failed",
        description: "Please copy the code manually. Check browser permissions.",
        variant: "destructive",
      });
    }
  };

  // Initialize code generator
  const codeGenerator = widget ? new CodeGenerator(widget) : null;

  if (!widgetValidation.isValid) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Widget validation failed:</p>
                <ul className="list-disc list-inside text-sm">
                  {widgetValidation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Generate embed codes using the new generator
  const generateCode = (type: 'basic' | 'advanced' | 'autoload') => {
    if (!codeGenerator) return { success: false, error: 'Code generator not available' };
    
    try {
      switch (type) {
        case 'basic':
          return codeGenerator.generateBasicCode();
        case 'advanced':
          return codeGenerator.generateAdvancedCode(overrides, advancedOptions, sizeOptions, displayMode);
        case 'autoload':
          return codeGenerator.generateAutoLoadCode(sizeOptions);
        default:
          return { success: false, error: 'Invalid code type' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: `Code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Code className="h-5 w-5" />
          Embed Code for "UltaAI"
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Copy this code to embed the widget on your website
        </p>
      </div>
      
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
              {(() => {
                const result = generateCode('basic');
                if (!result.success) {
                  return (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{result.error}</AlertDescription>
                    </Alert>
                  );
                }
                return (
                  <div className="relative">
                    <pre className="bg-black p-4 rounded-lg overflow-x-auto text-sm font-mono border">
                      <code dangerouslySetInnerHTML={{ __html: result.code || '' }}></code>
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => handleCopyToClipboard(result.code || '', "Basic embed code")}
                    >
                      {copiedCode === "Basic embed code" ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                );
              })()}
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            {/* Display Mode and Advanced Options */}
            <div className="space-y-6 mt-6">
              {/* Advanced Options */}
              <div>
                <div className="mb-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Advanced Options
                  </Label>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="standardMode"
                      checked={displayMode === 'standard'}
                      onCheckedChange={(checked) => setDisplayMode(checked ? 'standard' : 'open')}
                    />
                    <Label htmlFor="standardMode" className="font-normal text-sm">
                      Standard Mode
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="openMode"
                      checked={displayMode === 'open'}
                      onCheckedChange={(checked) => setDisplayMode(checked ? 'open' : 'standard')}
                    />
                    <Label htmlFor="openMode" className="font-normal text-sm">
                      Open Mode
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="customSize"
                      checked={sizeOptions.customSize}
                      onCheckedChange={(checked) =>
                        setSizeOptions(prev => ({ ...prev, customSize: checked as boolean }))
                      }
                    />
                    <Label htmlFor="customSize" className="font-normal text-sm">
                      Enable Custom Size
                    </Label>
                  </div>

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

                  <div className="flex items-center space-x-2">
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

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="debugMode"
                      checked={advancedOptions.debugMode}
                      onCheckedChange={(checked) =>
                        setAdvancedOptions(prev => ({ ...prev, debugMode: checked as boolean }))
                      }
                    />
                    <Label htmlFor="debugMode" className="font-normal text-sm">
                      Debug Mode
                    </Label>
                  </div>

                </div>

                {sizeOptions.customSize && (
                  <div className="grid grid-cols-3 gap-3 p-3 bg-muted rounded-lg mt-4">
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

            <Separator />

              {/* Advanced Code Display */}
              <div>
                <Label className="text-sm font-medium">Generated Advanced Code</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Advanced embed code with your selected options
                </p>
                {(() => {
                  const result = generateCode('advanced');
                  if (!result.success) {
                    return (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{result.error}</AlertDescription>
                      </Alert>
                    );
                  }
                  return (
                    <div className="relative">
                      <pre className="bg-black p-4 rounded-lg overflow-x-auto text-sm font-mono border max-h-96">
                        <code dangerouslySetInnerHTML={{ __html: result.code || '' }}></code>
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => handleCopyToClipboard(result.code || '', "Advanced embed code")}
                      >
                        {copiedCode === "Advanced embed code" ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  );
                })()}
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
              {(() => {
                const result = generateCode('autoload');
                if (!result.success) {
                  return (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{result.error}</AlertDescription>
                    </Alert>
                  );
                }
                return (
                  <div className="relative">
                    <pre className="bg-black p-4 rounded-lg overflow-x-auto text-sm font-mono border">
                      <code dangerouslySetInnerHTML={{ __html: result.code || '' }}></code>
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => handleCopyToClipboard(result.code || '', "Auto-load embed code")}
                    >
                      {copiedCode === "Auto-load embed code" ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                );
              })()}
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
      </div>
    );
  }