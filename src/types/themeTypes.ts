export type ThemeSpec = {
  preference: "light" | "dark" | "system"
  name?: string
  hsl: {
    primary: [number, number, number]
    secondary: [number, number, number]
    accent: [number, number, number]
    background: [number, number, number]
    foreground: [number, number, number]
    muted: [number, number, number]
    card: [number, number, number]
    border: [number, number, number]
    destructive: [number, number, number]
    success: [number, number, number]
    warning: [number, number, number]
  }
  radius: { sm: number, md: number, lg: number, xl: number }
  updatedAt: string
  version: number
}

export type ThemeValidationResult = {
  ok: boolean
  reasons?: string[]
}

export type ThemeVersionInfo = {
  version: number
  actor: string
  updatedAt: string
}

export type ContrastCheckResult = {
  pass: boolean
  ratio: number
  required: number
}