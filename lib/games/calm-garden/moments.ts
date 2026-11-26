/**
 * The Gardener's two quiet moments, as timelines the drawing follows:
 * coming back to a garden that grew, and visitors arriving while you sit.
 */

import type { TimeOfDay } from './garden'

export type VisitorKind = 'butterfly' | 'firefly'

/** How long the look across a garden that grew lasts. */
export const RETURN_MS = 4200
/** Skipping it eases the view back over this long instead of cutting. */
export const SETTLE_MS = 450
/** A visitor flies in from the edge of the garden over this long. */
export const ARRIVAL_FLIGHT_MS = 2600

const ZOOM = 1.25
const PAN_END = 0.7
const MIN_SPAN = 0.25

/** Where the view is centred (0..1 across and down the garden) and how far it is zoomed in. */
export interface Camera {
  zoom: number
  x: number
  y: number
}

export const WHOLE: Camera = { zoom: 1, x: 0.5, y: 0.5 }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function ease(t: number): number {
  const k = clamp(t, 0, 1)
  return 0.5 - Math.cos(k * Math.PI) / 2
}

/** Keeps a view centre far enough from the edges that nothing outside the garden shows. */
function within(zoom: number, centre: number): number {
  const half = 0.5 / zoom
  return clamp(centre, half, 1 - half)
}

export function mixCamera(a: Camera, b: Camera, k: number): Camera {
  const zoom = a.zoom + (b.zoom - a.zoom) * k
  return { zoom, x: within(zoom, a.x + (b.x - a.x) * k), y: within(zoom, a.y + (b.y - a.y) * k) }
}

/**
 * The view at `t` (0..1 of RETURN_MS): close in, drifting left to right across
 * what grew, then easing back out to the whole garden.
 */
export function returnCamera(t: number, spots: readonly { x: number; y: number }[]): Camera {
  if (!spots.length) return WHOLE
  const xs = spots.map((s) => s.x)
  const mid = (Math.min(...xs) + Math.max(...xs)) / 2
  const span = Math.max(MIN_SPAN, Math.max(...xs) - Math.min(...xs))
  const left = within(ZOOM, mid - span / 2)
  const right = within(ZOOM, mid + span / 2)
  // Plants rise above where they are rooted, so the view sits a little higher than their roots.
  const y = within(ZOOM, spots.reduce((sum, s) => sum + s.y, 0) / spots.length - 0.15)
  if (t < PAN_END) return { zoom: ZOOM, x: left + (right - left) * ease(t / PAN_END), y }
  return mixCamera({ zoom: ZOOM, x: right, y }, WHOLE, ease((t - PAN_END) / (1 - PAN_END)))
}

/** How much of its time-away growth a plant at `x` shows at `t`: the left grows first, as the view passes. */
export function growthShown(t: number, x: number): number {
  return ease((t - 0.08 - 0.42 * clamp(x, 0, 1)) / 0.28)
}

/** The faint light around new growth: up quickly, held, then gone by the end. */
export function glowAt(t: number): number {
  if (t < 0.12) return ease(t / 0.12)
  if (t < 0.75) return 1
  return 1 - ease((t - 0.75) / 0.25)
}

/**
 * When, as fractions of the sit, each visitor beyond those already here arrives.
 * Spread out and never at the very start or end, so arrivals stay occasional.
 */
export function arrivalTimes(before: number, total: number): number[] {
  const extra = Math.max(0, total - before)
  return Array.from({ length: extra }, (_, j) => 0.1 + (0.75 * (j + 1)) / (extra + 1))
}

/**
 * How far through the sit the light is when something is judged by it. Quiet and reduced motion step straight
 * to the finished light, so the drawn visitors and the words about them must both read the end of the sit.
 */
export function sitFraction(still: boolean, fraction: number): number {
  return still ? 1 : fraction
}

/** Fireflies come out at night, and once an evening sit has let the light go. */
export function visitorKindAt(tod: TimeOfDay, sitting: boolean, light: number): VisitorKind {
  return tod === 'night' || (sitting && tod === 'evening' && light > 0.45) ? 'firefly' : 'butterfly'
}

export function arrivalLine(index: number, before: number, kind: VisitorKind): string {
  return before === 0 && index === 0 ? `A ${kind} came to sit with you.` : 'Another came to sit with you.'
}
