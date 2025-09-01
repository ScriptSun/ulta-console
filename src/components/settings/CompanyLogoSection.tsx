import { useRef, useState } from 'react';
import { Upload, X, Sun, Moon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCompanyLogo } from '@/hooks/useCompanyLogo';

export function CompanyLogoSection() {
  const {
    logoSettings,
    loading,
    uploading,
    uploadLogo,
    saveLogoSettings,
    removeLogo
  } = useCompanyLogo();

  const [dimensions, setDimensions] = useState({
    width: logoSettings.logo_width,
    height: logoSettings.logo_height
  });

  const lightFileRef = useRef<HTMLInputElement>(null);
  const darkFileRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (file: File, theme: 'light' | 'dark') => {
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    const publicUrl = await uploadLogo(file, theme);
    if (publicUrl) {
      await saveLogoSettings({
        [`logo_${theme}_url`]: publicUrl
      });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, theme: 'light' | 'dark') => {
    const file = event.target.files?.[0];
    if (file) {
      handleLogoUpload(file, theme);
    }
    event.target.value = '';
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

  return (
    <Card className="bg-gradient-card border-card-border shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sun className="h-5 w-5" />
          Company Logo Settings
        </CardTitle>
        <CardDescription>
          Upload and configure your company logos for light and dark themes. These will replace the UltaAI branding in the sidebar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Light Theme Logo */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4" />
              <Label className="text-base font-medium">Light Theme Logo</Label>
            </div>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <div className="space-y-4">
                <div className="h-16 bg-background border rounded flex items-center justify-center">
                  {logoSettings.logo_light_url ? (
                    <img
                      src={logoSettings.logo_light_url}
                      alt="Light theme logo"
                      className="max-h-full max-w-full object-contain"
                      style={{
                        width: `${dimensions.width}px`,
                        height: `${dimensions.height}px`
                      }}
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground">Light Logo Preview</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {logoSettings.logo_light_url ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => lightFileRef.current?.click()}
                        disabled={uploading.light}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading.light ? 'Uploading...' : 'Replace'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveLogo('light')}
                        disabled={loading}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => lightFileRef.current?.click()}
                      disabled={uploading.light}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading.light ? 'Uploading...' : 'Upload Light Logo'}
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG up to 5MB
                  </p>
                </div>
              </div>
            </div>
            <input
              ref={lightFileRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'light')}
              className="hidden"
            />
          </div>

          {/* Dark Theme Logo */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4" />
              <Label className="text-base font-medium">Dark Theme Logo</Label>
            </div>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <div className="space-y-4">
                <div className="h-16 bg-gray-900 border rounded flex items-center justify-center">
                  {logoSettings.logo_dark_url ? (
                    <img
                      src={logoSettings.logo_dark_url}
                      alt="Dark theme logo"
                      className="max-h-full max-w-full object-contain"
                      style={{
                        width: `${dimensions.width}px`,
                        height: `${dimensions.height}px`
                      }}
                    />
                  ) : (
                    <span className="text-sm text-white">Dark Logo Preview</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {logoSettings.logo_dark_url ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => darkFileRef.current?.click()}
                        disabled={uploading.dark}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading.dark ? 'Uploading...' : 'Replace'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveLogo('dark')}
                        disabled={loading}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => darkFileRef.current?.click()}
                      disabled={uploading.dark}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading.dark ? 'Uploading...' : 'Upload Dark Logo'}
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG up to 5MB
                  </p>
                </div>
              </div>
            </div>
            <input
              ref={darkFileRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'dark')}
              className="hidden"
            />
          </div>
        </div>

        {/* Logo Size Controls */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Logo Dimensions</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="logo-width">Width (px)</Label>
              <Input
                id="logo-width"
                type="number"
                min="50"
                max="300"
                value={dimensions.width}
                onChange={(e) => setDimensions(prev => ({ 
                  ...prev, 
                  width: parseInt(e.target.value) || 120 
                }))}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo-height">Height (px)</Label>
              <Input
                id="logo-height"
                type="number"
                min="20"
                max="100"
                value={dimensions.height}
                onChange={(e) => setDimensions(prev => ({ 
                  ...prev, 
                  height: parseInt(e.target.value) || 40 
                }))}
                className="w-full"
              />
            </div>
          </div>
          <Button 
            onClick={handleDimensionsSave}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Saving...' : 'Save Logo Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}