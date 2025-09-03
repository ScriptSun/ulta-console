import { ThemeSpec } from '@/types/themeTypes';

export function applyCssVariables(t: ThemeSpec) {
  const r = document.documentElement.style;
  const to = (hsl: [number, number, number]) => `${hsl[0]} ${hsl[1]}% ${hsl[2]}%`;
  const m = t.hsl;
  
  // Apply core color variables
  r.setProperty("--primary", to(m.primary));
  r.setProperty("--secondary", to(m.secondary));
  r.setProperty("--accent", to(m.accent));
  r.setProperty("--background", to(m.background));
  r.setProperty("--foreground", to(m.foreground));
  r.setProperty("--muted", to(m.muted));
  r.setProperty("--card", to(m.card));
  r.setProperty("--border", to(m.border));
  r.setProperty("--destructive", to(m.destructive));
  r.setProperty("--success", to(m.success));
  r.setProperty("--warning", to(m.warning));
  r.setProperty("--gradient-start", to(m.gradientStart));
  r.setProperty("--gradient-end", to(m.gradientEnd));
  
  // Determine if theme is dark based on background lightness
  const isDark = m.background[2] < 50; // If lightness < 50%, it's dark
  
  // Apply derived color variables with proper dark/light handling
  const [h, s, l] = m.primary;
  r.setProperty("--primary-foreground", isDark ? "0 0% 98%" : "0 0% 2%");
  r.setProperty("--primary-glow", `${h} ${Math.min(s + 10, 100)}% ${Math.min(l + 10, 90)}%`);
  r.setProperty("--primary-dark", `${h} ${s}% ${Math.max(l - 15, 10)}%`);
  
  // Apply secondary derived colors
  const [sh, ss, sl] = m.secondary;
  r.setProperty("--secondary-foreground", isDark ? "0 0% 90%" : "0 0% 15%");
  
  // Apply accent derived colors
  const [ah, as, al] = m.accent;
  r.setProperty("--accent-foreground", isDark ? "0 0% 95%" : "0 0% 15%");
  
  // Apply muted derived colors
  const [mh, ms, ml] = m.muted;
  r.setProperty("--muted-foreground", isDark ? "0 0% 65%" : "0 0% 45%");
  
  // Apply card derived colors
  r.setProperty("--card-foreground", to(m.foreground));
  r.setProperty("--card-border", to(m.border));
  
  // Apply popover colors
  r.setProperty("--popover", to(m.card));
  r.setProperty("--popover-foreground", to(m.foreground));
  
  // Apply input colors
  r.setProperty("--input", to(m.muted));
  r.setProperty("--input-border", to(m.border));
  
  // Apply ring color
  r.setProperty("--ring", to(m.primary));
  
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
  r.setProperty("--gradient-primary", `linear-gradient(135deg, hsl(${to(m.gradientStart)}), hsl(${to(m.gradientEnd)}))`);
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