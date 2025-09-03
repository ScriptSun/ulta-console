export function hexToRgb(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return null
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

export function hexToHsl(hex: string): [number, number, number] {
  const rgb = hexToRgb(hex)
  if (!rgb) throw new Error("Invalid HEX")
  return rgbToHsl(rgb.r, rgb.g, rgb.b)
}

export function hslToRgb(h: number, s: number, l: number) {
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

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

export function hslToHex(h: number, s: number, l: number): string {
  const rgb = hslToRgb(h, s, l);
  const toHex = (c: number) => {
    const hex = c.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function contrastRatio(hex1: string, hex2: string) {
  const rgb = (h: string) => {
    const v = hexToRgb(h)!; const srgb = [v.r, v.g, v.b].map(x => {
      const c = x / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
  }
  const L1 = rgb(hex1), L2 = rgb(hex2)
  const [a, b] = L1 > L2 ? [L1, L2] : [L2, L1]
  return (a + 0.05) / (b + 0.05)
}

export function validateThemeHex(hex: Record<string, string>) {
  const isHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v)
  const bad = Object.entries(hex).filter(([_, v]) => !isHex(v)).map(([k]) => k)
  const issues: string[] = []
  if (bad.length) issues.push("Invalid HEX: " + bad.join(", "))
  
  try {
    const fgBg = contrastRatio(hex.foreground, hex.background)
    if (fgBg < 4.5) issues.push("Foreground on Background contrast " + fgBg.toFixed(2) + " below 4.5")
    
    const pBg = contrastRatio(hex.primary, hex.background)
    if (pBg < 3.0) issues.push("Primary on Background contrast " + pBg.toFixed(2) + " below 3.0")
  } catch (error) {
    issues.push("Error calculating contrast ratios")
  }
  
  return { ok: issues.length === 0, issues }
}