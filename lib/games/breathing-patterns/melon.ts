/**
 * The melon a breathing session leaves behind. Each finished breath sets one seed; the
 * rhythm it was breathed in gives the seed its shape, and its length sets the seed's size
 * and how far the spiral turns before the next one, so different sessions grow visibly
 * different melons from the same rules.
 */

export type BreathPatternId = 'box' | '478' | 'coherent' | 'sigh' | 'free'

export const PATTERN_NAMES: Record<BreathPatternId, string> = {
  box: 'Box Breathing',
  '478': '4-7-8 Relaxation',
  coherent: 'Coherent Breathing',
  sigh: 'Physiological Sigh',
  free: 'Free Breathing',
}

export interface Breath {
  pattern: BreathPatternId
  /** How long the breath took: a guided pattern's full cycle, or the gap between marks. */
  seconds: number
}

/** Positions and sizes are in melon radii from the centre; angle is the seed's direction. */
export interface Seed {
  x: number
  y: number
  angle: number
  length: number
  width: number
}

export const MAX_SEEDS = 89

const PATTERN_IDS: readonly BreathPatternId[] = ['box', '478', 'coherent', 'sigh', 'free']
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
// A 3-minute session holds about this many breaths, so seeds keep their places until
// then; a longer session spreads the whole spiral a little wider with each new seed.
const SEED_SEATS = 21
const SPIRAL_RADIUS = 0.66
// Small departures from the golden angle are what draw visible spiral arms, so a slow
// rhythm and a quick one turn the same rule into different patterns.
const TURN_PER_SECOND = 0.0035
const STEADY_SECONDS = 12

const SHAPE: Record<BreathPatternId, number> = {
  box: 0.74,
  '478': 0.42,
  coherent: 0.62,
  sigh: 0.5,
  free: 0.56,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function melonSeeds(breaths: readonly Breath[]): Seed[] {
  const shown = breaths.slice(0, MAX_SEEDS)
  const seats = Math.max(SEED_SEATS, shown.length)
  const baseLength = Math.min(0.085, 0.3 / Math.sqrt(seats))
  let angle = 0
  return shown.map((breath, n) => {
    const seconds = clamp(breath.seconds, 2, 30)
    const distance = SPIRAL_RADIUS * Math.sqrt((n + 0.5) / seats)
    const length = baseLength * (0.75 + 0.5 * clamp((seconds - 4) / 16, 0, 1))
    const seed = { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, angle, length, width: length * SHAPE[breath.pattern] }
    angle += GOLDEN_ANGLE + (seconds - STEADY_SECONDS) * TURN_PER_SECOND
    return seed
  })
}

export const LAST_MELON_KEY = 'verygoodmelon:still-point:last-melon'

export interface LastMelon {
  breaths: Breath[]
  /** ISO instant the session ended. */
  at: string
}

export function writeLastMelon(breaths: readonly Breath[], at: Date): string {
  return JSON.stringify({ v: 1, at: at.toISOString(), breaths: breaths.slice(0, MAX_SEEDS) })
}

function readBreath(value: unknown): Breath | null {
  if (typeof value !== 'object' || value === null) return null
  const { pattern, seconds } = value as Record<string, unknown>
  if (!PATTERN_IDS.includes(pattern as BreathPatternId)) return null
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null
  return { pattern: pattern as BreathPatternId, seconds }
}

/** Whatever cannot be read is simply not shown; a lost melon is never an error. */
export function readLastMelon(raw: string | null): LastMelon | null {
  if (!raw) return null
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null
  const { v, at, breaths } = data as Record<string, unknown>
  if (v !== 1 || typeof at !== 'string' || Number.isNaN(Date.parse(at)) || !Array.isArray(breaths)) return null
  const kept = breaths.slice(0, MAX_SEEDS).map(readBreath).filter((b): b is Breath => b !== null)
  return kept.length > 0 ? { breaths: kept, at } : null
}
