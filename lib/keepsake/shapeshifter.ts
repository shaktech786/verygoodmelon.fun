import { MECHANIC_OPTIONS, type MechanicCategory, type PathPoint } from '@/app/games/the-mutation/engine/types'
import { KEEPSAKE_HEIGHT, KEEPSAKE_WIDTH, MARGIN, framedKeepsake, keepsakeDay, keepsakeFileName, type KeepsakeOp, type KeepsakePlan } from './plan'

// The field is night-dark in both themes, like the game at dusk, so every rule's colour glows on it.
const FIELD = '#18202e'
const FIELD_EDGE = '#2c3850'
const DOT = '#33405a'
const START = '#e9edf5'
const ORB = '#fff4d6'
const ORB_GLOW = '#ffe9a8'

export type MarkShape = 'circle' | 'star' | 'triangle' | 'diamond' | 'square' | 'flower'

interface RuleLook {
  colour: `#${string}`
  colourName: string
  shape: MarkShape
  /** Lengths of dash and gap along the line, in keepsake units; empty is a solid line. */
  dash: readonly number[]
}

/**
 * One look per kind of rule. Each run meets exactly one rule of each kind, so no two share a look,
 * and the line's pattern tells the rules apart for anyone who cannot tell the colours apart.
 */
export const RULE_LOOK: Record<MechanicCategory, RuleLook> = {
  movement: { colour: '#7cb7ff', colourName: 'blue', shape: 'circle', dash: [] },
  collectible: { colour: '#f6d27a', colourName: 'gold', shape: 'star', dash: [48, 24] },
  threat: { colour: '#c3a6ff', colourName: 'violet', shape: 'triangle', dash: [6, 24] },
  power: { colour: '#5fe0c8', colourName: 'teal', shape: 'diamond', dash: [42, 18, 6, 18] },
  modifier: { colour: '#ff8a5c', colourName: 'orange', shape: 'square', dash: [18, 18] },
  climax: { colour: '#f59ac8', colourName: 'pink', shape: 'flower', dash: [42, 14, 6, 14, 6, 14] },
}

type Point = readonly [number, number]

/** A line cut into the pattern's dashes, carried on round corners; an empty pattern keeps it whole. */
export function dashed(points: readonly Point[], pattern: readonly number[]): Point[][] {
  if (pattern.length === 0 || points.length < 2) return [[...points]]
  const dashes: Point[][] = []
  let step = 0
  let left = pattern[0]
  let current: Point[] | null = [points[0]]
  for (let i = 1; i < points.length; i++) {
    let [x, y] = points[i - 1]
    const [tx, ty] = points[i]
    let length = Math.hypot(tx - x, ty - y)
    while (length > 0) {
      const move = Math.min(left, length)
      const t = move / length
      x += (tx - x) * t
      y += (ty - y) * t
      length -= move
      left -= move
      current?.push([x, y])
      if (left > 0) continue
      if (current) dashes.push(current)
      step = (step + 1) % pattern.length
      left = pattern[step]
      current = step % 2 === 0 ? [[x, y]] : null
    }
  }
  if (current && current.length > 1) dashes.push(current)
  return dashes
}

export function categoryOf(mechanicId: string): MechanicCategory {
  const found = (Object.keys(MECHANIC_OPTIONS) as MechanicCategory[]).find((c) => MECHANIC_OPTIONS[c].includes(mechanicId))
  return found ?? 'modifier'
}

export function ruleLook(mechanicId: string): RuleLook {
  return RULE_LOOK[categoryOf(mechanicId)]
}

/** A small mark in a rule's shape, centred on (x, y). */
export function mark(shape: MarkShape, x: number, y: number, r: number, ink: `#${string}`): KeepsakeOp[] {
  switch (shape) {
    case 'circle':
      return [{ kind: 'disc', x, y, r, ink }]
    case 'star': {
      const points = Array.from({ length: 10 }, (_, i) => {
        const a = (i * Math.PI) / 5 - Math.PI / 2
        const d = i % 2 === 0 ? r * 1.25 : r * 0.55
        return [x + Math.cos(a) * d, y + Math.sin(a) * d] as const
      })
      return [{ kind: 'poly', points, ink }]
    }
    case 'triangle':
      return [{ kind: 'poly', points: [[x, y - r * 1.2], [x + r * 1.15, y + r * 0.85], [x - r * 1.15, y + r * 0.85]], ink }]
    case 'diamond':
      return [{ kind: 'poly', points: [[x, y - r * 1.25], [x + r * 0.95, y], [x, y + r * 1.25], [x - r * 0.95, y]], ink }]
    case 'square':
      return [{ kind: 'rect', x: x - r * 0.9, y: y - r * 0.9, w: r * 1.8, h: r * 1.8, ink }]
    case 'flower':
      return [
        ...Array.from({ length: 5 }, (_, i) => {
          const a = (i * 2 * Math.PI) / 5 - Math.PI / 2
          return { kind: 'disc' as const, x: x + Math.cos(a) * r * 0.62, y: y + Math.sin(a) * r * 0.62, r: r * 0.5, ink }
        }),
        { kind: 'disc', x, y, r: r * 0.4, ink: FIELD },
      ]
  }
}

export interface ShapeshifterRule {
  id: string
  title: string
}

export interface ShapeshifterKeepsakeInput {
  /** Where the orb went; wave n is coloured by the nth rule. */
  path: readonly PathPoint[]
  rules: readonly ShapeshifterRule[]
  field: { w: number; h: number }
  /** The name the finished game was given. */
  name: string
  day: Date
}

const FIELD_TOP = 214
const FIELD_MAX_W = KEEPSAKE_WIDTH - MARGIN * 2
// A phone's tall field still leaves the legend room on a card no taller than a phone screen
const FIELD_MAX_H = 1000
const FIELD_PADDING = 72
/** A short walk is drawn larger to be seen, but never blown up past this many times the whole-field view. */
export const MAX_ZOOM = 2.5
const LEGEND_GAP = 56
const LEGEND_ROW = 84
const LEGEND_TEXT = 32

export interface FieldBox {
  left: number
  top: number
  w: number
  h: number
}

/** The night field in the shape of the field that was played: a wide one fills the width, a tall one is centred. */
export function fieldBox(field: { w: number; h: number }): FieldBox {
  const aspect = field.h / field.w
  const w = Math.min(FIELD_MAX_W, FIELD_MAX_H / aspect)
  return { left: (KEEPSAKE_WIDTH - w) / 2, top: FIELD_TOP, w, h: w * aspect }
}

/** "WANDERING GEMS & RHYTHMS" as "Wandering Gems & Rhythms"; a name already in mixed case is kept. */
export function displayName(name: string): string {
  if (name !== name.toUpperCase()) return name
  return name.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, space: string, letter: string) => space + letter.toUpperCase())
}

/** Each wave's stretch of the path, starting where the last one ended so the line never breaks. */
export function pathSegments(path: readonly PathPoint[]): Array<{ wave: number; points: PathPoint[] }> {
  const segments: Array<{ wave: number; points: PathPoint[] }> = []
  for (const point of path) {
    const current = segments[segments.length - 1]
    if (current && current.wave === point.wave) {
      current.points.push(point)
    } else {
      const joined = current ? [current.points[current.points.length - 1], point] : [point]
      segments.push({ wave: point.wave, points: joined })
    }
  }
  return segments
}

export interface PathFrame {
  scale: number
  at: (p: { x: number; y: number }) => readonly [number, number]
}

/** Fits the walk itself, not the whole field, to the night panel: centred, evenly scaled, with room round the edge. */
export function framePath(path: readonly PathPoint[], field: { w: number; h: number }): PathFrame {
  const FIELD_BOX = fieldBox(field)
  const xs = path.length ? path.map((p) => p.x) : [field.w / 2]
  const ys = path.length ? path.map((p) => p.y) : [field.h / 2]
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const whole = Math.min(FIELD_BOX.w / field.w, FIELD_BOX.h / field.h)
  const scale = Math.min(
    (FIELD_BOX.w - FIELD_PADDING * 2) / Math.max(1, maxX - minX),
    (FIELD_BOX.h - FIELD_PADDING * 2) / Math.max(1, maxY - minY),
    whole * MAX_ZOOM,
  )
  const cx = FIELD_BOX.left + FIELD_BOX.w / 2
  const cy = FIELD_BOX.top + FIELD_BOX.h / 2
  const midX = (minX + maxX) / 2
  const midY = (minY + maxY) / 2
  return { scale, at: (p) => [cx + (p.x - midX) * scale, cy + (p.y - midY) * scale] as const }
}

function describe(rule: ShapeshifterRule): string {
  const look = ruleLook(rule.id)
  return `${rule.title} (${look.colourName} ${look.shape})`
}

export function shapeshifterKeepsake({ path, rules, field, name, day }: ShapeshifterKeepsakeInput): KeepsakePlan {
  const { left, top, w, h } = fieldBox(field)
  const { at } = framePath(path, field)

  const art: KeepsakeOp[] = [
    { kind: 'rect', x: left, y: top, w, h, ink: FIELD_EDGE },
    { kind: 'rect', x: left + 12, y: top + 12, w: w - 24, h: h - 24, ink: FIELD },
  ]
  // The game's own dot grid, at the same zoom as the walk, wherever it falls inside the panel
  for (let gx = 40; gx < field.w; gx += 40) {
    for (let gy = 40; gy < field.h; gy += 40) {
      const [x, y] = at({ x: gx, y: gy })
      if (x > left + 24 && x < left + w - 24 && y > top + 24 && y < top + h - 24) {
        art.push({ kind: 'rect', x: x - 3, y: y - 3, w: 6, h: 6, ink: DOT })
      }
    }
  }

  const ruleFor = (wave: number) => rules[wave - 1]
  const segments = pathSegments(path)
  for (const segment of segments) {
    const rule = ruleFor(segment.wave)
    if (!rule || segment.points.length < 2) continue
    const points = segment.points.map(at)
    const look = ruleLook(rule.id)
    art.push({ kind: 'line', points, ink: look.colour, width: 30, alpha: 0.14 })
    for (const dash of dashed(points, look.dash)) art.push({ kind: 'line', points: dash, ink: look.colour, width: 12 })
  }

  // Where each rule arrived, in its own shape, drawn over the line so none is hidden by it
  for (const segment of segments) {
    const rule = ruleFor(segment.wave)
    if (!rule) continue
    const look = ruleLook(rule.id)
    const [x, y] = at(segment.points[0])
    art.push(...mark(look.shape, x, y, 27, FIELD), ...mark(look.shape, x, y, 20, look.colour))
  }
  // An open ring where the orb began, drawn last so it circles a rule that arrived there instead of hiding it
  const first = path[0]
  if (first) {
    const [x, y] = at(first)
    const ring = Array.from({ length: 25 }, (_, i) => [x + Math.cos((i * Math.PI) / 12) * 32, y + Math.sin((i * Math.PI) / 12) * 32] as const)
    art.push({ kind: 'line', points: ring, ink: START, width: 6 })
  }
  const last = path[path.length - 1]
  if (last) {
    const [x, y] = at(last)
    art.push({ kind: 'disc', x, y, r: 34, ink: ORB_GLOW, alpha: 0.25 }, { kind: 'disc', x, y, r: 17, ink: ORB })
  }

  const columns = 2
  const columnW = FIELD_MAX_W / columns
  const legendTop = top + h + LEGEND_GAP
  rules.forEach((rule, i) => {
    const look = ruleLook(rule.id)
    const x = MARGIN + (i % columns) * columnW
    const y = legendTop + Math.floor(i / columns) * LEGEND_ROW
    // The swatch is a strip of the night field, so the pattern reads as it does on the path
    art.push(
      { kind: 'rect', x, y, w: 132, h: 60, ink: FIELD },
      ...mark(look.shape, x + 26, y + 30, 16, look.colour),
      ...dashed([[x + 54, y + 30], [x + 120, y + 30]], look.dash).map((points): KeepsakeOp => ({ kind: 'line', points, ink: look.colour, width: 12 })),
      { kind: 'text', x: x + 146, y: y + 41, text: rule.title, size: LEGEND_TEXT, ink: 'ink', font: 'sans', weight: 600, maxWidth: columnW - 152, maxLines: 1 },
    )
  })
  const height = Math.max(KEEPSAKE_HEIGHT, legendTop + Math.ceil(rules.length / columns) * LEGEND_ROW + 150)

  const shown = displayName(name)
  const order = rules.map(describe)
  const alt = rules.length
    ? `A map of the path your orb took across the field, its line changing colour as each rule arrived, with each rule's shape marking where it began: ${order.join(', then ')}. A bright orb marks where it came to rest.`
    : 'A dark field with your orb resting where it began.'
  const text = [
    shown,
    keepsakeDay(day),
    '',
    'The path my orb took, one colour and shape for each rule as it arrived:',
    ...order.map((line) => `· ${line}`),
  ].join('\n')

  return framedKeepsake({
    title: 'The Shapeshifter',
    subtitle: shown,
    art,
    alt,
    text,
    fileName: keepsakeFileName('The Shapeshifter', day),
    height,
  })
}
