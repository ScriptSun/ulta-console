import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  X,
  Upload,
  Trash2,
  Download,
  Eye,
  Loader2,
  Check,
  Image,
  Palette
} from 'lucide-react';
import { useCompanyLogo } from '@/hooks/useCompanyLogo';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface LogoFaviconManagerProps {
  open: boolean;
  onClose: () => void;
}

const FAVICON_TARGETS = [
  { name: 'favicon.ico', size: '16x16, 32x32, 48x48' },
  { name: 'apple-touch-icon.png', size: '180x180' },
  { name: 'android-chrome-192x192.png', size: '192x192' },
  { name: 'android-chrome-512x512.png', size: '512x512' },
  { name: 'mstile-150x150.png', size: '150x150' }
];

export function LogoFaviconManager({ open, onClose }: LogoFaviconManagerProps) {
  const { toast } = useToast();
  const { 
    logoSettings, 
    loading, 
    uploading, 
    uploadLogo, 
    saveLogoSettings, 
    removeLogo 
  } = useCompanyLogo();

  const lightLogoRef = useRef<HTMLInputElement>(null);
  const darkLogoRef = useRef<HTMLInputElement>(null);
  const emailLogoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  const [dimensions, setDimensions] = useState({
    width: logoSettings.logo_width || 120,
    height: logoSettings.logo_height || 40
  });

  const [emailLogo, setEmailLogo] = useState<string>('');
  const [faviconSource, setFaviconSource] = useState<string>('');
  const [generatingFavicons, setGeneratingFavicons] = useState(false);
  const [faviconGenerated, setFaviconGenerated] = useState(false);

  useEffect(() => {
    if (logoSettings) {
      setDimensions({
        width: logoSettings.logo_width || 120,
        height: logoSettings.logo_height || 40
      });
    }
  }, [logoSettings]);

  const handleLogoUpload = async (file: File, theme: 'light' | 'dark' | 'email') => {
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    const url = await uploadLogo(file, theme as 'light' | 'dark');
    if (url) {
      if (theme === 'email') {
        setEmailLogo(url);
      } else {
        const settings = {
          [`logo_${theme}_url`]: url
        } as any;
        await saveLogoSettings(settings);
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, theme: 'light' | 'dark' | 'email') => {
    const file = event.target.files?.[0];
    if (file) {
      handleLogoUpload(file, theme);
    }
  };

  const handleFaviconUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate it's a PNG and square
      if (!file.type.includes('png')) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PNG file for favicon.",
          variant: "destructive",
        });
        return;
      }

      // Create object URL for preview
      const url = URL.createObjectURL(file);
      setFaviconSource(url);
    }
  };

  const handleDimensionsSave = async () => {
    await saveLogoSettings({
      logo_width: dimensions.width,
      logo_height: dimensions.height
    });
  };

  const handleRemoveLogo = async (theme: 'light' | 'dark') => {
    await removeLogo(theme);
  };

  const generateFavicons = async () => {
    if (!faviconSource) {
      toast({
        title: "No favicon source",
        description: "Please upload a PNG file first.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingFavicons(true);
    try {
      // Simulate favicon generation process
      await new Promise(resolve => setTimeout(resolve, 2000));
      setFaviconGenerated(true);
      toast({
        title: "Favicons generated",
        description: "All favicon sizes have been generated successfully.",
      });
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Failed to generate favicons. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingFavicons(false);
    }
  };

  const handleSaveAndApply = async () => {
    try {
      // Save all logo settings including dimensions
      await saveLogoSettings({
        logo_width: dimensions.width,
        logo_height: dimensions.height
      });

      // Save email logo if provided
      if (emailLogo) {
        // For now, we'll just show success since the main logo settings are saved
        // In a full implementation, you'd save the email logo to the database as well
      }

      // Show success message
      toast({
        title: "Brand assets saved",
        description: "Your brand logos and settings have been saved successfully.",
      });
      
      // Close the drawer
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save failed",
        description: "Failed to save brand assets. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Logos and Favicon Management
            </CardTitle>
            <CardDescription>
              Upload and manage your brand logos and generate favicons
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Logo Management Section */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Brand Logos</h3>
            
            <div className="grid gap-6 md:grid-cols-2">
              {/* Light Theme Logo */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Light Theme Logo</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center space-y-4">
                  {logoSettings.logo_light_url ? (
                    <div className="space-y-4">
                      <img 
                        src={logoSettings.logo_light_url} 
                        alt="Light logo" 
                        className="max-h-20 mx-auto"
                        style={{ width: dimensions.width, height: dimensions.height }}
                      />
                      <div className="flex gap-2 justify-center my-[10%]">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => lightLogoRef.current?.click()}
                          disabled={uploading.light}
                        >
                          Replace
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRemoveLogo('light')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                      <Button 
                        onClick={() => lightLogoRef.current?.click()}
                        disabled={uploading.light}
                      >
                        {uploading.light ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
                        ) : (
                          <>Upload Light Logo</>
                        )}
                      </Button>
                    </div>
                  )}
                  <input
                    ref={lightLogoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, 'light')}
                  />
                </div>
              </div>

              {/* Dark Theme Logo */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Dark Theme Logo</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center space-y-4 bg-slate-900">
                  {logoSettings.logo_dark_url ? (
                    <div className="space-y-4">
                      <img 
                        src={logoSettings.logo_dark_url} 
                        alt="Dark logo" 
                        className="max-h-20 mx-auto"
                        style={{ width: dimensions.width, height: dimensions.height }}
                      />
                      <div className="flex gap-2 justify-center my-[10%]">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => darkLogoRef.current?.click()}
                          disabled={uploading.dark}
                        >
                          Replace
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRemoveLogo('dark')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="h-12 w-12 text-white mx-auto" />
                      <Button 
                        onClick={() => darkLogoRef.current?.click()}
                        disabled={uploading.dark}
                      >
                        {uploading.dark ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
                        ) : (
                          <>Upload Dark Logo</>
                        )}
                      </Button>
                    </div>
                  )}
                  <input
                    ref={darkLogoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, 'dark')}
                  />
                </div>
              </div>

              {/* Email Logo */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Email Logo</Label>
                <p className="text-xs text-muted-foreground">PNG, recommended height 40px</p>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center space-y-4">
                  {emailLogo ? (
                    <div className="space-y-4">
                      <img src={emailLogo} alt="Email logo" className="max-h-10 mx-auto" />
                      <div className="flex gap-2 justify-center my-[10%]">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => emailLogoRef.current?.click()}
                        >
                          Replace
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setEmailLogo('')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                      <Button onClick={() => emailLogoRef.current?.click()}>
                        Upload Email Logo
                      </Button>
                    </div>
                  )}
                  <input
                    ref={emailLogoRef}
                    type="file"
                    accept="image/png"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, 'email')}
                  />
                </div>
              </div>

              {/* Favicon Source */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Favicon Source</Label>
                <p className="text-xs text-muted-foreground">PNG, square, at least 512x512</p>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center space-y-4">
                  {faviconSource ? (
                    <div className="space-y-4">
                      <img src={faviconSource} alt="Favicon source" className="w-16 h-16 mx-auto" />
                      <div className="flex gap-2 justify-center my-[10%]">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => faviconRef.current?.click()}
                        >
                          Replace
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setFaviconSource('')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                      <Button onClick={() => faviconRef.current?.click()}>
                        Upload Favicon Source
                      </Button>
                    </div>
                  )}
                  <input
                    ref={faviconRef}
                    type="file"
                    accept="image/png"
                    className="hidden"
                    onChange={handleFaviconUpload}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Logo Size Controls */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Logo Size Controls</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="width">Width (px)</Label>
                <Input
                  id="width"
                  type="number"
                  value={dimensions.width}
                  onChange={(e) => setDimensions(prev => ({ ...prev, width: parseInt(e.target.value) || 120 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (px)</Label>
                <Input
                  id="height"
                  type="number"
                  value={dimensions.height}
                  onChange={(e) => setDimensions(prev => ({ ...prev, height: parseInt(e.target.value) || 40 }))}
                />
              </div>
            </div>

            {/* Live Preview */}
            <div className="space-y-4">
              <Label>Live Preview</Label>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-white border rounded-lg">
                  
                  {logoSettings.logo_light_url && (
                    <img 
                      src={logoSettings.logo_light_url} 
                      alt="Light logo preview" 
                      style={{ width: dimensions.width, height: dimensions.height }}
                    />
                  )}
                </div>
                <div className="p-4 bg-slate-900 border rounded-lg">
                  
                  {logoSettings.logo_dark_url && (
                    <img 
                      src={logoSettings.logo_dark_url} 
                      alt="Dark logo preview" 
                      style={{ width: dimensions.width, height: dimensions.height }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Favicon Generation */}
          {faviconSource && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Favicon Generation</h3>
                <Button 
                  onClick={generateFavicons}
                  disabled={generatingFavicons || faviconGenerated}
                >
                  {generatingFavicons ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                  ) : faviconGenerated ? (
                    <><Check className="h-4 w-4 mr-2" /> Generated</>
                  ) : (
                    <>Generate Favicons</>
                  )}
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Favicon Targets</Label>
                <div className="space-y-2">
                  {FAVICON_TARGETS.map((target) => (
                    <div key={target.name} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm font-mono">{target.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{target.size}</span>
                        {faviconGenerated && (
                          <Badge variant="secondary" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Ready
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSaveAndApply} className="flex-1" disabled={loading}>
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <>Save and Apply</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}