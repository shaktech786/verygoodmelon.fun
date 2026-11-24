// The canvas cannot read CSS variables by itself, so the tokens are resolved once per theme change.
// The stage (screen.css) redefines the site's tokens as the arcade screen's inks, so they are read from the canvas.

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

/** The arcade screen's inks from screen.css, used before the page's styles can be read. */
export const DEFAULT_PALETTE: Palette = {
  bg: '#08100c',
  grid: '#3d5a4b',
  orb: '#5cf29a',
  orbGlow: '#a8ffcf',
  star: '#ffd166',
  starEdge: '#ff9f43',
  gem: '#2ee6d6',
  gemEdge: '#5cf29a',
  shadow: '#b18cff',
  tide: '#5aa9ff',
  light: '#ffd166',
  glide: '#a8ffcf',
  ring: '#ff6b7a',
  bloom: '#ff7ac6',
  text: '#d9f7e6',
  textDim: '#9cc4ae',
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

/** How strongly the screen glows, 0 to 1: screen.css halves it for Quiet and reduced motion. */
export function readNeon(el: Element): number {
  const value = parseFloat(getComputedStyle(el).getPropertyValue('--game-screen-neon'))
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1
}

/** `#rrggbb` plus an alpha, for glows and faint fills drawn from a token. */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}
