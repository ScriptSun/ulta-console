import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

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
  const [darkThemeVariant, setDarkThemeVariant] = useState<DarkThemeVariant>('default');

  // Load saved theme variant on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && DARK_THEMES.find(t => t.id === saved)) {
      setDarkThemeVariant(saved as DarkThemeVariant);
    }
  }, []);

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

  const setThemeVariant = (variant: DarkThemeVariant) => {
    setDarkThemeVariant(variant);
    localStorage.setItem(STORAGE_KEY, variant);
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