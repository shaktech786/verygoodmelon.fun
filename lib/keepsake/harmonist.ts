import { PATTERN_NAMES, melonSeeds, type Breath, type BreathPatternId } from '@/lib/games/breathing-patterns/melon'
import { framedKeepsake, keepsakeDay, keepsakeFileName, type KeepsakeOp, type KeepsakePlan } from './plan'

/**
 * The melon a Harmonist session opens into: cut along the shape the breath followed, with
 * the cut piece lifted aside and the session's seeds lying in the flesh. The game animates
 * this same geometry, so the saved picture is exactly the moment on screen.
 */

export type CutShape = 'square' | 'triangle' | 'circle' | 'own'

type Point = [number, number]

export const CUT_SHAPES: Record<BreathPatternId, CutShape> = {
  box: 'square',
  '478': 'triangle',
  coherent: 'circle',
  sigh: 'triangle',
  free: 'own',
}

export const SHAPE_WORDS: Record<CutShape, string> = {
  square: 'a square',
  triangle: 'a triangle',
  circle: 'a circle',
  own: 'a shape of your own',
}

// How big each cut is, in melon radii: a triangle needs to be larger to hold the same seeds.
const CUT_SIZE: Record<CutShape, number> = { square: 0.66, triangle: 0.74, circle: 0.6, own: 0.6 }
const ROUND_STEPS = 48
const OWN_WOBBLE = 0.16
const BAND = 0.06
const SPIRAL_REACH = 0.75
const SEED_GROWTH = 1.5
const LID_TURN = 0.2
const LID_HEADING = (-35 * Math.PI) / 180

export interface OpenedSeed {
  x: number
  y: number
  rx: number
  ry: number
  angle: number
}

export interface OpenedMelon {
  pattern: BreathPatternId
  shape: CutShape
  centre: Point
  radius: number
  /** The rind's darker stripes, as upright ellipses. */
  stripes: Array<{ x: number; y: number; rx: number; ry: number }>
  /** The cut through the rind; the pale inner rind shows between it and the flesh. */
  cut: Point[]
  flesh: Point[]
  /** Where the cut piece comes to rest: moved by dx, dy and turned by angle (radians) about its centre. */
  lid: { dx: number; dy: number; angle: number }
  seeds: OpenedSeed[]
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** The same corners the game draws its guide through, so every inhale climbs. */
function polygon(sides: number): Point[] {
  return Array.from({ length: sides }, (_, k) => {
    const a = Math.PI / 2 + Math.PI / sides + (k * 2 * Math.PI) / sides
    return [Math.cos(a), Math.sin(a)]
  })
}

function round(radiusAt: (t: number) => number): Point[] {
  return Array.from({ length: ROUND_STEPS }, (_, i) => {
    const t = i / ROUND_STEPS
    const a = -Math.PI / 2 + t * Math.PI * 2
    const r = radiusAt(t)
    return [Math.cos(a) * r, Math.sin(a) * r]
  })
}

/** Free breathing has no guide, so the cut swells where the marked breaths were long and dips where they were quick. */
function ownShape(breaths: readonly Breath[]): Point[] {
  const lengths = breaths.filter((b) => b.pattern === 'free').map((b) => b.seconds)
  const mean = lengths.reduce((sum, s) => sum + s, 0) / lengths.length
  const swell = lengths.map((s) => clamp((s - mean) / mean, -1, 1))
  const outline = round((t) => {
    const u = t * swell.length
    const from = Math.floor(u) % swell.length
    const to = (from + 1) % swell.length
    const eased = (1 - Math.cos(Math.PI * (u - Math.floor(u)))) / 2
    return 1 + OWN_WOBBLE * (swell[from] + (swell[to] - swell[from]) * eased)
  })
  const widest = Math.max(...outline.map(([x, y]) => Math.hypot(x, y)))
  return outline.map(([x, y]) => [x / widest, y / widest])
}

/** The rhythm most breaths were taken in; a tie goes to the one breathed last. */
export function followedPattern(breaths: readonly Breath[]): BreathPatternId {
  const tally = new Map<BreathPatternId, number>()
  for (const breath of breaths) tally.set(breath.pattern, (tally.get(breath.pattern) ?? 0) + 1)
  let best = breaths[breaths.length - 1].pattern
  for (const [pattern, n] of tally) if (n > tally.get(best)!) best = pattern
  return best
}

/** Distance from the centre to the nearest edge of an outline whose farthest point is 1. */
function innerReach(outline: Point[], shape: CutShape): number {
  if (shape === 'square') return Math.cos(Math.PI / 4)
  if (shape === 'triangle') return 0.5
  return Math.min(...outline.map(([x, y]) => Math.hypot(x, y)))
}

/** The opened melon for a session with at least one breath, centred at `centre` with rind radius `radius`. */
export function openedMelon(breaths: readonly Breath[], centre: Point, radius: number): OpenedMelon {
  const pattern = followedPattern(breaths)
  const shape = CUT_SHAPES[pattern]
  const unit = shape === 'square' ? polygon(4) : shape === 'triangle' ? polygon(3) : shape === 'circle' ? round(() => 1) : ownShape(breaths)
  const [cx, cy] = centre
  const size = CUT_SIZE[shape] * radius
  const inner = innerReach(unit, shape) * size
  const fleshInner = inner - BAND * radius
  const fleshScale = fleshInner / inner
  const place = (scale: number) => unit.map(([x, y]): Point => [cx + x * size * scale, cy + y * size * scale])

  const spread = (fleshInner * 0.92) / SPIRAL_REACH
  const seeds = melonSeeds(breaths).map((seed) => ({
    x: cx + seed.x * spread,
    y: cy + seed.y * spread,
    rx: seed.width * spread * SEED_GROWTH,
    ry: seed.length * spread * SEED_GROWTH,
    angle: seed.angle + Math.PI / 2,
  }))

  const stripes = [-0.64, -0.32, 0, 0.32, 0.64].map((dx) => ({
    x: cx + dx * radius,
    y: cy,
    rx: 0.07 * radius,
    ry: Math.sqrt(1 - dx * dx) * radius * 0.94,
  }))

  // Just far enough to clear the hole, so the piece stays close to the melon it came from.
  const travel = 2.02 * size
  return {
    pattern,
    shape,
    centre,
    radius,
    stripes,
    cut: place(1),
    flesh: place(fleshScale),
    lid: { dx: Math.cos(LID_HEADING) * travel, dy: Math.sin(LID_HEADING) * travel, angle: LID_TURN },
    seeds,
  }
}

/** The cut piece where it rests, as absolute points. */
export function restingLid(melon: OpenedMelon, lift = 0, outline: Point[] = melon.cut): Point[] {
  const [cx, cy] = melon.centre
  const { dx, dy, angle } = melon.lid
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return outline.map(([x, y]): Point => {
    const ox = x - cx
    const oy = y - cy
    return [cx + dx + ox * cos - oy * sin, cy + dy + ox * sin + oy * cos + lift]
  })
}

/** The pale inner rind seen on the cut face, a little inside the cut. */
export function cutBand(melon: OpenedMelon): Point[] {
  return melon.cut.map(([x, y], i): Point => [x + (melon.flesh[i][0] - x) * 0.35, y + (melon.flesh[i][1] - y) * 0.35])
}

export function openedMelonLines(breaths: readonly Breath[]): { opened: string; seeds: string } {
  const pattern = followedPattern(breaths)
  const shape = CUT_SHAPES[pattern]
  const breathed = [...new Set(breaths.map((b) => b.pattern))]
  const opened =
    shape === 'own'
      ? 'Opened along a shape of your own, drawn by the breaths you marked.'
      : `Opened along ${SHAPE_WORDS[shape]}: the shape of ${PATTERN_NAMES[pattern]}.`
  const finished = breathed.every((p) => p === 'free') ? 'marked' : 'finished'
  const names = breathed.map((p) => PATTERN_NAMES[p])
  const seeds =
    names.length > 1
      ? `Each seed is a breath you ${finished}, in ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}.`
      : `Each seed is a breath you ${finished}.`
  return { opened, seeds }
}

const MELON_RADIUS = 260
// The melon and its lifted piece, as one group, sit centred across the page and above the words.
const GROUP_MIDDLE: Point = [540, 625]

export interface HarmonistKeepsakeInput {
  breaths: readonly Breath[]
  day: Date
}

export function harmonistKeepsake({ breaths, day }: HarmonistKeepsakeInput): KeepsakePlan {
  const draft = openedMelon(breaths, [0, 0], MELON_RADIUS)
  const lidReach = restingLid(draft)
  const xs = [-MELON_RADIUS, MELON_RADIUS, ...lidReach.map(([x]) => x)]
  const ys = [-MELON_RADIUS, MELON_RADIUS, ...lidReach.map(([, y]) => y)]
  const melon = openedMelon(breaths, [
    GROUP_MIDDLE[0] - (Math.min(...xs) + Math.max(...xs)) / 2,
    GROUP_MIDDLE[1] - (Math.min(...ys) + Math.max(...ys)) / 2,
  ], MELON_RADIUS)
  const [cx, cy] = melon.centre
  const r = melon.radius
  const lines = openedMelonLines(breaths)
  const band = cutBand(melon)
  const textTop = Math.max(cy + r, ...restingLid(melon, 18).map(([, y]) => y)) + 92

  const art: KeepsakeOp[] = [
    { kind: 'ellipse', x: cx + 16, y: cy + r - 6, rx: r * 0.92, ry: 30, angle: 0, ink: 'ink', alpha: 0.08 },
    { kind: 'disc', x: cx, y: cy, r, ink: 'rind' },
    ...melon.stripes.map((s): KeepsakeOp => ({ kind: 'ellipse', x: s.x, y: s.y, rx: s.rx, ry: s.ry, angle: 0, ink: 'rindLight', alpha: 0.3 })),
    { kind: 'poly', points: melon.cut, ink: 'rindLight' },
    { kind: 'poly', points: melon.flesh, ink: 'flesh' },
    ...melon.seeds.map((s): KeepsakeOp => ({ kind: 'ellipse', x: s.x, y: s.y, rx: s.rx, ry: s.ry, angle: s.angle, ink: 'seed' })),
    // The cut piece lies turned over beside it, its cut face up: rind edge, pale rind, flesh.
    { kind: 'poly', points: restingLid(melon, 18), ink: 'ink', alpha: 0.1 },
    { kind: 'poly', points: restingLid(melon, 8), ink: 'rind' },
    { kind: 'poly', points: restingLid(melon), ink: 'rind' },
    { kind: 'poly', points: restingLid(melon, 0, band), ink: 'rindLight' },
    { kind: 'poly', points: restingLid(melon, 0, melon.flesh), ink: 'flesh' },
    {
      kind: 'text',
      x: 540,
      y: textTop,
      text: lines.opened,
      size: 36,
      ink: 'ink',
      font: 'serif',
      align: 'center',
      italic: true,
      maxWidth: 900,
      lineHeight: 48,
      maxLines: 2,
    },
    { kind: 'text', x: 540, y: textTop + 94, text: lines.seeds, size: 28, ink: 'inkSoft', font: 'sans', align: 'center', maxWidth: 860, maxLines: 2 },
  ]

  const alt = `A watermelon cut open along ${SHAPE_WORDS[melon.shape]}, the cut piece lying turned over beside it, and one seed in the red flesh for every breath, set in a spiral. ${lines.opened} ${lines.seeds}`
  const text = [`My melon, ${keepsakeDay(day)}`, '', lines.opened, lines.seeds].join('\n')

  return framedKeepsake({
    title: 'The Harmonist',
    subtitle: keepsakeDay(day),
    art,
    alt,
    text,
    fileName: keepsakeFileName('The Harmonist', day),
  })
}
