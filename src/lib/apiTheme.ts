import { ThemeSpec, ThemeValidationResult, ThemeVersionInfo } from '@/types/themeTypes';

// Mock API with simple timeouts
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Default theme spec
const defaultThemeSpec: ThemeSpec = {
  preference: "light",
  name: "Default Light",
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

let currentTheme: ThemeSpec = JSON.parse(localStorage.getItem(STORAGE_KEY) || JSON.stringify(defaultThemeSpec));
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
    
    const reasons: string[] = [];
    
    // Validate HSL ranges
    Object.entries(theme.hsl).forEach(([key, [h, s, l]]) => {
      if (h < 0 || h > 360) reasons.push(`${key} hue must be 0-360`);
      if (s < 0 || s > 100) reasons.push(`${key} saturation must be 0-100`);
      if (l < 0 || l > 100) reasons.push(`${key} lightness must be 0-100`);
      if (isNaN(h) || isNaN(s) || isNaN(l)) reasons.push(`${key} contains invalid values`);
    });

    // Validate radius values
    Object.entries(theme.radius).forEach(([key, value]) => {
      if (value < 0 || value > 100) reasons.push(`${key} radius must be 0-100px`);
      if (isNaN(value)) reasons.push(`${key} radius contains invalid value`);
    });

    // Check contrast (simplified mock validation)
    const bgLightness = theme.hsl.background[2];
    const fgLightness = theme.hsl.foreground[2];
    const primaryLightness = theme.hsl.primary[2];
    
    if (Math.abs(bgLightness - fgLightness) < 40) {
      reasons.push('Insufficient contrast between foreground and background');
    }
    
    if (Math.abs(bgLightness - primaryLightness) < 25) {
      reasons.push('Insufficient contrast between primary and background');
    }

    // Check for flat UI (background and card should differ)
    if (Math.abs(theme.hsl.background[2] - theme.hsl.card[2]) < 2) {
      reasons.push('Background and card lightness must differ by at least 2 points');
    }

    return {
      ok: reasons.length === 0,
      reasons: reasons.length > 0 ? reasons : undefined
    };
  },

  async applyTheme(theme: ThemeSpec, options?: { overrideContrast?: boolean }): Promise<{ theme: ThemeSpec; etag: string }> {
    await delay(400);
    
    // Validate first if not overriding
    if (!options?.overrideContrast) {
      const validation = await this.validateTheme(theme);
      if (!validation.ok) {
        throw new Error(`Validation failed: ${validation.reasons?.join(', ')}`);
      }
    }

    // Update theme
    const newTheme: ThemeSpec = {
      ...theme,
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