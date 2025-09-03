export type ThemeSpec = {
  preference: "light" | "dark" | "system"
  name?: string
  hex: Record<"primary"|"secondary"|"accent"|"background"|"foreground"|"muted"|"card"|"border"|"destructive"|"success"|"warning"|"gradientStart"|"gradientEnd", string>
  hsl: Record<keyof ThemeSpec["hex"], [number, number, number]>
  radius: { sm: number, md: number, lg: number, xl: number }
  updatedAt: string
  version: number
}

export type ThemeValidationResult = {
  ok: boolean
  reasons?: string[]
  issues?: string[]
}

export type ContrastCheckResult = {
  pass: boolean
  ratio: number
  required: number
}