import { ThemeSpec, ThemeValidationResult, ThemeVersionInfo } from '@/types/themeTypes';
import { validateThemeHex, hexToHsl, hslToHex } from '@/lib/colorHelpers';

// Mock API with simple timeouts
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Default theme spec with both hex and hsl
const defaultThemeSpec: ThemeSpec = {
  preference: "light",
  name: "Default Light",
  hex: {
    primary: "#8b5cf6",
    secondary: "#f1f5f9",
    accent: "#e2e8f0",
    background: "#ffffff", 
    foreground: "#0f172a",
    muted: "#f8fafc",
    card: "#ffffff",
    border: "#e2e8f0",
    destructive: "#ef4444",
    success: "#22c55e",
    warning: "#f59e0b"
  },
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
  radius: { sm: 6, md: 12, lg: 16, xl: 24 },
  updatedAt: new Date().toISOString(),
  version: 1
};

// Store in localStorage for persistence
const STORAGE_KEY = 'theme-spec';
const VERSIONS_KEY = 'theme-versions';

// Migration helper: convert old HSL-only theme to new format
const migrateTheme = (theme: any): ThemeSpec => {
  if (theme.hex) return theme; // Already migrated
  
  const hex: Record<string, string> = {};
  Object.entries(theme.hsl).forEach(([key, hsl]) => {
    const [h, s, l] = hsl as [number, number, number];
    hex[key] = hslToHex(h, s, l);
  });
  
  return { ...theme, hex };
};

let currentTheme: ThemeSpec = migrateTheme(JSON.parse(localStorage.getItem(STORAGE_KEY) || JSON.stringify(defaultThemeSpec)));
let versions: ThemeVersionInfo[] = JSON.parse(localStorage.getItem(VERSIONS_KEY) || '[]');

// Initialize default version if empty
if (versions.length === 0) {
  versions = [{
    version: 1,
    actor: 'system',
    updatedAt: defaultThemeSpec.updatedAt
  }];
  localStorage.setItem(VERSIONS_KEY, JSON.stringify(versions));
}

export const apiTheme = {
  async getTheme(): Promise<ThemeSpec> {
    await delay(200);
    return { ...currentTheme };
  },

  async validateTheme(theme: ThemeSpec): Promise<ThemeValidationResult> {
    await delay(300);
    
    // Validate HEX colors
    const hexValidation = validateThemeHex(theme.hex);
    if (!hexValidation.ok) {
      return {
        ok: false,
        reasons: hexValidation.issues,
        issues: hexValidation.issues
      };
    }

    // Validate radius values
    const issues: string[] = [];
    Object.entries(theme.radius).forEach(([key, value]) => {
      if (value < 0 || value > 100) issues.push(`${key} radius must be 0-100px`);
      if (isNaN(value)) issues.push(`${key} radius contains invalid value`);
    });

    return {
      ok: issues.length === 0,
      reasons: issues.length > 0 ? issues : undefined,
      issues: issues.length > 0 ? issues : undefined
    };
  },

  async applyTheme(theme: ThemeSpec, options?: { overrideContrast?: boolean }): Promise<{ theme: ThemeSpec; etag: string }> {
    await delay(400);
    
    // Validate first if not overriding
    if (!options?.overrideContrast) {
      const validation = await this.validateTheme(theme);
      if (!validation.ok) {
        throw new Error(`Validation failed: ${validation.issues?.join(', ')}`);
      }
    }

    // Convert HEX to HSL for CSS variables
    const hsl: Record<string, [number, number, number]> = {};
    Object.entries(theme.hex).forEach(([key, hexValue]) => {
      try {
        hsl[key] = hexToHsl(hexValue);
      } catch (error) {
        throw new Error(`Invalid HEX color for ${key}: ${hexValue}`);
      }
    });

    // Update theme
    const newTheme: ThemeSpec = {
      ...theme,
      hsl: hsl as ThemeSpec['hsl'],
      version: currentTheme.version + 1,
      updatedAt: new Date().toISOString()
    };

    currentTheme = newTheme;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentTheme));

    // Add to version history
    const newVersion: ThemeVersionInfo = {
      version: newTheme.version,
      actor: 'user', // In real app, get from auth
      updatedAt: newTheme.updatedAt
    };
    
    versions.unshift(newVersion);
    localStorage.setItem(VERSIONS_KEY, JSON.stringify(versions));

    return {
      theme: newTheme,
      etag: `"${newTheme.version}-${Date.now()}"`
    };
  },

  async getVersions(): Promise<ThemeVersionInfo[]> {
    await delay(200);
    return [...versions];
  },

  async revertToVersion(version: number): Promise<ThemeSpec> {
    await delay(300);
    
    // In a real app, we'd fetch the actual theme data for that version
    // For now, just increment version and return current with modifications
    const revertedTheme: ThemeSpec = {
      ...currentTheme,
      version: currentTheme.version + 1,
      updatedAt: new Date().toISOString(),
      name: `${currentTheme.name} (Reverted to v${version})`
    };

    currentTheme = revertedTheme;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentTheme));

    // Add revert to version history
    const revertVersion: ThemeVersionInfo = {
      version: revertedTheme.version,
      actor: 'user',
      updatedAt: revertedTheme.updatedAt
    };
    
    versions.unshift(revertVersion);
    localStorage.setItem(VERSIONS_KEY, JSON.stringify(versions));

    return revertedTheme;
  }
};