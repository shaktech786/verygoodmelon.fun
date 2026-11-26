import { describe, expect, it } from 'vitest'
import { alchemistKeepsake } from '@/lib/keepsake/alchemist'
import { arenaKeepsake } from '@/lib/keepsake/arena'
import { awakeningKeepsake } from '@/lib/keepsake/awakening'
import { dilemmaKeepsake } from '@/lib/keepsake/dilemma'
import { finalWordKeepsake } from '@/lib/keepsake/final-word'
import { gardenerKeepsake } from '@/lib/keepsake/gardener'
import { harmonistKeepsake } from '@/lib/keepsake/harmonist'
import { optimistKeepsake } from '@/lib/keepsake/optimist'
import { patientOneKeepsake } from '@/lib/keepsake/patient-one'
import { plainSpeakerKeepsake } from '@/lib/keepsake/plain-speaker'
import { shapeshifterKeepsake } from '@/lib/keepsake/shapeshifter'
import { inkColour, lookFor, type KeepsakeLook } from '@/lib/keepsake/render'
import { PIXEL, type KeepsakeOp, type KeepsakePlan } from '@/lib/keepsake/plan'
import { WORKS, composeLetter } from '@/lib/games/idea-lab/golds'
import type { Plant } from '@/lib/games/calm-garden/garden'

type Rgb = [number, number, number]
type TextOp = Extract<KeepsakeOp, { kind: 'text' }>
type ShapeOp = Exclude<KeepsakeOp, { kind: 'text' }>

const day = new Date(2026, 10, 21, 10, 5)
const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb
const blend = (top: Rgb, under: Rgb, alpha: number): Rgb => top.map((c, i) => c * alpha + under[i] * (1 - alpha)) as Rgb

function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function insidePolygon(points: ReadonlyArray<readonly [number, number]>, x: number, y: number): boolean {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i]
    const [xj, yj] = points[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function nearSegment([ax, ay]: readonly [number, number], [bx, by]: readonly [number, number], x: number, y: number): number {
  const len = (bx - ax) ** 2 + (by - ay) ** 2
  const t = len ? Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / len)) : 0
  return Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay)))
}

function covers(op: ShapeOp, x: number, y: number): boolean {
  switch (op.kind) {
    case 'rect':
      return x >= op.x && x <= op.x + op.w && y >= op.y && y <= op.y + op.h
    case 'disc':
      return Math.hypot(x - op.x, y - op.y) <= op.r
    case 'ellipse': {
      const [dx, dy] = [x - op.x, y - op.y]
      const [c, s] = [Math.cos(op.angle), Math.sin(op.angle)]
      return ((dx * c + dy * s) / op.rx) ** 2 + ((-dx * s + dy * c) / op.ry) ** 2 <= 1
    }
    case 'poly':
      return insidePolygon(op.points, x, y)
    case 'line':
      return op.points.slice(1).some((p, i) => nearSegment(op.points[i], p, x, y) <= op.width / 2)
  }
}

/** One channel of the second ink laid over the paper beneath it: multiplied in light, screened in dark, as the press does. */
function overprint(under: Rgb, ink: Rgb, theme: KeepsakeLook['theme']): Rgb {
  return under.map((u, i) => (theme === 'dark' ? 255 - ((255 - u) * (255 - ink[i])) / 255 : (u * ink[i]) / 255)) as Rgb
}

/** The colour the shapes leave at a point, every one painted in order over the last, the second ink a pixel out of register. */
function backgroundAt(plan: KeepsakePlan, look: KeepsakeLook, x: number, y: number): Rgb {
  let colour: Rgb = [255, 255, 255]
  for (const op of plan.ops) {
    if (op.kind === 'text') continue
    const shift = op.b && !look.plain ? PIXEL : 0
    if (!covers(op, x - shift, y - shift)) continue
    const ink = rgb(inkColour(op.ink, look))
    colour = blend(op.b ? overprint(colour, ink, look.theme) : ink, colour, op.alpha ?? 1)
  }
  return colour
}

/** Points across the middle of the first line, where the words sit over whatever was drawn beneath. */
function samplePoints(op: TextOp): Array<[number, number]> {
  const width = Math.min(op.maxWidth ?? Infinity, op.text.split('\n')[0].length * op.size * 0.5)
  const left = op.align === 'center' ? op.x - width / 2 : op.align === 'right' ? op.x - width : op.x
  const y = op.y - op.size * 0.35
  return [0.05, 0.5, 0.95].map((f) => [left + width * f, y])
}

function lowContrast(plan: KeepsakePlan, look: KeepsakeLook, label: string): string[] {
  const failures: string[] = []
  for (const op of plan.ops) {
    if (op.kind !== 'text') continue
    const ratio = Math.min(
      ...samplePoints(op).map(([x, y]) => {
        const under = backgroundAt(plan, look, x, y)
        return contrast(blend(rgb(inkColour(op.ink, look)), under, op.alpha ?? 1), under)
      }),
    )
    if (ratio < 4.5) failures.push(`${plan.title} (${label}): “${op.text.slice(0, 30)}” in ${JSON.stringify(op.ink)} at ${ratio.toFixed(2)}:1`)
  }
  return failures
}

const plant = (id: string, type: Plant['type'], x: number, y: number): Plant => ({ id, type, x, y, scale: 1, colorSeed: 0.3, phase: 0, plantedAt: day.getTime() })
const PLANTS = [plant('a', 'poppy', 0.2, 0.6), plant('b', 'poppy', 0.5, 0.6), plant('c', 'willow', 0.8, 0.55)]
const concept = (name: string) => ({ id: name.toLowerCase(), name, emoji: '✨', description: '' })
const AT = day.toISOString()

const KEEPSAKES: KeepsakePlan[] = [
  alchemistKeepsake({ letter: composeLetter(0, WORKS[0].map((g) => concept(g.name))), day }),
  arenaKeepsake({ first: 'The Moon', second: 'The Sun', topic: 'Is it better to shine or to reflect?', question: 'Where are you a mirror?', emblems: ['moon', 'sun'], day }),
  awakeningKeepsake({ note: 'Dance with Sam after dinner.', day }),
  dilemmaKeepsake({ chosen: [{ value: 'Rest', theme: 'ease' }, { value: 'Challenge', theme: 'growth' }, { value: 'Friendship', theme: 'others' }], day }),
  finalWordKeepsake({ words: 'Mum, you were right about the garden.', prompt: 'Who would you thank?', day }),
  ...(['spring', 'summer', 'autumn', 'winter'] as const).flatMap((season) =>
    (['morning', 'day', 'evening', 'night'] as const).map((timeOfDay) =>
      gardenerKeepsake({ plants: PLANTS, season, timeOfDay, visitors: 2, visitorKind: timeOfDay === 'night' ? 'firefly' : 'butterfly', line: 'A garden.', day }),
    ),
  ),
  harmonistKeepsake({ breaths: Array.from({ length: 7 }, () => ({ pattern: 'box' as const, seconds: 16 })), day }),
  optimistKeepsake({
    reveal: {
      word: 'TOPSOIL',
      category: 'Nature',
      kind: 'wonder',
      story: [[{ text: 'A gram of healthy ' }, { text: 'topsoil', word: true }, { text: ' holds a billion bacteria.' }]],
      source: 'https://www.cfaes.osu.edu/news',
      reflection: 'Under every step you take, a crowd too small to see is busy.',
    },
    day,
  }),
  ...(['watch', 'listen', 'look', 'reflect', 'appreciate'] as const).map((id) =>
    patientOneKeepsake({ record: { key: AT, id, at: AT, things: ['A bird'], heard: ['Traffic'], lookedAt: 'The window', feelings: ['Calm'] } }),
  ),
  plainSpeakerKeepsake({ line: 'I have grown into this role.', begin: 'Could we have ten minutes?', day }),
  plainSpeakerKeepsake({ line: 'I have grown into this role.', begin: null, day }),
  shapeshifterKeepsake({
    path: [{ x: 320, y: 240, wave: 0 }, { x: 350, y: 220, wave: 1 }, { x: 380, y: 200, wave: 2 }],
    rules: [{ id: 'arrow_keys', title: 'IT CAN MOVE' }, { id: 'score_rush', title: 'THE BLOOM' }],
    field: { w: 640, h: 480 },
    name: 'WANDERING GEMS',
    day,
  }),
]

// The six palettes tokens.css emits: Gentle, Quiet and high contrast, each light and dark.
const LOOKS = [
  ['Light', lookFor('light')],
  ['Dark', lookFor('dark')],
  ['Light Quiet', lookFor('light', 'quiet')],
  ['Dark Quiet', lookFor('dark', 'quiet')],
  ['Light High', lookFor('light', 'gentle', 'high')],
  ['Dark High', lookFor('dark', 'gentle', 'high')],
] as const

describe('every keepsake is readable on its own paper', () => {
  for (const [label, look] of LOOKS) {
    it(`keeps every line of words at 4.5:1 or more against what lies beneath it, in the ${label} palette`, () => {
      expect(KEEPSAKES.flatMap((plan) => lowContrast(plan, look, label))).toEqual([])
    })
  }
})

describe('every keepsake sets its words plainly', () => {
  const words = KEEPSAKES.flatMap((plan) => plan.ops.filter((op): op is TextOp => op.kind === 'text'))

  it('has no word in capitals but a single tile letter, and no italics', () => {
    const shouting = words.filter((op) => /[A-Z]{2,}/.test(op.text) && op.text === op.text.toUpperCase()).map((op) => op.text)
    expect(shouting).toEqual([])
    expect(words.some((op) => 'italic' in op)).toBe(false)
  })

  it('sets short titles in the display face and everything long in the reading face', () => {
    for (const op of words.filter((w) => w.font === 'display')) {
      expect(op.size).toBeGreaterThanOrEqual(24)
      expect(op.text.split(/\s+/).length).toBeLessThanOrEqual(8)
    }
  })
})
