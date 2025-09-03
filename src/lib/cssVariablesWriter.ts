import { ThemeSpec } from '@/types/themeTypes';

export function applyCssVariables(t: ThemeSpec) {
  const r = document.documentElement.style;
  const to = (hsl: [number, number, number]) => `${hsl[0]} ${hsl[1]}% ${hsl[2]}%`;
  const m = t.hsl;
  
  // Helper function to safely get HSL value with fallback
  const safeHsl = (key: keyof typeof m, fallback: [number, number, number] = [0, 0, 50]): [number, number, number] => {
    return m[key] || fallback;
  };
  
  // Apply core color variables
  r.setProperty("--primary", to(safeHsl('primary')));
  r.setProperty("--secondary", to(safeHsl('secondary')));
  r.setProperty("--accent", to(safeHsl('accent')));
  r.setProperty("--background", to(safeHsl('background')));
  r.setProperty("--foreground", to(safeHsl('foreground')));
  r.setProperty("--muted", to(safeHsl('muted')));
  r.setProperty("--card", to(safeHsl('card')));
  r.setProperty("--border", to(safeHsl('border')));
  r.setProperty("--destructive", to(safeHsl('destructive')));
  r.setProperty("--success", to(safeHsl('success')));
  r.setProperty("--warning", to(safeHsl('warning')));
  r.setProperty("--gradient-start", to(safeHsl('gradientStart', safeHsl('muted'))));
  r.setProperty("--gradient-end", to(safeHsl('gradientEnd', safeHsl('secondary'))));
  
  // Determine if theme is dark based on background lightness
  const backgroundHsl = safeHsl('background', [0, 0, 100]);
  const isDark = backgroundHsl[2] < 50; // If lightness < 50%, it's dark
  
  // Apply derived color variables with proper dark/light handling
  const [h, s, l] = safeHsl('primary');
  r.setProperty("--primary-foreground", isDark ? "0 0% 98%" : "0 0% 2%");
  r.setProperty("--primary-glow", `${h} ${Math.min(s + 10, 100)}% ${Math.min(l + 10, 90)}%`);
  r.setProperty("--primary-dark", `${h} ${s}% ${Math.max(l - 15, 10)}%`);
  
  // Apply secondary derived colors
  const [sh, ss, sl] = safeHsl('secondary');
  r.setProperty("--secondary-foreground", isDark ? "0 0% 90%" : "0 0% 15%");
  
  // Apply accent derived colors
  const [ah, as, al] = safeHsl('accent');
  r.setProperty("--accent-foreground", isDark ? "0 0% 95%" : "0 0% 15%");
  
  // Apply muted derived colors
  const [mh, ms, ml] = safeHsl('muted');
  r.setProperty("--muted-foreground", isDark ? "0 0% 65%" : "0 0% 45%");
  
  // Apply card derived colors
  r.setProperty("--card-foreground", to(safeHsl('foreground')));
  r.setProperty("--card-border", to(safeHsl('border')));
  
  // Apply popover colors
  r.setProperty("--popover", to(safeHsl('card')));
  r.setProperty("--popover-foreground", to(safeHsl('foreground')));
  
  // Apply input colors
  r.setProperty("--input", to(safeHsl('muted')));
  r.setProperty("--input-border", to(safeHsl('border')));
  
  // Apply ring color
  r.setProperty("--ring", to(safeHsl('primary')));
  
  // Apply status color foregrounds
  r.setProperty("--destructive-foreground", isDark ? "0 0% 95%" : "0 0% 98%");
  r.setProperty("--success-foreground", isDark ? "0 0% 95%" : "0 0% 98%");
  r.setProperty("--warning-foreground", isDark ? "0 0% 10%" : "0 0% 2%");
  
  // Apply radius variables
  r.setProperty("--radius-sm", `${t.radius.sm}px`);
  r.setProperty("--radius-md", `${t.radius.md}px`);
  r.setProperty("--radius-lg", `${t.radius.lg}px`);
  r.setProperty("--radius-xl", `${t.radius.xl}px`);
  
  // Apply gradient variables
  const gradientStartHsl = safeHsl('gradientStart', safeHsl('muted'));
  const gradientEndHsl = safeHsl('gradientEnd', safeHsl('secondary'));
  r.setProperty("--gradient-primary", `linear-gradient(135deg, hsl(${to(gradientStartHsl)}), hsl(${to(gradientEndHsl)}))`);
}

export const CSS_VARIABLES_USAGE = `/* Color variables */
color: hsl(var(--primary));
background-color: hsl(var(--background));
border-color: hsl(var(--border));

/* Gradient variables */
background: linear-gradient(135deg, hsl(var(--gradient-start)), hsl(var(--gradient-end)));

/* Radius variables */
border-radius: var(--radius-sm);
border-radius: var(--radius-md);
border-radius: var(--radius-lg);
border-radius: var(--radius-xl);`;

export const AVAILABLE_VARIABLES = [
  '--primary',
  '--secondary', 
  '--accent',
  '--background',
  '--foreground',
  '--muted',
  '--card',
  '--border',
  '--destructive',
  '--success',
  '--warning',
  '--gradient-start',
  '--gradient-end',
  '--radius-sm',
  '--radius-md',
  '--radius-lg',
  '--radius-xl'
];