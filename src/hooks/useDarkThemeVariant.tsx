import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type DarkThemeVariant = 'default' | 'warm-dark' | 'cool-dark' | 'soft-dark' | 'ocean-dark';
export type LightThemeVariant = 'default' | 'soft-white' | 'cool-gray' | 'warm-cream' | 'minimal-light';

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

export interface LightTheme {
  id: LightThemeVariant;
  name: string;
  description: string;
  backgroundColor: string;
  primaryColor: string;
  accentColor: string;
  buttonClass: string;
  cardClass: string;
}

export const LIGHT_THEMES: LightTheme[] = [
  {
    id: 'default',
    name: 'Default Light',
    description: 'Clean, bright interface with standard colors',
    backgroundColor: 'hsl(0, 0%, 100%)',
    primaryColor: 'hsl(250, 70%, 60%)',
    accentColor: 'hsl(240, 5%, 96%)',
    buttonClass: 'btn-theme-default-light',
    cardClass: 'bg-card',
  },
  {
    id: 'soft-white',
    name: 'Soft White',
    description: 'Gentle off-white background with warm accents',
    backgroundColor: 'hsl(60, 9%, 98%)',
    primaryColor: 'hsl(250, 60%, 58%)',
    accentColor: 'hsl(50, 20%, 94%)',
    buttonClass: 'btn-theme-soft-white',
    cardClass: 'card-theme-soft-white',
  },
  {
    id: 'cool-gray',
    name: 'Cool Gray',
    description: 'Professional gray tones with blue accents',
    backgroundColor: 'hsl(210, 20%, 98%)',
    primaryColor: 'hsl(210, 100%, 50%)',
    accentColor: 'hsl(210, 16%, 93%)',
    buttonClass: 'btn-theme-cool-gray',
    cardClass: 'card-theme-cool-gray',
  },
  {
    id: 'warm-cream',
    name: 'Warm Cream',
    description: 'Comfortable cream background with golden accents',
    backgroundColor: 'hsl(48, 15%, 97%)',
    primaryColor: 'hsl(35, 85%, 55%)',
    accentColor: 'hsl(48, 25%, 92%)',
    buttonClass: 'btn-theme-warm-cream',
    cardClass: 'card-theme-warm-cream',
  },
  {
    id: 'minimal-light',
    name: 'Minimal Light',
    description: 'Ultra-clean minimal interface with subtle borders',
    backgroundColor: 'hsl(0, 0%, 99%)',
    primaryColor: 'hsl(0, 0%, 20%)',
    accentColor: 'hsl(0, 0%, 97%)',
    buttonClass: 'btn-theme-minimal',
    cardClass: 'card-theme-minimal',
  },
];

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

const STORAGE_KEY_DARK = 'ultaai-dark-theme-variant';
const STORAGE_KEY_LIGHT = 'ultaai-light-theme-variant';

export const useThemeVariants = () => {
  const { mode } = useTheme();
  const { user } = useAuth();
  const [darkThemeVariant, setDarkThemeVariantState] = useState<DarkThemeVariant>('default');
  const [lightThemeVariant, setLightThemeVariantState] = useState<LightThemeVariant>('default');

  const loadThemeVariantsFromDatabase = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading theme variants:', error);
        return;
      }

      if (data) {
        const darkVariant = (data as any).dark_theme_variant;
        const lightVariant = (data as any).light_theme_variant;
        
        if (darkVariant && DARK_THEMES.find(t => t.id === darkVariant)) {
          setDarkThemeVariantState(darkVariant as DarkThemeVariant);
        }
        if (lightVariant && LIGHT_THEMES.find(t => t.id === lightVariant)) {
          setLightThemeVariantState(lightVariant as LightThemeVariant);
        }
      }
    } catch (error) {
      console.error('Error loading theme variants:', error);
    }
  };

  // Load saved theme variants on mount from database
  useEffect(() => {
    if (user) {
      loadThemeVariantsFromDatabase();
    } else {
      // Fallback to localStorage for unauthenticated users
      const savedDark = localStorage.getItem(STORAGE_KEY_DARK);
      const savedLight = localStorage.getItem(STORAGE_KEY_LIGHT);
      
      if (savedDark && DARK_THEMES.find(t => t.id === savedDark)) {
        setDarkThemeVariantState(savedDark as DarkThemeVariant);
      }
      if (savedLight && LIGHT_THEMES.find(t => t.id === savedLight)) {
        setLightThemeVariantState(savedLight as LightThemeVariant);
      }
    }
  }, [user]);

  // Apply theme class to document
  useEffect(() => {
    // Remove all existing theme classes
    document.documentElement.classList.remove(
      'theme-warm-dark',
      'theme-cool-dark', 
      'theme-soft-dark',
      'theme-ocean-dark',
      'theme-soft-white',
      'theme-cool-gray',
      'theme-warm-cream',
      'theme-minimal-light'
    );
    
    // Add the selected theme class based on current mode
    if (mode === 'dark' && darkThemeVariant !== 'default') {
      document.documentElement.classList.add(`theme-${darkThemeVariant}`);
    } else if (mode === 'light' && lightThemeVariant !== 'default') {
      document.documentElement.classList.add(`theme-${lightThemeVariant}`);
    }
  }, [mode, darkThemeVariant, lightThemeVariant]);

  const updateDarkThemeVariant = async (variant: DarkThemeVariant) => {
    setDarkThemeVariantState(variant);
    
    if (user) {
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
          console.error('Error saving dark theme variant:', error);
          localStorage.setItem(STORAGE_KEY_DARK, variant);
        }
      } catch (error) {
        console.error('Error saving dark theme variant:', error);
        localStorage.setItem(STORAGE_KEY_DARK, variant);
      }
    } else {
      localStorage.setItem(STORAGE_KEY_DARK, variant);
    }
  };

  const updateLightThemeVariant = async (variant: LightThemeVariant) => {
    setLightThemeVariantState(variant);
    
    if (user) {
      try {
        const { error } = await supabase
          .from('user_preferences')
          .upsert(
            {
              user_id: user.id,
              light_theme_variant: variant,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'user_id',
            }
          );

        if (error) {
          console.error('Error saving light theme variant:', error);
          localStorage.setItem(STORAGE_KEY_LIGHT, variant);
        }
      } catch (error) {
        console.error('Error saving light theme variant:', error);
        localStorage.setItem(STORAGE_KEY_LIGHT, variant);
      }
    } else {
      localStorage.setItem(STORAGE_KEY_LIGHT, variant);
    }
  };

  const getCurrentDarkTheme = () => {
    return DARK_THEMES.find(t => t.id === darkThemeVariant) || DARK_THEMES[0];
  };

  const getCurrentLightTheme = () => {
    return LIGHT_THEMES.find(t => t.id === lightThemeVariant) || LIGHT_THEMES[0];
  };

  return {
    // Dark theme
    darkThemeVariant,
    setDarkThemeVariant: updateDarkThemeVariant,
    getCurrentDarkTheme,
    darkThemes: DARK_THEMES,
    
    // Light theme
    lightThemeVariant,
    setLightThemeVariant: updateLightThemeVariant,
    getCurrentLightTheme,
    lightThemes: LIGHT_THEMES,
    
    // General
    isDarkMode: mode === 'dark',
    isLightMode: mode === 'light',
  };
};