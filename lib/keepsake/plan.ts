import type { ColorRole } from '@/lib/design/tokens'

/**
 * A keepsake is a small picture of one visit, described as a list of drawing steps so the
 * picture can be worked out (and tested) without a canvas. Shapes are drawn onto a coarse
 * grid and scaled up, which gives every keepsake the site's printed-pixel look; words are drawn
 * afterwards at full resolution so they stay easy to read.
 */

/**
 * A colour, named for a Seedpress role so it follows the theme, Quiet and high contrast.
 * `glass-` roles come from the dark palette in every theme, for a scene that stays lit the same on either paper
 * (a night sky, an arcade field), as the arcade screen does. A mix blends two inks, the first at the given weight.
 */
export type Ink = ColorRole | `glass-${ColorRole}` | readonly [Ink, number, Ink]

export function mix(a: Ink, weight: number, b: Ink): Ink {
  return [a, weight, b]
}

/** A colour along a run of inks, 0 at the first and 1 at the last, so a sky can be banded without a gradient. */
export function ramp(stops: readonly Ink[], t: number): Ink {
  const at = Math.min(Math.max(t, 0), 1) * (stops.length - 1)
  const from = Math.min(Math.floor(at), stops.length - 2)
  return mix(stops[from + 1], at - from, stops[from])
}

/** Atkinson Hyperlegible Next for words, Bricolage Grotesque for short titles of 24 units and up. */
export type Font = 'sans' | 'display'

interface Shape {
  ink: Ink
  alpha?: number
  /** Printed in the second ink: overprinted on the first, a pixel out of register. */
  b?: boolean
  /** Nothing of this shape is drawn outside this rectangle, so a scene's art stays inside its frame. */
  clip?: { x: number; y: number; w: number; h: number }
}

export type KeepsakeOp =
  | (Shape & { kind: 'rect'; x: number; y: number; w: number; h: number })
  | (Shape & { kind: 'disc'; x: number; y: number; r: number })
  | (Shape & { kind: 'ellipse'; x: number; y: number; rx: number; ry: number; angle: number })
  | (Shape & { kind: 'poly'; points: ReadonlyArray<readonly [number, number]> })
  | (Shape & { kind: 'line'; points: ReadonlyArray<readonly [number, number]>; width: number })
  | {
      kind: 'text'
      x: number
      y: number
      text: string
      size: number
      ink: Ink
      font: Font
      align?: 'left' | 'center' | 'right'
      weight?: 400 | 500 | 600 | 700
      /** Words wrap onto new lines past this width. */
      maxWidth?: number
      lineHeight?: number
      /** Lines past this are dropped and the last one kept ends in an ellipsis. */
      maxLines?: number
      alpha?: number
    }

/** Clips every shape in `ops` to `frame`; words are left alone. */
export function clipTo(ops: KeepsakeOp[], frame: { x: number; y: number; w: number; h: number }): KeepsakeOp[] {
  return ops.map((op) => (op.kind === 'text' ? op : { ...op, clip: frame }))
}

export interface KeepsakePlan {
  /** The game's name, which also names the picture for screen readers. */
  title: string
  width: number
  height: number
  ops: KeepsakeOp[]
  /** What the picture shows, for anyone who cannot see it. */
  alt: string
  /** The same visit as plain words, for "Copy as text". */
  text: string
  /** Name of the saved PNG, without a folder. */
  fileName: string
}

export const KEEPSAKE_WIDTH = 1080
export const KEEPSAKE_HEIGHT = 1350
/** Size of one art pixel in keepsake units. */
export const PIXEL = 6
export const MARGIN = 84
export const SITE_NAME = 'verygoodmelon.fun'

export interface FrameOptions {
  /** The game's name, set small at the top. */
  title: string
  /** A quiet line under the title, such as the day. */
  subtitle?: string
  /** The picture itself, in keepsake units. */
  art: KeepsakeOp[]
  alt: string
  text: string
  fileName: string
  height?: number
}

/** Seeds that read dark on the flesh in every palette: the seed ink pulled toward the darkest ink. */
export const SEED: Ink = mix('seed', 0.35, 'glass-well')

/** The pale inner rind seen on a cut melon: the rind ink thinned with cream, so it stays pale on either paper. */
export const INNER_RIND: Ink = mix('rind', 0.3, 'glass-ink')

/** A tiny watermelon slice beside the site's name, the same on every keepsake. */
function signature(width: number, height: number): KeepsakeOp[] {
  const y = height - MARGIN + 6
  const cx = width / 2 - 150
  return [
    { kind: 'poly', points: semicircle(cx, y - 20, 24), ink: 'rind' },
    { kind: 'poly', points: semicircle(cx, y - 20, 18), ink: 'paper' },
    { kind: 'poly', points: semicircle(cx, y - 20, 18), ink: 'flesh', b: true },
    { kind: 'disc', x: cx - 7, y: y - 10, r: 2.5, ink: SEED },
    { kind: 'disc', x: cx + 7, y: y - 10, r: 2.5, ink: SEED },
    { kind: 'text', x: width / 2 + 18, y, text: SITE_NAME, size: 30, ink: 'ink-soft', font: 'sans', align: 'center', weight: 500 },
  ]
}

/** The lower half of a circle, flat side up, as a polygon. */
export function semicircle(cx: number, cy: number, r: number, steps = 24): Array<[number, number]> {
  const points: Array<[number, number]> = []
  for (let i = 0; i <= steps; i++) {
    const a = (Math.PI * i) / steps
    points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return points
}

/** Paper, a thin border, the title at the top and the site's name at the foot, around the art. */
export function framedKeepsake({ title, subtitle, art, alt, text, fileName, height = KEEPSAKE_HEIGHT }: FrameOptions): KeepsakePlan {
  const width = KEEPSAKE_WIDTH
  const inset = 36
  const ops: KeepsakeOp[] = [
    { kind: 'rect', x: 0, y: 0, w: width, h: height, ink: 'paper' },
    { kind: 'rect', x: inset, y: inset, w: width - inset * 2, h: PIXEL, ink: 'rule' },
    { kind: 'rect', x: inset, y: height - inset - PIXEL, w: width - inset * 2, h: PIXEL, ink: 'rule' },
    { kind: 'rect', x: inset, y: inset, w: PIXEL, h: height - inset * 2, ink: 'rule' },
    { kind: 'rect', x: width - inset - PIXEL, y: inset, w: PIXEL, h: height - inset * 2, ink: 'rule' },
    ...art,
    { kind: 'text', x: width / 2, y: MARGIN + 40, text: title, size: 34, ink: 'ink-soft', font: 'display', align: 'center', weight: 700 },
  ]
  if (subtitle) {
    ops.push({ kind: 'text', x: width / 2, y: MARGIN + 86, text: subtitle, size: 28, ink: 'ink-soft', font: 'sans', align: 'center' })
  }
  ops.push(...signature(width, height))
  return { title, width, height, ops, alt, text: `${text}\n\n${title} · ${SITE_NAME}`, fileName }
}

/** A stable small number from a string, so the same words always draw the same way. */
export function hashString(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** A repeatable sequence of numbers in [0, 1) from a seed. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A file name from a game's name and the day, such as `the-dilemma-2026-11-21.png`. */
export function keepsakeFileName(game: string, day: Date): string {
  const slug = game.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${slug}-${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}.png`
}

/** "Saturday 21 November", the way a keepsake names its day. */
export function keepsakeDay(day: Date): string {
  return day.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}
