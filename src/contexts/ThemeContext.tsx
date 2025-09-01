import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  card: string;
  border: string;
  destructive: string;
  success: string;
  warning: string;
}

export interface CompanyTheme {
  id?: string;
  name: string;
  colors: ThemeColors;
  logo?: string;
  font_family?: string;
  created_by?: string;
  is_active?: boolean;
}

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  currentTheme: CompanyTheme;
  availableThemes: CompanyTheme[];
  setActiveTheme: (theme: CompanyTheme) => Promise<void>;
  createCustomTheme: (theme: Omit<CompanyTheme, 'id'>) => Promise<CompanyTheme>;
  updateTheme: (themeId: string, updates: Partial<CompanyTheme>) => Promise<void>;
  loading: boolean;
}

const defaultLightTheme: CompanyTheme = {
  name: 'Default Light',
  colors: {
    primary: '262 83% 58%', // Blue
    secondary: '210 40% 95%', // Light gray
    accent: '210 40% 90%',
    background: '0 0% 100%', // White
    foreground: '222.2 84% 4.9%', // Dark text
    muted: '210 40% 96%',
    card: '0 0% 100%',
    border: '214.3 31.8% 91.4%',
    destructive: '0 84.2% 60.2%', // Red
    success: '142.1 76.2% 36.3%', // Green
    warning: '47.9 95.8% 53.1%', // Yellow
  }
};

const defaultDarkTheme: CompanyTheme = {
  name: 'Default Dark',
  colors: {
    primary: '262 83% 58%',
    secondary: '217.2 32.6% 17.5%',
    accent: '217.2 32.6% 17.5%',
    background: '222.2 84% 4.9%', // Dark
    foreground: '210 40% 98%', // Light text
    muted: '217.2 32.6% 17.5%',
    card: '222.2 84% 4.9%',
    border: '217.2 32.6% 17.5%',
    destructive: '0 62.8% 30.6%',
    success: '142.1 70.6% 45.3%',
    warning: '47.9 95.8% 53.1%',
  }
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [currentTheme, setCurrentTheme] = useState<CompanyTheme>(defaultDarkTheme);
  const [availableThemes, setAvailableThemes] = useState<CompanyTheme[]>([]);
  const [loading, setLoading] = useState(true);

  // Load saved preferences
  useEffect(() => {
    loadThemePreferences();
  }, []);

  // Apply theme mode to document
  useEffect(() => {
    applyThemeMode(mode);
  }, [mode]);

  // Apply theme colors to CSS custom properties
  useEffect(() => {
    applyThemeColors(currentTheme.colors);
  }, [currentTheme]);

  const loadThemePreferences = async () => {
    try {
      // Always default to dark mode if no preference is saved
      const savedMode = localStorage.getItem('theme-mode') as ThemeMode;
      if (savedMode) {
        setModeState(savedMode);
      } else {
        setModeState('dark');
        localStorage.setItem('theme-mode', 'dark');
      }

      // For now, use localStorage for themes until types are updated
      const savedThemes = localStorage.getItem('custom-themes');
      if (savedThemes) {
        try {
          const themes = JSON.parse(savedThemes) as CompanyTheme[];
          setAvailableThemes(themes);
          
          const activeTheme = themes.find(t => t.is_active);
          if (activeTheme) {
            setCurrentTheme(activeTheme);
          }
        } catch (e) {
          console.error('Error parsing saved themes:', e);
        }
      }
    } catch (error) {
      console.error('Error loading theme preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem('theme-mode', newMode);
    applyThemeMode(newMode);
  };

  const applyThemeMode = (themeMode: ThemeMode) => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (themeMode === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(themeMode);
    }
    
    // Apply theme variant class if available
    applyThemeVariant();
  };

  const applyThemeVariant = () => {
    const root = window.document.documentElement;
    
    // Remove existing theme variant classes
    const existingClasses = root.className.split(' ').filter(cls => 
      !cls.startsWith('theme-')
    );
    root.className = existingClasses.join(' ');
    
    // Apply theme variant class based on current theme name
    const themeVariantMap: Record<string, string> = {
      'Soft White': 'theme-soft-white',
      'Cool Gray': 'theme-cool-gray', 
      'Warm Cream': 'theme-warm-cream',
      'Minimal Light': 'theme-minimal-light',
      'Warm Dark': 'theme-warm-dark',
      'Cool Dark': 'theme-cool-dark',
      'Soft Dark': 'theme-soft-dark',
      'Ocean Dark': 'theme-ocean-dark'
    };
    
    const variantClass = themeVariantMap[currentTheme.name];
    if (variantClass) {
      root.classList.add(variantClass);
    }
  };

  const applyThemeColors = (colors: ThemeColors) => {
    const root = window.document.documentElement;
    
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  };

  const setActiveTheme = async (theme: CompanyTheme) => {
    try {
      // Update available themes to mark new active theme
      setAvailableThemes(prev => 
        prev.map(t => ({ ...t, is_active: t.name === theme.name }))
      );

      setCurrentTheme(theme);
      
      // Apply theme colors immediately
      applyThemeColors(theme.colors);
      
      // Apply theme variant class
      setTimeout(() => {
        applyThemeVariant();
      }, 0);
      
      // Save preference locally
      localStorage.setItem('active-theme', JSON.stringify(theme));
      
      // Save custom themes to localStorage
      const customThemes = availableThemes.filter(t => t.id && t.id !== 'preview');
      localStorage.setItem('custom-themes', JSON.stringify(customThemes));
    } catch (error) {
      console.error('Error setting active theme:', error);
    }
  };

  const createCustomTheme = async (theme: Omit<CompanyTheme, 'id'>): Promise<CompanyTheme> => {
    try {
      const newTheme: CompanyTheme = {
        ...theme,
        id: `custom-${Date.now()}`,
        created_by: (await supabase.auth.getUser()).data.user?.id || 'anonymous'
      };

      setAvailableThemes(prev => [...prev, newTheme]);
      
      // Save to localStorage
      const allThemes = [...availableThemes, newTheme];
      localStorage.setItem('custom-themes', JSON.stringify(allThemes));
      
      return newTheme;
    } catch (error) {
      console.error('Error creating custom theme:', error);
      throw error;
    }
  };

  const updateTheme = async (themeId: string, updates: Partial<CompanyTheme>): Promise<void> => {
    try {
      // Update local state
      setAvailableThemes(prev =>
        prev.map(theme => 
          theme.id === themeId ? { ...theme, ...updates } : theme
        )
      );

      // Update current theme if it's the one being updated
      if (currentTheme.id === themeId) {
        setCurrentTheme(prev => ({ ...prev, ...updates }));
      }
      
      // Save to localStorage
      const updatedThemes = availableThemes.map(theme => 
        theme.id === themeId ? { ...theme, ...updates } : theme
      );
      localStorage.setItem('custom-themes', JSON.stringify(updatedThemes));
    } catch (error) {
      console.error('Error updating theme:', error);
      throw error;
    }
  };

  const value = {
    mode,
    setMode,
    currentTheme,
    availableThemes: [defaultLightTheme, defaultDarkTheme, ...availableThemes],
    setActiveTheme,
    createCustomTheme,
    updateTheme,
    loading
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};