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
  setActiveTheme: (theme: CompanyTheme) => void;
  createCustomTheme: (theme: Omit<CompanyTheme, 'id'>) => Promise<void>;
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
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [currentTheme, setCurrentTheme] = useState<CompanyTheme>(defaultLightTheme);
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
      // Load user's theme preference
      const savedMode = localStorage.getItem('theme-mode') as ThemeMode;
      if (savedMode) {
        setModeState(savedMode);
      }

      // Load available company themes from database
      const { data: themes, error } = await supabase
        .from('company_themes')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && themes) {
        setAvailableThemes(themes);
        
        // Find active theme
        const activeTheme = themes.find(t => t.is_active);
        if (activeTheme) {
          setCurrentTheme(activeTheme);
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
  };

  const applyThemeColors = (colors: ThemeColors) => {
    const root = window.document.documentElement;
    
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  };

  const setActiveTheme = async (theme: CompanyTheme) => {
    try {
      // Update database - set all themes inactive first
      await supabase
        .from('company_themes')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Don't update system themes

      // Set selected theme as active
      if (theme.id) {
        await supabase
          .from('company_themes')
          .update({ is_active: true })
          .eq('id', theme.id);
      }

      setCurrentTheme(theme);
      
      // Save preference locally
      localStorage.setItem('active-theme', JSON.stringify(theme));
    } catch (error) {
      console.error('Error setting active theme:', error);
    }
  };

  const createCustomTheme = async (theme: Omit<CompanyTheme, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('company_themes')
        .insert([{
          ...theme,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      const newTheme = data as CompanyTheme;
      setAvailableThemes(prev => [...prev, newTheme]);
      
      return newTheme;
    } catch (error) {
      console.error('Error creating custom theme:', error);
      throw error;
    }
  };

  const updateTheme = async (themeId: string, updates: Partial<CompanyTheme>) => {
    try {
      const { error } = await supabase
        .from('company_themes')
        .update(updates)
        .eq('id', themeId);

      if (error) throw error;

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