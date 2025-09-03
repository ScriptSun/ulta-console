import { ThemeSpec } from '@/types/themeTypes';

export function applyCssVariables(t: ThemeSpec) {
  const r = document.documentElement.style;
  const to = (hsl: [number, number, number]) => `${hsl[0]} ${hsl[1]}% ${hsl[2]}%`;
  const m = t.hsl;
  
  // Apply color variables
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
  
  // Apply radius variables
  r.setProperty("--radius-sm", `${t.radius.sm}px`);
  r.setProperty("--radius-md", `${t.radius.md}px`);
  r.setProperty("--radius-lg", `${t.radius.lg}px`);
  r.setProperty("--radius-xl", `${t.radius.xl}px`);
}

export const CSS_VARIABLES_USAGE = `/* Color variables */
color: hsl(var(--primary));
background-color: hsl(var(--background));
border-color: hsl(var(--border));

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
  '--radius-sm',
  '--radius-md',
  '--radius-lg',
  '--radius-xl'
];