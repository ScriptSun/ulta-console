import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeSpec, ThemeValidationResult } from '@/types/themeTypes';
import { apiTheme } from '@/lib/apiTheme';
import { applyCssVariables, CSS_VARIABLES_USAGE, AVAILABLE_VARIABLES } from '@/lib/cssVariablesWriter';
import { Palette, Sun, Moon, Monitor, Download, Upload, AlertTriangle, Copy, RotateCcw, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const THEME_PREFERENCES = [
  { id: 'light' as const, name: 'Light', icon: Sun, description: 'Clean bright interface' },
  { id: 'dark' as const, name: 'Dark', icon: Moon, description: 'Easy on the eyes' },
  { id: 'system' as const, name: 'System', icon: Monitor, description: 'Follows system setting' }
];

const COLOR_TOKENS = [
  { key: 'primary', label: 'Primary', description: 'Main brand color' },
  { key: 'secondary', label: 'Secondary', description: 'Supporting color' },
  { key: 'accent', label: 'Accent', description: 'Highlight color' },
  { key: 'background', label: 'Background', description: 'Main background' },
  { key: 'foreground', label: 'Foreground', description: 'Text color' },
  { key: 'muted', label: 'Muted', description: 'Subtle background' },
  { key: 'card', label: 'Card', description: 'Card background' },
  { key: 'border', label: 'Border', description: 'Border color' },
  { key: 'destructive', label: 'Destructive', description: 'Error/danger color' },
  { key: 'success', label: 'Success', description: 'Success color' },
  { key: 'warning', label: 'Warning', description: 'Warning color' },
  { key: 'gradientStart', label: 'Gradient Start', description: 'Gradient starting color' },
  { key: 'gradientEnd', label: 'Gradient End', description: 'Gradient ending color' }
];

const RADIUS_TOKENS = [
  { key: 'sm', label: 'Small', description: 'Small radius' },
  { key: 'md', label: 'Medium', description: 'Medium radius' },
  { key: 'lg', label: 'Large', description: 'Large radius' },
  { key: 'xl', label: 'Extra Large', description: 'Extra large radius' }
];

export const BrandTheme = () => {
  const { toast } = useToast();
  const { mode, setMode } = useTheme();
  const [currentTheme, setCurrentTheme] = useState<ThemeSpec | null>(null);
  const [editingTheme, setEditingTheme] = useState<ThemeSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationResult, setValidationResult] = useState<ThemeValidationResult | null>(null);
  const [overrideContrast, setOverrideContrast] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const hasChanges = currentTheme && editingTheme ? JSON.stringify(currentTheme) !== JSON.stringify(editingTheme) : false;

  // Sync theme preference with editing theme when mode changes
  useEffect(() => {
    if (editingTheme && mode !== editingTheme.preference) {
      setEditingTheme(prev => prev ? { ...prev, preference: mode } : null);
    }
  }, [mode]);

  // Validate theme when hex values change
  useEffect(() => {
    const checkChanges = currentTheme && editingTheme ? JSON.stringify(currentTheme) !== JSON.stringify(editingTheme) : false;
    if (editingTheme && checkChanges) {
      validateTheme(editingTheme);
    }
  }, [editingTheme?.hex, editingTheme?.radius, currentTheme]);

  const loadTheme = async () => {
    try {
      setLoading(true);
      const theme = await apiTheme.getTheme();
      // Sync with current theme mode
      const syncedTheme = { ...theme, preference: mode };
      setCurrentTheme(syncedTheme);
      setEditingTheme({ ...syncedTheme });
      
      // Apply current theme to CSS
      applyCssVariables(syncedTheme);
    } catch (error) {
      toast({
        title: "Error loading theme",
        description: "Could not load theme configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const validateTheme = async (theme: ThemeSpec) => {
    try {
      const result = await apiTheme.validateTheme(theme);
      setValidationResult(result);
      return result;
    } catch (error) {
      toast({
        title: "Validation error",
        description: "Could not validate theme",
        variant: "destructive"
      });
      return { ok: false, reasons: ['Validation failed'] };
    }
  };

  const handleThemePreferenceChange = (newPreference: 'light' | 'dark' | 'system') => {
    if (!editingTheme) return;
    
    // Define dark and light theme color sets
    const darkThemeColors = {
      hex: {
        primary: editingTheme.hex.primary, // Keep user's primary color
        secondary: "#1e293b",
        accent: "#475569", 
        background: "#0a0e1a",
        foreground: "#f1f5f9",
        muted: "#1e293b",
        card: "#151b2e",
        border: "#2d3748",
        destructive: "#ef4444",
        success: "#10b981",
        warning: "#f59e0b",
        gradientStart: "#1e293b",
        gradientEnd: "#0a0e1a"
      },
      hsl: {
        primary: editingTheme.hsl.primary, // Keep user's primary color
        secondary: [215, 28, 17],
        accent: [215, 16, 35],
        background: [220, 26, 7],
        foreground: [210, 40, 95],
        muted: [215, 28, 17],
        card: [220, 30, 13],
        border: [213, 22, 24],
        destructive: [0, 84, 60],
        success: [160, 84, 39],
        warning: [48, 96, 53],
        gradientStart: [215, 28, 17],
        gradientEnd: [220, 26, 7]
      }
    };

    const lightThemeColors = {
      hex: {
        primary: editingTheme.hex.primary, // Keep user's primary color
        secondary: "#f1f5f9",
        accent: "#e2e8f0",
        background: "#ffffff",
        foreground: "#0f172a",
        muted: "#f8fafc",
        card: "#ffffff",
        border: "#e2e8f0",
        destructive: "#ef4444",
        success: "#22c55e",
        warning: "#f59e0b",
        gradientStart: "#f8fafc",
        gradientEnd: "#f1f5f9"
      },
      hsl: {
        primary: editingTheme.hsl.primary, // Keep user's primary color
        secondary: [210, 40, 95],
        accent: [210, 40, 90],
        background: [0, 0, 100],
        foreground: [222, 84, 5],
        muted: [210, 40, 96],
        card: [0, 0, 100],
        border: [214, 32, 91],
        destructive: [0, 84, 60],
        success: [142, 76, 36],
        warning: [48, 96, 53],
        gradientStart: [210, 40, 96],
        gradientEnd: [210, 40, 95]
      }
    };

    // Auto-apply dark or light color scheme based on preference
    let colors;
    if (newPreference === 'dark') {
      colors = darkThemeColors;
    } else if (newPreference === 'light') {
      colors = lightThemeColors;
    } else {
      // System mode - detect based on user's system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      colors = prefersDark ? darkThemeColors : lightThemeColors;
    }

    // Apply theme preference immediately
    setMode(newPreference);
    
    // Update editing theme with complete color scheme
    const updatedTheme: ThemeSpec = {
      ...editingTheme,
      preference: newPreference,
      name: newPreference === 'dark' ? 'Dark Theme' : newPreference === 'light' ? 'Light Theme' : 'System Theme',
      hex: colors.hex,
      hsl: colors.hsl as ThemeSpec['hsl']
    };
    
    setEditingTheme(updatedTheme);
    
    // Apply CSS variables immediately for instant preview
    applyCssVariables(updatedTheme);
    
    toast({
      title: "Theme applied",
      description: `Switched to ${newPreference} mode with proper color scheme`
    });
  };

  const handleSaveAndApply = async () => {
    if (!editingTheme) return;

    try {
      setSaving(true);
      
      const validation = await validateTheme(editingTheme);
      if (!validation.ok && !overrideContrast) {
        return;
      }

      const result = await apiTheme.applyTheme(editingTheme, { overrideContrast });
      setCurrentTheme(result.theme);
      setEditingTheme({ ...result.theme });
      
      // Apply to CSS immediately
      applyCssVariables(result.theme);

      toast({
        title: "Theme applied successfully",
        description: `Theme updated to version ${result.theme.version}`
      });

      setValidationResult(null);
      setOverrideContrast(false);
    } catch (error) {
      toast({
        title: "Error applying theme",
        description: error instanceof Error ? error.message : "Could not apply theme",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    if (!currentTheme) return;
    
    const defaultTheme: ThemeSpec = {
      ...currentTheme,
      name: "Default Light",
      hex: {
        primary: "#8b5cf6",
        secondary: "#f1f5f9", 
        accent: "#e2e8f0",
        background: "#ffffff",
        foreground: "#0f172a",
        muted: "#f8fafc",
        card: "#ffffff",
        border: "#e2e8f0",
        destructive: "#ef4444",
        success: "#22c55e",
        warning: "#f59e0b",
        gradientStart: "#f8fafc",
        gradientEnd: "#f1f5f9"
      },
      hsl: {
        primary: [262, 83, 58],
        secondary: [210, 40, 95],
        accent: [210, 40, 90],
        background: [0, 0, 100],
        foreground: [222, 84, 5],
        muted: [210, 40, 96],
        card: [0, 0, 100],
        border: [214, 32, 91],
        destructive: [0, 84, 60],
        success: [142, 76, 36],
        warning: [48, 96, 53],
        gradientStart: [210, 40, 96],
        gradientEnd: [210, 40, 95]
      },
      radius: { sm: 6, md: 12, lg: 16, xl: 24 }
    };
    
    setEditingTheme(defaultTheme);
    setValidationResult(null);
  };

  const handleRevert = async (version: number) => {
    // Version history removed - this function is no longer needed
  };

  const handleDownloadTheme = () => {
    if (!currentTheme) return;
    
    const dataStr = JSON.stringify(currentTheme, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `theme-v${currentTheme.version}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const theme = JSON.parse(e.target?.result as string) as ThemeSpec;
        
        // Validate the uploaded theme structure
        if (!theme.hex || !theme.hsl || !theme.radius) {
          throw new Error('Invalid theme structure');
        }
        
        // Ensure all required color tokens exist
        const requiredTokens = ['primary', 'secondary', 'accent', 'background', 'foreground', 'muted', 'card', 'border', 'destructive', 'success', 'warning', 'gradientStart', 'gradientEnd'];
        const missingHex = requiredTokens.filter(token => !theme.hex[token]);
        const missingHsl = requiredTokens.filter(token => !theme.hsl[token]);
        
        if (missingHex.length > 0) {
          throw new Error(`Missing HEX values for: ${missingHex.join(', ')}`);
        }
        
        if (missingHsl.length > 0) {
          throw new Error(`Missing HSL values for: ${missingHsl.join(', ')}`);
        }
        
        setEditingTheme(theme);
        toast({
          title: "Theme uploaded",
          description: "Theme configuration loaded successfully"
        });
      } catch (error) {
        toast({
          title: "Error uploading theme",
          description: error instanceof Error ? error.message : "Invalid theme file format",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Variable copied successfully"
    });
  };

  if (loading || !currentTheme || !editingTheme) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const canSave = hasChanges && (validationResult?.ok !== false || overrideContrast);

  return (
    <div className="space-y-6">
      {/* Theme Preference Card */}
      <Card className="bg-gradient-to-br from-card to-muted/50 border border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme Preference
          </CardTitle>
          <CardDescription>
            Choose your preferred theme mode
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {THEME_PREFERENCES.map((pref) => {
              const Icon = pref.icon;
              const isActive = mode === pref.id;
              
              return (
                <div
                  key={pref.id}
                  className={`
                    relative cursor-pointer group p-6 rounded-xl transition-all duration-200 
                    ${isActive 
                      ? 'bg-primary text-primary-foreground shadow-lg' 
                      : 'bg-card hover:bg-muted/50 border border-border hover:border-primary/20'
                    }
                  `}
                  onClick={() => handleThemePreferenceChange(pref.id)}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`
                      flex items-center justify-center w-12 h-12 rounded-lg
                      ${isActive 
                        ? 'bg-primary-foreground/10' 
                        : 'bg-muted group-hover:bg-primary/10'
                      }
                    `}>
                       <Icon className={`h-6 w-6 ${
                         isActive 
                           ? 'text-white' 
                           : 'text-muted-foreground group-hover:text-primary'
                       }`} />
                    </div>
                     <div className="flex-1">
                       <h3 className={`font-medium text-base ${
                         isActive ? 'text-white' : 'text-foreground'
                       }`}>
                         {pref.name}
                       </h3>
                       <p className={`text-sm mt-1 ${
                         isActive 
                           ? 'text-white/70' 
                           : 'text-muted-foreground'
                       }`}>
                         {pref.description}
                       </p>
                     </div>
                    {isActive && (
                      <div className="flex items-center justify-center w-6 h-6 bg-primary-foreground rounded-full">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Theme Customizer Card */}
      <Card className="bg-gradient-to-br from-card to-muted/50 border border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme Customizer
          </CardTitle>
          <CardDescription>
            Customize your theme colors and styling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="colors" className="space-y-4">
            <TabsList>
              <TabsTrigger value="colors">Colors</TabsTrigger>
              <TabsTrigger value="manage">Manage</TabsTrigger>
            </TabsList>

            <TabsContent value="colors" className="space-y-6">
              {/* Color Tokens */}
              <div className="space-y-4">
                <h4 className="font-medium">Color Tokens</h4>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  {COLOR_TOKENS.map((token) => {
                    const hexValue = editingTheme.hex[token.key as keyof typeof editingTheme.hex];
                    
                    return (
                      <div key={token.key} className="flex flex-col gap-3 p-4 rounded-lg hover:shadow-sm transition-all duration-200">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="relative group">
                              <div 
                                className="w-6 h-6 rounded-lg shadow-sm border border-white/20 transition-all duration-200 group-hover:scale-105" 
                                style={{ backgroundColor: hexValue }}
                              />
                              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                            </div>
                            <Label className="font-medium">{token.label}</Label>
                          </div>
                          <p className="text-xs text-muted-foreground/80 ml-8">{token.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <div className="relative">
                            <Input
                              type="color"
                              value={hexValue}
                              onChange={(e) => {
                                setEditingTheme(prev => prev ? {
                                  ...prev,
                                  hex: { ...prev.hex, [token.key]: e.target.value }
                                } : null);
                              }}
                              className="w-12 h-9 p-0 border-0 rounded-lg cursor-pointer overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
                            />
                          </div>
                          <Input
                            type="text"
                            value={hexValue}
                            onChange={(e) => {
                              const value = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
                              setEditingTheme(prev => prev ? {
                                ...prev,
                                hex: { ...prev.hex, [token.key]: value }
                              } : null);
                            }}
                            placeholder="#000000"
                            className="font-mono text-sm flex-1 h-9 px-3 rounded-lg bg-background/50 shadow-sm hover:border-primary/30 focus:border-primary transition-all duration-200"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Radius Tokens */}
              <div className="space-y-4">
                <h4 className="font-medium">Border Radius</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {RADIUS_TOKENS.map((token) => {
                    const value = editingTheme.radius[token.key as keyof typeof editingTheme.radius];
                    
                    return (
                      <div key={token.key} className="space-y-2">
                        <Label>{token.label}</Label>
                        <div className="space-y-1">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={value}
                            onChange={(e) => {
                              const newValue = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                              setEditingTheme(prev => prev ? {
                                ...prev,
                                radius: { ...prev.radius, [token.key]: newValue }
                              } : null);
                            }}
                          />
                          <div className="text-xs text-muted-foreground">px</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Validation Results */}
              {validationResult && !validationResult.ok && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium">Validation Issues:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {validationResult.issues?.map((issue, index) => (
                          <li key={index} className="text-sm">{issue}</li>
                        ))}
                      </ul>
                      <div className="flex items-center space-x-2 mt-2">
                        <Checkbox
                          id="override-contrast"
                          checked={overrideContrast}
                          onCheckedChange={(checked) => setOverrideContrast(checked as boolean)}
                        />
                        <Label htmlFor="override-contrast" className="text-sm">
                          Override validation and proceed anyway
                        </Label>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleResetToDefaults}
                  variant="outline"
                  disabled={loading || saving}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>
                <Button
                  onClick={handleSaveAndApply}
                  disabled={!canSave || saving}
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save and Apply
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="manage" className="space-y-6">
              {/* CSS Variables Usage */}
              <div className="space-y-2">
                <h4 className="font-medium">CSS Variables Usage</h4>
                <Textarea
                  value={CSS_VARIABLES_USAGE}
                  readOnly
                  className="font-mono text-xs"
                  rows={8}
                />
              </div>

              {/* Available Variables */}
              <div className="space-y-2">
                <h4 className="font-medium">Available Variables</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {AVAILABLE_VARIABLES.map((variable) => (
                    <Button
                      key={variable}
                      variant="outline"
                      size="sm"
                      className="justify-between font-mono text-xs"
                      onClick={() => copyToClipboard(variable)}
                    >
                      {variable}
                      <Copy className="h-3 w-3" />
                    </Button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-4">
                <h4 className="font-medium">Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleDownloadTheme} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download theme.json
                  </Button>
                  <Button variant="outline" asChild>
                    <label className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload theme.json
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleUploadTheme}
                        className="hidden"
                      />
                    </label>
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};