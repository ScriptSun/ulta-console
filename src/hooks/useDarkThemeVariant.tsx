import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type DarkThemeVariant = 'default' | 'warm-dark' | 'cool-dark' | 'soft-dark' | 'ocean-dark';

export interface DarkTheme {
  id: DarkThemeVariant;
  name: string;
  description: string;
  backgroundColor: string;
  primaryColor: string;
  accentColor: string;
  buttonClass: string;
  cardClass: string;
}

export const DARK_THEMES: DarkTheme[] = [
  {
    id: 'default',
    name: 'Default Dark',
    description: 'Standard dark theme with purple accents',
    backgroundColor: 'hsl(240, 10%, 6%)',
    primaryColor: 'hsl(250, 70%, 60%)',
    accentColor: 'hsl(240, 8%, 18%)',
    buttonClass: 'btn-theme-default',
    cardClass: 'bg-card',
  },
  {
    id: 'warm-dark',
    name: 'Warm Dark',
    description: 'Eye-comfortable warm blacks with amber accents',
    backgroundColor: 'hsl(20, 14%, 4%)',
    primaryColor: 'hsl(35, 95%, 55%)',
    accentColor: 'hsl(20, 14%, 16%)',
    buttonClass: 'btn-theme-warm',
    cardClass: 'card-theme-warm',
  },
  {
    id: 'cool-dark',
    name: 'Cool Dark',
    description: 'Refreshing cool blacks with cyan accents',
    backgroundColor: 'hsl(200, 50%, 3%)',
    primaryColor: 'hsl(193, 95%, 68%)',
    accentColor: 'hsl(200, 50%, 15%)',
    buttonClass: 'btn-theme-cool',
    cardClass: 'card-theme-cool',
  },
  {
    id: 'soft-dark',
    name: 'Soft Dark',
    description: 'Gentle neutral blacks with purple accents',
    backgroundColor: 'hsl(240, 10%, 4%)',
    primaryColor: 'hsl(280, 65%, 60%)',
    accentColor: 'hsl(240, 10%, 16%)',
    buttonClass: 'btn-theme-soft',
    cardClass: 'card-theme-soft',
  },
  {
    id: 'ocean-dark',
    name: 'Deep Ocean',
    description: 'Calming deep blues with teal accents',
    backgroundColor: 'hsl(210, 50%, 3%)',
    primaryColor: 'hsl(193, 95%, 68%)',
    accentColor: 'hsl(210, 50%, 15%)',
    buttonClass: 'btn-theme-ocean',
    cardClass: 'card-theme-ocean',
  },
];

const STORAGE_KEY = 'ultaai-dark-theme-variant';

export const useDarkThemeVariant = () => {
  const { mode } = useTheme();
  const { user } = useAuth();
  const [darkThemeVariant, setDarkThemeVariant] = useState<DarkThemeVariant>('default');

  // Load saved theme variant on mount from database
  useEffect(() => {
    if (user) {
      loadThemeVariantFromDatabase();
    } else {
      // Fallback to localStorage for unauthenticated users
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && DARK_THEMES.find(t => t.id === saved)) {
        setDarkThemeVariant(saved as DarkThemeVariant);
      }
    }
  }, [user]);

  const loadThemeVariantFromDatabase = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading theme variant:', error);
        return;
      }

      if (data && (data as any).dark_theme_variant && DARK_THEMES.find(t => t.id === (data as any).dark_theme_variant)) {
        setDarkThemeVariant((data as any).dark_theme_variant as DarkThemeVariant);
      }
    } catch (error) {
      console.error('Error loading theme variant:', error);
    }
  };

  // Apply theme class to document
  useEffect(() => {
    if (mode === 'dark') {
      // Remove all existing theme classes
      document.documentElement.classList.remove(
        'theme-warm-dark',
        'theme-cool-dark', 
        'theme-soft-dark',
        'theme-ocean-dark'
      );
      
      // Add the selected theme class (if not default)
      if (darkThemeVariant !== 'default') {
        document.documentElement.classList.add(`theme-${darkThemeVariant}`);
      }
    }
  }, [mode, darkThemeVariant]);

  const setThemeVariant = async (variant: DarkThemeVariant) => {
    setDarkThemeVariant(variant);
    
    if (user) {
      // Save to database for authenticated users
      try {
        const { error } = await supabase
          .from('user_preferences')
          .upsert(
            {
              user_id: user.id,
              dark_theme_variant: variant,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'user_id',
            }
          );

        if (error) {
          console.error('Error saving theme variant:', error);
          // Fallback to localStorage if database save fails
          localStorage.setItem(STORAGE_KEY, variant);
        }
      } catch (error) {
        console.error('Error saving theme variant:', error);
        // Fallback to localStorage if database save fails
        localStorage.setItem(STORAGE_KEY, variant);
      }
    } else {
      // Fallback to localStorage for unauthenticated users
      localStorage.setItem(STORAGE_KEY, variant);
    }
  };

  const getCurrentTheme = () => {
    return DARK_THEMES.find(t => t.id === darkThemeVariant) || DARK_THEMES[0];
  };

  return {
    darkThemeVariant,
    setThemeVariant,
    getCurrentTheme,
    darkThemes: DARK_THEMES,
    isDarkMode: mode === 'dark',
  };
};