// The arcade screen's inks. The screen is dark in every site theme, so they come from the dark Seedpress palettes
// (lib/design/inks.ts) with each spot ink lifted until it holds at least 7:1 on the field. Quiet and the two
// high-contrast settings pick their own dark palette, so the glass softens or sharpens with the rest of the site.
import { contrast, mixOklab, withAlpha } from '@/lib/design/color'
import { getInks, type InkContrast, type Inks } from '@/lib/design/inks'
import type { Sense } from '@/lib/design/tokens'

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
  /** The screen's one go-action: flesh from the dark palette, with its own words. */
  go: string
  onGo: string
}

/** Colours a particle or entity can borrow from the palette. */
export type Tint = 'orb' | 'star' | 'gem' | 'shadow' | 'tide' | 'light' | 'glide' | 'bloom'

/** Every ink on the glass keeps at least this much contrast against the field. */
export const NEON_CONTRAST = 7

/** Lifts `ink` toward the page ink, a little at a time, until it holds `min`:1 on the field. */
function lift(ink: string, field: string, toward: string, min = NEON_CONTRAST): string {
  for (let step = 0; step <= 25; step++) {
    const lifted = mixOklab(toward, step / 25, ink)
    if (contrast(lifted, field) >= min) return lifted
  }
  return toward
}

/** The arcade screen's inks for one dark palette (the glass is dark in every theme). */
export function arcadePalette(inks: Inks): Palette {
  const field = inks.well
  const spot = (ink: string) => lift(ink, field, inks.ink)
  const orb = spot(inks.rind)
  return {
    bg: field,
    grid: inks.rule,
    orb,
    orbGlow: mixOklab(inks.ink, 0.35, orb),
    star: spot(inks.brass),
    starEdge: spot(inks.clay),
    gem: spot(inks.moss),
    gemEdge: orb,
    shadow: spot(inks.dusk),
    tide: spot(inks.clay),
    light: spot(inks.brass),
    glide: mixOklab(inks.ink, 0.35, orb),
    ring: spot(inks.seed),
    bloom: spot(inks.seed),
    text: inks.ink,
    textDim: lift(inks['ink-soft'], field, inks.ink),
    go: inks.flesh,
    onGo: inks['on-flesh'],
  }
}

/** The dark inks as the page shows them now: Quiet and the high-contrast settings carry over. */
export function screenInks(sense: Sense, contrastSetting: InkContrast): Inks {
  return getInks('dark', sense, contrastSetting)
}

/** The arcade screen's inks before the page's settings can be read. */
export const DEFAULT_PALETTE: Palette = arcadePalette(screenInks('gentle', 'normal'))

/** How strongly the screen glows, 0 to 1: screen.css halves it for Quiet and reduced motion. */
export function readNeon(el: Element): number {
  const value = parseFloat(getComputedStyle(el).getPropertyValue('--game-screen-neon'))
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1
}

export { withAlpha }

/** The same inks as CSS variables on the stage, so the title, pause and rule cards match the canvas exactly. */
export function paletteVars(palette: Palette): Record<string, string> {
  return {
    '--game-screen-field': palette.bg,
    '--game-screen-line': palette.grid,
    '--game-screen-text': palette.text,
    '--game-screen-dim': palette.textDim,
    '--game-screen-orb': palette.orb,
    '--game-screen-glow': palette.orbGlow,
    '--game-screen-star': palette.star,
    '--game-screen-ember': palette.starEdge,
    '--game-screen-seed': palette.ring,
    '--game-screen-go': palette.go,
    '--game-screen-on-go': palette.onGo,
  }
}
