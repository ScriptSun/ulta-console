import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useTheme, CompanyTheme, ThemeColors } from '@/contexts/ThemeContext';
import { useToast } from '@/components/ui/use-toast';
import { Palette, Save, Plus, Eye, Download, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const ColorInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}> = ({ label, value, onChange, description }) => {
  const [hslValue, setHslValue] = useState(value);

  const handleChange = (newValue: string) => {
    setHslValue(newValue);
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <div className="flex gap-2 items-center">
        <div 
          className="w-8 h-8 rounded border border-border"
          style={{ backgroundColor: `hsl(${hslValue})` }}
        />
        <Input
          value={hslValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="262 83% 58%"
          className="font-mono text-xs"
        />
      </div>
    </div>
  );
};

export const ThemeCustomizer: React.FC = () => {
  const { currentTheme, createCustomTheme, updateTheme, setActiveTheme } = useTheme();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [newTheme, setNewTheme] = useState<Omit<CompanyTheme, 'id'>>({
    name: '',
    colors: { ...currentTheme.colors }
  });

  const colorDefinitions = [
    { key: 'primary' as keyof ThemeColors, label: 'Primary', description: 'Main brand color' },
    { key: 'secondary' as keyof ThemeColors, label: 'Secondary', description: 'Secondary elements' },
    { key: 'accent' as keyof ThemeColors, label: 'Accent', description: 'Highlight color' },
    { key: 'background' as keyof ThemeColors, label: 'Background', description: 'Page background' },
    { key: 'foreground' as keyof ThemeColors, label: 'Foreground', description: 'Text color' },
    { key: 'muted' as keyof ThemeColors, label: 'Muted', description: 'Subtle backgrounds' },
    { key: 'card' as keyof ThemeColors, label: 'Card', description: 'Card backgrounds' },
    { key: 'border' as keyof ThemeColors, label: 'Border', description: 'Border colors' },
    { key: 'destructive' as keyof ThemeColors, label: 'Destructive', description: 'Error/delete actions' },
    { key: 'success' as keyof ThemeColors, label: 'Success', description: 'Success messages' },
    { key: 'warning' as keyof ThemeColors, label: 'Warning', description: 'Warning messages' },
  ];

  const handleColorChange = (colorKey: keyof ThemeColors, value: string) => {
    setNewTheme(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [colorKey]: value
      }
    }));
  };

  const handlePreviewTheme = () => {
    const previewTheme: CompanyTheme = {
      ...newTheme,
      id: 'preview'
    };
    setActiveTheme(previewTheme);
  };

  const handleSaveTheme = async () => {
    if (!newTheme.name.trim()) {
      toast({
        title: 'Theme name required',
        description: 'Please provide a name for your custom theme.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      const savedTheme = await createCustomTheme(newTheme);
      await setActiveTheme(savedTheme);
      
      toast({
        title: 'Theme created',
        description: 'Your custom theme has been saved and applied.',
      });

      // Reset form
      setNewTheme({
        name: '',
        colors: { ...currentTheme.colors }
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create custom theme.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const exportTheme = () => {
    const themeData = {
      name: newTheme.name || 'Custom Theme',
      colors: newTheme.colors,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(themeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${themeData.name.toLowerCase().replace(/\s+/g, '-')}-theme.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (imported.colors && imported.name) {
          setNewTheme({
            name: imported.name,
            colors: imported.colors
          });
          toast({
            title: 'Theme imported',
            description: 'Theme has been loaded successfully.',
          });
        }
      } catch (error) {
        toast({
          title: 'Import failed',
          description: 'Invalid theme file format.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Theme Customizer
        </CardTitle>
        <CardDescription>
          Create and customize your company's theme colors and appearance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="colors" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="manage">Manage</TabsTrigger>
          </TabsList>

          <TabsContent value="colors" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="theme-name">Theme Name</Label>
                <Input
                  id="theme-name"
                  value={newTheme.name}
                  onChange={(e) => setNewTheme(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Custom Theme"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {colorDefinitions.map(({ key, label, description }) => (
                  <ColorInput
                    key={key}
                    label={label}
                    description={description}
                    value={newTheme.colors[key]}
                    onChange={(value) => handleColorChange(key, value)}
                  />
                ))}
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button onClick={handlePreviewTheme} variant="outline">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
                <Button onClick={exportTheme} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
                <label className="cursor-pointer">
                  <Button variant="outline" asChild>
                    <span>
                      <Upload className="mr-2 h-4 w-4" />
                      Import
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept=".json"
                    onChange={importTheme}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <div className="p-4 border rounded-lg space-y-4">
              <h3 className="text-lg font-semibold">Theme Preview</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Button className="w-full">Primary Button</Button>
                  <Button variant="secondary" className="w-full">Secondary Button</Button>
                  <Button variant="outline" className="w-full">Outline Button</Button>
                </div>
                <div className="space-y-2">
                  <div className="p-3 bg-card border rounded">
                    <p className="text-foreground">Card with text content</p>
                    <p className="text-muted-foreground text-sm">Muted description text</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge>Default Badge</Badge>
                    <Badge variant="destructive">Error</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                  </div>
                </div>
              </div>
              
              <Button onClick={handleSaveTheme} disabled={isCreating} className="w-full">
                {isCreating ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save & Apply Theme
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="manage" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <h3 className="font-semibold mb-2">CSS Custom Properties</h3>
              <p className="mb-4">
                Your theme colors are available as CSS custom properties. You can use them in your custom CSS:
              </p>
              <div className="bg-muted p-3 rounded font-mono text-xs space-y-1">
                <div>color: hsl(var(--primary));</div>
                <div>background-color: hsl(var(--background));</div>
                <div>border-color: hsl(var(--border));</div>
              </div>
              
              <h4 className="font-semibold mt-4 mb-2">Available Variables:</h4>
              <div className="grid gap-1 text-xs font-mono">
                {colorDefinitions.map(({ key, label }) => (
                  <div key={key} className="flex justify-between">
                    <span>--{key}</span>
                    <span className="text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};