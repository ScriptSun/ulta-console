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
  
  // Apply derived color variables that are missing
  const [h, s, l] = m.primary;
  r.setProperty("--primary-foreground", t.preference === 'dark' ? `${h} ${s}% 95%` : `${h} ${s}% 98%`);
  r.setProperty("--primary-glow", `${h} ${Math.min(s + 10, 100)}% ${Math.min(l + 10, 90)}%`);
  r.setProperty("--primary-dark", `${h} ${s}% ${Math.max(l - 15, 10)}%`);
  
  // Apply secondary derived colors
  const [sh, ss, sl] = m.secondary;
  r.setProperty("--secondary-foreground", t.preference === 'dark' ? `${sh} ${ss}% 90%` : `${sh} ${ss}% 15%`);
  
  // Apply accent derived colors
  const [ah, as, al] = m.accent;
  r.setProperty("--accent-foreground", t.preference === 'dark' ? `${ah} ${as}% 95%` : `${ah} ${as}% 15%`);
  
  // Apply muted derived colors
  const [mh, ms, ml] = m.muted;
  r.setProperty("--muted-foreground", t.preference === 'dark' ? `${mh} ${Math.max(ms - 10, 0)}% 65%` : `${mh} ${Math.max(ms - 5, 0)}% 45%`);
  
  // Apply card derived colors
  const [ch, cs, cl] = m.card;
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