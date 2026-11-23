// The canvas cannot read CSS variables by itself, so the site's tokens are resolved once per theme change.

export interface Palette {
  bg: string
  grid: string
  orb: string
  orbGlow: string
  star: string
  starEdge: string
  gem: string
  gemEdge: string
  shadow: string
  tide: string
  light: string
  glide: string
  ring: string
  bloom: string
  text: string
  textDim: string
}

/** Colours a particle or entity can borrow from the palette. */
export type Tint = 'orb' | 'star' | 'gem' | 'shadow' | 'tide' | 'light' | 'glide' | 'bloom'

const TOKENS: Record<keyof Palette, string> = {
  bg: '--card-bg',
  grid: '--card-border',
  orb: '--melon-green',
  orbGlow: '--melon-green-light',
  star: '--melon-yellow',
  starEdge: '--melon-orange',
  gem: '--melon-teal',
  gemEdge: '--melon-green',
  shadow: '--melon-purple',
  tide: '--melon-blue',
  light: '--melon-yellow',
  glide: '--melon-green-light',
  ring: '--accent',
  bloom: '--melon-pink',
  text: '--foreground',
  textDim: '--primary-light',
}

/** Light-theme values from app/globals.css, used before the page's styles can be read. */
export const DEFAULT_PALETTE: Palette = {
  bg: '#ffffff',
  grid: '#e8e8e8',
  orb: '#1a4d2e',
  orbGlow: '#74c69d',
  star: '#f6ad55',
  starEdge: '#f97316',
  gem: '#14b8a6',
  gemEdge: '#1a4d2e',
  shadow: '#8b5cf6',
  tide: '#3b82f6',
  light: '#f6ad55',
  glide: '#74c69d',
  ring: '#d32f3f',
  bloom: '#ec4899',
  text: '#1a1a1a',
  textDim: '#4a5568',
}

export function readPalette(root: Element): Palette {
  const style = getComputedStyle(root)
  const palette = { ...DEFAULT_PALETTE }
  for (const key of Object.keys(TOKENS) as Array<keyof Palette>) {
    const value = style.getPropertyValue(TOKENS[key]).trim()
    if (value) palette[key] = value
  }
  return palette
}

/** `#rrggbb` plus an alpha, for glows and faint fills drawn from a token. */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}
