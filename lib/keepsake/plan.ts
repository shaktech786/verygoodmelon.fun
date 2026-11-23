/**
 * A keepsake is a small picture of one visit, described as a list of drawing steps so the
 * picture can be worked out (and tested) without a canvas. Shapes are drawn onto a coarse
 * grid and scaled up, which gives every keepsake the site's soft pixel look; words are drawn
 * afterwards at full resolution so they stay easy to read.
 */

/** Colours that follow the light or dark theme. A `#rrggbb` value stays the same in both. */
export type Ink =
  | 'paper'
  | 'paperDeep'
  | 'ink'
  | 'inkSoft'
  | 'line'
  | 'rind'
  | 'rindLight'
  | 'flesh'
  | 'seed'
  | 'gold'
  | 'voiceA'
  | 'voiceB'
  | `#${string}`

export type Font = 'sans' | 'serif' | 'hand'

export type KeepsakeOp =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; ink: Ink; alpha?: number }
  | { kind: 'disc'; x: number; y: number; r: number; ink: Ink; alpha?: number }
  | { kind: 'ellipse'; x: number; y: number; rx: number; ry: number; angle: number; ink: Ink; alpha?: number }
  | { kind: 'poly'; points: ReadonlyArray<readonly [number, number]>; ink: Ink; alpha?: number }
  | { kind: 'line'; points: ReadonlyArray<readonly [number, number]>; ink: Ink; width: number; alpha?: number }
  | {
      kind: 'text'
      x: number
      y: number
      text: string
      size: number
      ink: Ink
      font: Font
      align?: 'left' | 'center' | 'right'
      italic?: boolean
      weight?: 400 | 500 | 600 | 700
      /** Words wrap onto new lines past this width. */
      maxWidth?: number
      lineHeight?: number
      /** Lines past this are dropped and the last one kept ends in an ellipsis. */
      maxLines?: number
      alpha?: number
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

/** A tiny watermelon slice beside the site's name, the same on every keepsake. */
function signature(width: number, height: number): KeepsakeOp[] {
  const y = height - MARGIN + 6
  const cx = width / 2 - 150
  return [
    { kind: 'poly', points: semicircle(cx, y - 20, 24), ink: 'rind' },
    { kind: 'poly', points: semicircle(cx, y - 20, 18), ink: 'flesh' },
    { kind: 'disc', x: cx - 7, y: y - 10, r: 2.5, ink: 'seed' },
    { kind: 'disc', x: cx + 7, y: y - 10, r: 2.5, ink: 'seed' },
    { kind: 'text', x: width / 2 + 18, y, text: SITE_NAME, size: 30, ink: 'inkSoft', font: 'sans', align: 'center', weight: 500 },
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
    { kind: 'rect', x: inset, y: inset, w: width - inset * 2, h: PIXEL, ink: 'line' },
    { kind: 'rect', x: inset, y: height - inset - PIXEL, w: width - inset * 2, h: PIXEL, ink: 'line' },
    { kind: 'rect', x: inset, y: inset, w: PIXEL, h: height - inset * 2, ink: 'line' },
    { kind: 'rect', x: width - inset - PIXEL, y: inset, w: PIXEL, h: height - inset * 2, ink: 'line' },
    ...art,
    { kind: 'text', x: width / 2, y: MARGIN + 40, text: title.toUpperCase(), size: 30, ink: 'inkSoft', font: 'sans', align: 'center', weight: 600 },
  ]
  if (subtitle) {
    ops.push({ kind: 'text', x: width / 2, y: MARGIN + 86, text: subtitle, size: 28, ink: 'inkSoft', font: 'serif', align: 'center', italic: true })
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
