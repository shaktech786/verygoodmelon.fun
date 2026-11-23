import { describe, expect, it } from 'vitest'
import { MECHANIC_CATEGORIES, type PathPoint } from '@/app/games/the-mutation/engine/types'
import { MAX_ZOOM, RULE_LOOK, dashed, displayName, fieldBox, framePath, pathSegments, ruleLook, shapeshifterKeepsake } from '@/lib/keepsake/shapeshifter'
import type { KeepsakeOp } from '@/lib/keepsake/plan'

const day = new Date(2026, 10, 21)
const RULES = [
  { id: 'arrow_keys', title: 'IT CAN MOVE' },
  { id: 'pulse_gems', title: 'BREATHING GEMS' },
  { id: 'combo_chain', title: 'RHYTHM' },
  { id: 'blaster', title: 'A LANTERN' },
  { id: 'chasers', title: 'SHY SHADOWS' },
  { id: 'score_rush', title: 'THE BLOOM' },
]
// A walk to the right in wave 1, down in wave 2, and so on.
const PATH: PathPoint[] = [
  { x: 320, y: 240, wave: 0 },
  ...[1, 2, 3, 4, 5, 6].flatMap((wave) => [0, 1, 2].map((i) => ({ x: 320 + wave * 30 + i * 10, y: 240 - wave * 20 + i * 5, wave }))),
]
const texts = (ops: KeepsakeOp[]) => ops.filter((op): op is Extract<KeepsakeOp, { kind: 'text' }> => op.kind === 'text')
const lines = (ops: KeepsakeOp[]) => ops.filter((op): op is Extract<KeepsakeOp, { kind: 'line' }> => op.kind === 'line')
const WIDE = { w: 640, h: 480 }
const FIELD_BOX = fieldBox(WIDE)
// The path's own strokes: the soft glow under each stretch is the only line drawn see-through
const glows = (ops: KeepsakeOp[]) => lines(ops).filter((l) => l.alpha !== undefined)
const strokes = (ops: KeepsakeOp[], colour: string) => lines(ops).filter((l) => l.alpha === undefined && l.ink === colour)

describe('shapeshifterKeepsake', () => {
  const plan = shapeshifterKeepsake({ path: PATH, rules: RULES, field: { w: 640, h: 480 }, name: 'WANDERING GEMS & RHYTHMS', day })

  it('gives every kind of rule its own colour, shape and line pattern, and no two colours that blur together', () => {
    const looks = MECHANIC_CATEGORIES.map((c) => RULE_LOOK[c])
    expect(new Set(looks.map((l) => l.colour)).size).toBe(looks.length)
    expect(new Set(looks.map((l) => l.shape)).size).toBe(looks.length)
    expect(new Set(looks.map((l) => l.dash.join(','))).size).toBe(looks.length)
    const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
    for (const a of looks) {
      for (const b of looks) {
        if (a === b) continue
        const [x, y] = [rgb(a.colour), rgb(b.colour)]
        expect(Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])).toBeGreaterThan(60)
      }
    }
  })

  it('draws one glowing stretch of path per rule, joined end to end, in that rule’s colour', () => {
    const glow = glows(plan.ops)
    expect(glow.map((l) => l.ink)).toEqual(RULES.map((r) => ruleLook(r.id).colour))
    for (let i = 1; i < glow.length; i++) {
      expect(glow[i].points[0]).toEqual(glow[i - 1].points[glow[i - 1].points.length - 1])
    }
  })

  it('breaks each rule’s line into its own dashes, so the rules differ without colour', () => {
    const solid = ruleLook('arrow_keys')
    expect(solid.dash).toEqual([])
    const straight = [[0, 0], [300, 0]] as const
    expect(dashed(straight, [])).toEqual([straight])
    const dashes = dashed(straight, [48, 24])
    expect(dashes).toHaveLength(5)
    expect(dashes[0]).toEqual([[0, 0], [48, 0]])
    expect(dashes[1]).toEqual([[72, 0], [120, 0]])
    // A dash carries on round a corner instead of starting again
    const bent = dashed([[0, 0], [30, 0], [30, 30]], [48, 24])
    expect(bent[0]).toEqual([[0, 0], [30, 0], [30, 18]])
    for (const rule of RULES.slice(1)) expect(strokes(plan.ops, ruleLook(rule.id).colour).length).toBeGreaterThan(2)
  })

  it('shapes the night field like the field that was played, wide or tall', () => {
    const wide = fieldBox(WIDE)
    expect(wide.h / wide.w).toBeCloseTo(480 / 640, 2)
    const tall = fieldBox({ w: 480, h: 720 })
    expect(tall.h / tall.w).toBeCloseTo(720 / 480, 2)
    expect(tall.h).toBeGreaterThan(wide.h)
    const phone = shapeshifterKeepsake({ path: PATH, rules: RULES, field: { w: 480, h: 720 }, name: 'x', day })
    expect(phone.height).toBeGreaterThan(plan.height)
    // The legend sits below the taller field, never over it
    const legend = texts(phone.ops).find((op) => op.text === RULES[0].title)
    expect(legend?.y).toBeGreaterThan(tall.top + tall.h)
  })

  it('marks each rule in its shape at the very point its stretch of path begins', () => {
    const glow = glows(plan.ops)
    RULES.forEach((rule, i) => {
      const [x, y] = glow[i].points[0]
      const colour = ruleLook(rule.id).colour
      const near = plan.ops.filter((op) => op.kind !== 'text' && op.kind !== 'line' && op.ink === colour && 'x' in op && Math.hypot(op.x - x, op.y - y) < 40)
      const nearPoly = plan.ops.filter((op) => op.kind === 'poly' && op.ink === colour && op.points.every(([px, py]) => Math.hypot(px - x, py - y) < 40))
      expect(near.length + nearPoly.length).toBeGreaterThan(0)
    })
  })

  it('sets the legend large enough to read on a phone', () => {
    const legend = texts(plan.ops).filter((op) => RULES.some((r) => r.title === op.text))
    for (const op of legend) expect(op.size).toBeGreaterThanOrEqual(32)
  })

  it('keeps the path inside the art area whatever the field’s shape', () => {
    const tallField = { w: 480, h: 720 }
    const tall = shapeshifterKeepsake({ path: PATH.map((p) => ({ ...p, x: p.x * 0.75, y: p.y * 1.5 })), rules: RULES, field: tallField, name: 'x', day })
    for (const [candidate, FIELD_BOX] of [[plan, fieldBox(WIDE)], [tall, fieldBox(tallField)]] as const) {
      for (const [x, y] of glows(candidate.ops).flatMap((l) => l.points)) {
        expect(x).toBeGreaterThan(FIELD_BOX.left + 40)
        expect(x).toBeLessThan(FIELD_BOX.left + FIELD_BOX.w - 40)
        expect(y).toBeGreaterThan(FIELD_BOX.top + 40)
        expect(y).toBeLessThan(FIELD_BOX.top + FIELD_BOX.h - 40)
      }
    }
  })

  it('fits the walk itself to the night field, centred, so a short run still fills the picture', () => {
    const drawn = glows(plan.ops).flatMap((l) => l.points)
    const xs = drawn.map(([x]) => x)
    const ys = drawn.map(([, y]) => y)
    const spanX = Math.max(...xs) - Math.min(...xs)
    const spanY = Math.max(...ys) - Math.min(...ys)
    // One side reaches the padded edge of the field; the other keeps the walk's own proportions
    expect(Math.max(spanX / FIELD_BOX.w, spanY / FIELD_BOX.h)).toBeGreaterThan(0.7)
    expect(spanX / spanY).toBeCloseTo(200 / 120, 1)
    expect((Math.max(...xs) + Math.min(...xs)) / 2).toBeCloseTo(FIELD_BOX.left + FIELD_BOX.w / 2, 0)
    expect((Math.max(...ys) + Math.min(...ys)) / 2).toBeCloseTo(FIELD_BOX.top + FIELD_BOX.h / 2, 0)
  })

  it('never blows a tiny walk up past a gentle zoom', () => {
    const field = WIDE
    const whole = Math.min(FIELD_BOX.w / field.w, FIELD_BOX.h / field.h)
    const tiny = framePath([{ x: 320, y: 240, wave: 0 }, { x: 326, y: 243, wave: 1 }], field)
    expect(tiny.scale).toBeCloseTo(whole * MAX_ZOOM)
    const still = framePath([{ x: 100, y: 100, wave: 0 }], field)
    expect(still.at({ x: 100, y: 100 })).toEqual([FIELD_BOX.left + FIELD_BOX.w / 2, FIELD_BOX.top + FIELD_BOX.h / 2])
    const roaming = framePath([{ x: 0, y: 0, wave: 0 }, { x: 640, y: 480, wave: 1 }], field)
    expect(roaming.scale).toBeLessThan(whole)
  })

  it('has a legend naming every rule in the order it arrived, beside its shape', () => {
    const words = texts(plan.ops).map((op) => op.text)
    const legend = RULES.map((r) => words.indexOf(r.title))
    expect(legend.every((i) => i >= 0)).toBe(true)
    expect([...legend].sort((a, b) => a - b)).toEqual(legend)
  })

  it('names the game it grew, in a calmer case', () => {
    expect(texts(plan.ops).map((op) => op.text)).toContain('Wandering Gems & Rhythms')
    expect(displayName('Orbit Garden')).toBe('Orbit Garden')
  })

  it('describes each rule by colour and shape, not colour alone, and copies the same', () => {
    expect(plan.alt).toContain('IT CAN MOVE (blue circle), then BREATHING GEMS (gold star)')
    expect(plan.alt).toContain('THE BLOOM (pink flower)')
    expect(plan.text).toContain('Wandering Gems & Rhythms')
    expect(plan.text).toContain('· RHYTHM (orange square)')
  })

  it('shows no score, tally or time anywhere', () => {
    const words = [...texts(plan.ops).map((op) => op.text), plan.alt, plan.text].join(' ')
    expect(words.replace(/Saturday 21 November/g, '')).not.toMatch(/\d|score|points|light gathered/i)
  })

  it('names the file after the game and the day, and draws the same picture for the same run', () => {
    expect(plan.fileName).toBe('the-shapeshifter-2026-11-21.png')
    expect(shapeshifterKeepsake({ path: PATH, rules: RULES, field: { w: 640, h: 480 }, name: 'WANDERING GEMS & RHYTHMS', day })).toEqual(plan)
  })

  it('still marks every rule where it arrived when the orb never moved', () => {
    const still: PathPoint[] = [0, 1, 2, 3, 4, 5, 6].map((wave) => ({ x: 320, y: 240, wave }))
    const segments = pathSegments(still)
    expect(segments.map((s) => s.wave)).toEqual([0, 1, 2, 3, 4, 5, 6])
    const quiet = shapeshifterKeepsake({ path: still, rules: RULES, field: { w: 640, h: 480 }, name: 'QUIET STARS', day })
    // A dark outline and a coloured mark for each rule on the field, plus one in the legend
    for (const rule of RULES) {
      const colour = ruleLook(rule.id).colour
      expect(quiet.ops.filter((op) => op.kind !== 'text' && op.ink === colour).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('draws the clues a player let be faintly where they sleep, and says so', () => {
    const rested = shapeshifterKeepsake({
      path: [{ x: 320, y: 240, wave: 0 }, { x: 320, y: 240, wave: 1 }],
      rules: [{ id: 'arrow_keys', title: 'IT CAN MOVE' }],
      sleeping: [{ id: 'sweepers', x: 360, y: 260 }, { id: 'blaster', x: 290, y: 220 }],
      field: WIDE,
      name: 'SLEEPING TIDES & LANTERNS',
      day,
    })
    for (const id of ['sweepers', 'blaster']) {
      const faint = rested.ops.filter((op) => op.kind !== 'text' && op.kind !== 'line' && op.ink === ruleLook(id).colour && op.alpha === 0.4)
      expect(faint.length).toBeGreaterThanOrEqual(1)
    }
    expect(rested.alt).toMatch(/clues you let be, asleep where they grew/)
    expect(plan.alt).not.toMatch(/let be/)
  })
})

