import { ContrastCheckResult } from '@/types/themeTypes';

// Convert HSL to RGB
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 1/6) {
    r = c; g = x; b = 0;
  } else if (1/6 <= h && h < 1/3) {
    r = x; g = c; b = 0;
  } else if (1/3 <= h && h < 1/2) {
    r = 0; g = c; b = x;
  } else if (1/2 <= h && h < 2/3) {
    r = 0; g = x; b = c;
  } else if (2/3 <= h && h < 5/6) {
    r = x; g = 0; b = c;
  } else if (5/6 <= h && h < 1) {
    r = c; g = 0; b = x;
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ];
}

// Calculate relative luminance
function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Calculate contrast ratio between two colors
function contrastRatio(color1: [number, number, number], color2: [number, number, number]): number {
  const lum1 = relativeLuminance(...color1);
  const lum2 = relativeLuminance(...color2);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

export function checkContrast(
  foregroundHsl: [number, number, number],
  backgroundHsl: [number, number, number],
  requiredRatio: number = 4.5
): ContrastCheckResult {
  const fgRgb = hslToRgb(...foregroundHsl);
  const bgRgb = hslToRgb(...backgroundHsl);
  
  const ratio = contrastRatio(fgRgb, bgRgb);
  
  return {
    pass: ratio >= requiredRatio,
    ratio: Math.round(ratio * 100) / 100,
    required: requiredRatio
  };
}

export function validateAllContrasts(hsl: Record<string, [number, number, number]>) {
  const results: { key: string; result: ContrastCheckResult }[] = [];
  
  // Check foreground on background (normal text)
  results.push({
    key: 'foreground-background',
    result: checkContrast(hsl.foreground, hsl.background, 4.5)
  });
  
  // Check primary on background (large UI text)
  results.push({
    key: 'primary-background', 
    result: checkContrast(hsl.primary, hsl.background, 3.0)
  });
  
  return results;
}