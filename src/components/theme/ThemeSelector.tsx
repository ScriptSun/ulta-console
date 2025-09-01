import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme, ThemeMode } from '@/contexts/ThemeContext';
import { Palette, Sun, Moon, Monitor } from 'lucide-react';

export const ThemeSelector: React.FC = () => {
  const { mode, setMode } = useTheme();

  const themeIcons = {
    light: Sun,
    dark: Moon,
    system: Monitor
  };

  return (
    <div className="space-y-6">
      {/* Theme Mode Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme Preference
          </CardTitle>
          <CardDescription>
            Choose your preferred color scheme for the interface.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(Object.entries(themeIcons) as [ThemeMode, any][]).map(([themeMode, Icon]) => {
              const isActive = mode === themeMode;
              return (
                <Button
                  key={themeMode}
                  variant={isActive ? "default" : "outline"}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => setMode(themeMode)}
                >
                  <Icon className="h-6 w-6" />
                  <div className="text-center">
                    <p className="font-medium capitalize">{themeMode}</p>
                    <p className="text-xs text-muted-foreground">
                      {themeMode === 'light' && 'Clean, bright interface'}
                      {themeMode === 'dark' && 'Easy on the eyes'}
                      {themeMode === 'system' && 'Follow device settings'}
                    </p>
                  </div>
                  {isActive && <Badge className="mt-1">Active</Badge>}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Theme Color Scheme Selector - Removed entirely */}
    </div>
  );
};