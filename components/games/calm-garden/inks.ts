import { luminance, mixOklab } from '@/lib/design/color'
import type { Inks } from '@/lib/design/inks'
import { PALETTES } from '@/lib/design/tokens'
import type { Season, TimeOfDay } from '@/lib/games/calm-garden/garden'

/**
 * The Gardener's game ink map (docs/design-system/PLAN.md §9.3): six inks derived from moss, clay and
 * dusk in the active palette. Everything the garden draws is one of these, lightened or darkened,
 * or a print-neutral (white, black) for shine and shadow, so the pixel look stays and the scene follows
 * the theme, Quiet and high contrast.
 */
export interface GardenInks {
  leaf: string
  petalWarm: string
  petalCool: string
  earth: string
  skyDay: string
  skyDusk: string
}

export interface Sky {
  top: string
  bottom: string
}

export interface GardenColours {
  inks: GardenInks
  greens: readonly string[]
  browns: readonly string[]
  greys: readonly string[]
  petals: readonly string[]
  canopy: Record<Season, readonly string[]>
  bush: { autumn: readonly string[] }
  sky: Record<TimeOfDay, Sky>
  /** Where the sky goes while someone sits: golden hour by day, dusk in the evening, a deeper night. */
  sitSky: Record<TimeOfDay, Sky>
  ground: Record<Season, readonly [string, string, string]>
  nightGround: readonly [string, string, string]
  sitGround: Record<TimeOfDay, readonly [string, string, string]>
  hill: { day: string; night: string; sitDay: string; sitEvening: string }
  white: string
  cream: string
  creamDeep: string
  brass: string
  brassLight: string
  lavender: readonly [string, string]
  sunflower: readonly [string, string]
  blossom: string
  berry: string
  toadstool: { stem: string; capWarm: string; capCool: string }
  moon: string
  sun: string
  sunLow: string
  sunSet: string
  cloud: string
  cloudDusk: string
  star: string
  glow: string
  firefly: string
  fireflyCore: string
  shadow: string
  body: string
  crystal: string
  light: string
  coolWash: string
  vignette: string
  halo: string
  accent: string
  suggest: string
  suggestEdge: string
}

const WHITE = PALETTES.lightHigh.paper
const BLACK = PALETTES.darkHigh.paper

const cache = new Map<string, string>()

/** Lighten (amount > 0) or darken (amount < 0) a #rrggbb colour. */
export function shade(hex: string, amount: number): string {
  const key = `${hex}|${amount}`
  let out = cache.get(key)
  if (!out) {
    out = amount < 0 ? mixOklab(hex, 1 + amount, BLACK) : mixOklab(hex, 1 - amount, WHITE)
    cache.set(key, out)
  }
  return out
}

/** Blend two #rrggbb colours; t = 0 gives a, t = 1 gives b. */
export function blend(a: string, b: string, t: number): string {
  if (t <= 0) return a
  if (t >= 1) return b
  return mixOklab(b, t, a)
}

/** A #rrggbb colour at a given opacity, as #rrggbbaa. */
export function alpha(hex: string, a: number): string {
  return `${hex}${Math.round(Math.min(1, Math.max(0, a)) * 255).toString(16).padStart(2, '0')}`
}

const memo = new WeakMap<Inks, GardenColours>()

export function gardenColours(inks: Inks): GardenColours {
  const found = memo.get(inks)
  if (found) return found
  const dark = luminance(inks.paper) < 0.18
  const leaf = inks.moss
  const warm = inks.clay
  const cool = inks.dusk
  const earth = shade(warm, -0.5)
  const skyDay = blend(cool, inks.moss, 0.45)
  const skyDusk = blend(cool, warm, 0.35)
  // In a dark theme the day is a dimmer one, so the garden is a lamplit window rather than a glare
  const dim = (hex: string) => (dark ? shade(hex, -0.38) : hex)

  const greens = [shade(leaf, 0.3), shade(leaf, 0.12), leaf, shade(leaf, -0.25), shade(leaf, -0.4)]
  const stone = blend(earth, inks['rule-strong'], 0.6)
  const petals = [warm, shade(warm, 0.2), shade(warm, 0.4), shade(cool, 0.35), shade(cool, 0.6)]
  const night = (amount: number) => shade(skyDusk, -amount)

  const colours: GardenColours = {
    inks: { leaf, petalWarm: warm, petalCool: cool, earth, skyDay, skyDusk },
    greens,
    browns: [earth, shade(earth, 0.14), shade(earth, -0.2), shade(earth, -0.38)],
    greys: [stone, shade(stone, 0.14), shade(stone, -0.12), shade(stone, -0.26)],
    petals,
    canopy: {
      spring: [shade(leaf, 0.35), shade(leaf, 0.22), shade(leaf, 0.1), leaf],
      summer: [shade(leaf, 0.1), leaf, shade(leaf, -0.2), blend(leaf, shade(leaf, 0.2), 0.5)],
      autumn: [shade(warm, 0.25), warm, shade(warm, 0.4), shade(warm, -0.2)],
      winter: [0.3, 0.24, 0.36, 0.27].map((w) => blend(leaf, inks['ink-soft'], w)),
    },
    bush: { autumn: [blend(leaf, warm, 0.3), blend(leaf, warm, 0.5), blend(leaf, warm, 0.2)] },
    sky: {
      morning: { top: dim(shade(warm, 0.55)), bottom: dim(shade(warm, 0.8)) },
      day: { top: dim(shade(skyDay, 0.58)), bottom: dim(shade(skyDay, 0.8)) },
      evening: { top: dim(shade(warm, 0.25)), bottom: dim(shade(warm, 0.8)) },
      night: { top: night(0.55), bottom: night(0.35) },
    },
    sitSky: {
      morning: { top: dim(shade(skyDay, 0.6)), bottom: dim(shade(warm, 0.85)) },
      day: { top: dim(shade(warm, 0.3)), bottom: dim(shade(warm, 0.7)) },
      evening: { top: night(0.45), bottom: dim(blend(shade(warm, 0.15), skyDusk, 0.3)) },
      night: { top: night(0.7), bottom: night(0.45) },
    },
    ground: {
      spring: [dim(shade(leaf, 0.5)), dim(shade(leaf, 0.3)), dim(shade(leaf, 0.05))],
      summer: [dim(shade(leaf, 0.42)), dim(shade(leaf, 0.2)), dim(shade(leaf, -0.05))],
      autumn: [dim(blend(shade(leaf, 0.5), warm, 0.3)), dim(blend(shade(leaf, 0.32), warm, 0.3)), dim(blend(shade(leaf, 0.08), warm, 0.35))],
      winter: [dim(blend(shade(leaf, 0.55), inks['ink-soft'], 0.6)), dim(blend(shade(leaf, 0.4), inks['ink-soft'], 0.6)), dim(blend(shade(leaf, 0.25), inks['ink-soft'], 0.6))],
    },
    nightGround: [shade(leaf, -0.45), shade(leaf, -0.55), shade(leaf, -0.65)],
    sitGround: {
      morning: [dim(shade(leaf, 0.5)), dim(shade(leaf, 0.3)), dim(shade(leaf, 0.08))],
      day: [dim(blend(shade(leaf, 0.45), warm, 0.4)), dim(blend(shade(leaf, 0.28), warm, 0.4)), dim(blend(shade(leaf, 0.05), warm, 0.45))],
      evening: [shade(leaf, -0.2), shade(leaf, -0.35), shade(leaf, -0.5)],
      night: [shade(leaf, -0.35), shade(leaf, -0.5), shade(leaf, -0.62)],
    },
    hill: {
      day: dim(shade(leaf, 0.4)),
      night: shade(leaf, -0.5),
      sitDay: dim(blend(shade(leaf, 0.3), warm, 0.5)),
      sitEvening: shade(skyDusk, -0.35),
    },
    white: WHITE,
    cream: shade(warm, 0.9),
    creamDeep: shade(warm, 0.82),
    brass: shade(warm, 0.3),
    brassLight: shade(warm, 0.55),
    lavender: [shade(cool, 0.1), shade(cool, 0.3)],
    sunflower: [shade(warm, 0.35), shade(warm, 0.22)],
    blossom: shade(cool, 0.7),
    berry: warm,
    toadstool: { stem: shade(warm, 0.88), capWarm: shade(warm, 0.05), capCool: shade(cool, 0.3) },
    moon: shade(warm, 0.88),
    sun: shade(warm, 0.75),
    sunLow: shade(warm, 0.5),
    sunSet: shade(warm, 0.62),
    cloud: shade(cool, 0.92),
    cloudDusk: shade(warm, 0.78),
    star: shade(warm, 0.92),
    glow: shade(warm, 0.7),
    firefly: shade(warm, 0.72),
    fireflyCore: shade(warm, 0.88),
    shadow: BLACK,
    body: shade(earth, -0.4),
    crystal: shade(cool, 0.45),
    light: shade(warm, 0.55),
    coolWash: night(0.6),
    vignette: shade(earth, -0.6),
    halo: WHITE,
    accent: inks.ink,
    suggest: shade(warm, 0.88),
    suggestEdge: inks.rind,
  }
  memo.set(inks, colours)
  return colours
}
