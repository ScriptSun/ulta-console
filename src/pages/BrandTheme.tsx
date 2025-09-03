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
import { ThemeSpec, ThemeValidationResult } from '@/types/themeTypes';
import { apiTheme } from '@/lib/apiTheme';
import { validateAllContrasts } from '@/lib/contrastHelper';
import { applyCssVariables, CSS_VARIABLES_USAGE, AVAILABLE_VARIABLES } from '@/lib/cssVariablesWriter';
import { Palette, Sun, Moon, Monitor, Download, Upload, AlertTriangle, Copy, RotateCcw, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  { key: 'warning', label: 'Warning', description: 'Warning color' }
];

const RADIUS_TOKENS = [
  { key: 'sm', label: 'Small', description: 'Small radius' },
  { key: 'md', label: 'Medium', description: 'Medium radius' },
  { key: 'lg', label: 'Large', description: 'Large radius' },
  { key: 'xl', label: 'Extra Large', description: 'Extra large radius' }
];

export const BrandTheme = () => {
  const { toast } = useToast();
  const [currentTheme, setCurrentTheme] = useState<ThemeSpec | null>(null);
  const [editingTheme, setEditingTheme] = useState<ThemeSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationResult, setValidationResult] = useState<ThemeValidationResult | null>(null);
  const [overrideContrast, setOverrideContrast] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);

  useEffect(() => {
    loadTheme();
    loadVersions();
  }, []);

  const loadTheme = async () => {
    try {
      setLoading(true);
      const theme = await apiTheme.getTheme();
      setCurrentTheme(theme);
      setEditingTheme({ ...theme });
      
      // Apply current theme to CSS
      applyCssVariables(theme);
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

  const loadVersions = async () => {
    try {
      const versionList = await apiTheme.getVersions();
      setVersions(versionList);
    } catch (error) {
      console.error('Error loading versions:', error);
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
      
      // Reload versions
      await loadVersions();

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
        warning: [48, 96, 53]
      },
      radius: { sm: 6, md: 12, lg: 16, xl: 24 }
    };
    
    setEditingTheme(defaultTheme);
    setValidationResult(null);
  };

  const handleRevert = async (version: number) => {
    try {
      setSaving(true);
      const theme = await apiTheme.revertToVersion(version);
      setCurrentTheme(theme);
      setEditingTheme({ ...theme });
      applyCssVariables(theme);
      await loadVersions();
      
      toast({
        title: "Theme reverted",
        description: `Reverted to version ${version}`
      });
    } catch (error) {
      toast({
        title: "Error reverting theme",
        description: "Could not revert to selected version",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
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
        setEditingTheme(theme);
        toast({
          title: "Theme uploaded",
          description: "Theme configuration loaded successfully"
        });
      } catch (error) {
        toast({
          title: "Error uploading theme",
          description: "Invalid theme file format",
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

  const hasChanges = JSON.stringify(currentTheme) !== JSON.stringify(editingTheme);
  const canSave = hasChanges && (validationResult?.ok || overrideContrast);

  return (
    <div className="space-y-6">
      {/* Theme Preference Card */}
      <Card>
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
              const isActive = editingTheme.preference === pref.id;
              
              return (
                <Button
                  key={pref.id}
                  variant={isActive ? "default" : "outline"}
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                  onClick={() => setEditingTheme(prev => prev ? { ...prev, preference: pref.id } : null)}
                >
                  <Icon className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">{pref.name}</div>
                    <div className="text-xs opacity-70">{pref.description}</div>
                  </div>
                  {isActive && <Badge variant="secondary">Active</Badge>}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Theme Customizer Card */}
      <Card>
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
              {/* Theme Name */}
              <div className="space-y-2">
                <Label htmlFor="theme-name">Theme Name</Label>
                <Input
                  id="theme-name"
                  value={editingTheme.name || ''}
                  onChange={(e) => setEditingTheme(prev => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="Enter theme name"
                />
              </div>

              {/* Color Tokens */}
              <div className="space-y-4">
                <h4 className="font-medium">Color Tokens</h4>
                <div className="grid gap-4">
                  {COLOR_TOKENS.map((token) => {
                    const [h, s, l] = editingTheme.hsl[token.key as keyof typeof editingTheme.hsl];
                    const colorStyle = { backgroundColor: `hsl(${h}, ${s}%, ${l}%)` };
                    
                    return (
                      <div key={token.key} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded border" style={colorStyle} />
                            <Label className="font-medium">{token.label}</Label>
                          </div>
                          <p className="text-sm text-muted-foreground">{token.description}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">H (0-360)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="360"
                              value={h}
                              onChange={(e) => {
                                const newH = Math.max(0, Math.min(360, parseInt(e.target.value) || 0));
                                setEditingTheme(prev => prev ? {
                                  ...prev,
                                  hsl: { ...prev.hsl, [token.key]: [newH, s, l] }
                                } : null);
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">S (0-100)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={s}
                              onChange={(e) => {
                                const newS = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                                setEditingTheme(prev => prev ? {
                                  ...prev,
                                  hsl: { ...prev.hsl, [token.key]: [h, newS, l] }
                                } : null);
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">L (0-100)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={l}
                              onChange={(e) => {
                                const newL = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                                setEditingTheme(prev => prev ? {
                                  ...prev,
                                  hsl: { ...prev.hsl, [token.key]: [h, s, newL] }
                                } : null);
                              }}
                            />
                          </div>
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
                        {validationResult.reasons?.map((reason, index) => (
                          <li key={index} className="text-sm">{reason}</li>
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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

              {/* Version History */}
              <div className="space-y-2">
                <h4 className="font-medium">Version History</h4>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Version</TableHead>
                        <TableHead>Actor</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {versions.map((version) => (
                        <TableRow key={version.version}>
                          <TableCell>v{version.version}</TableCell>
                          <TableCell>{version.actor}</TableCell>
                          <TableCell>
                            {new Date(version.updatedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {version.version !== currentTheme.version && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRevert(version.version)}
                                disabled={saving}
                              >
                                Revert
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};