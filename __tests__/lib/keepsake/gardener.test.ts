import { describe, expect, it } from 'vitest'
import { CANOPY, VIEW, ground, gardenerKeepsake } from '@/lib/keepsake/gardener'
import { contrast, luminance } from '@/lib/design/color'
import { inkColour, lookFor } from '@/lib/keepsake/render'
import type { KeepsakeOp } from '@/lib/keepsake/plan'
import type { Plant, PlantType } from '@/lib/games/calm-garden/garden'

const day = new Date(2026, 10, 21, 13)
const LINE = 'An autumn garden: two flowers and a willow. Two butterflies came while you sat. You planted all of it today.'
const plant = (id: string, type: PlantType, x: number, y: number): Plant => ({ id, type, x, y, scale: 1, colorSeed: 0.3, phase: 0, plantedAt: day.getTime() })
const PLANTS = [plant('a', 'poppy', 0.2, 0.6), plant('b', 'poppy', 0.5, 0.6), plant('c', 'willow', 0.8, 0.55)]
const texts = (ops: KeepsakeOp[]) => ops.filter((op): op is Extract<KeepsakeOp, { kind: 'text' }> => op.kind === 'text')
const inView = (op: KeepsakeOp) => op.kind !== 'text' && 'x' in op && op.x >= VIEW.left && op.x <= VIEW.left + VIEW.width

describe('gardenerKeepsake', () => {
  const base = { plants: PLANTS, season: 'autumn', timeOfDay: 'day', visitors: 2, visitorKind: 'butterfly', line: LINE, day } as const

  it('is a postcard of this garden: its season stamped on, its line written beneath the picture', () => {
    const plan = gardenerKeepsake(base)
    const words = texts(plan.ops)
    expect(words.some((op) => op.text === 'Autumn')).toBe(true)
    const line = words.find((op) => op.text === LINE)
    expect(line?.font).toBe('sans')
    expect(line?.y).toBeGreaterThan(VIEW.top + VIEW.height)
    expect(plan.fileName).toBe('the-gardener-2026-11-21.png')
    expect(plan.text).toContain(LINE)
  })

  it('draws a plant for each one planted and a visitor for each that came', () => {
    const none = gardenerKeepsake({ ...base, visitors: 0 })
    const two = gardenerKeepsake(base)
    // Each butterfly is two wings and a body
    expect(two.ops.length - none.ops.length).toBe(6)
    const sparse = gardenerKeepsake({ ...base, plants: PLANTS.slice(0, 1) })
    expect(two.ops.filter(inView).length).toBeGreaterThan(sparse.ops.filter(inView).length)
  })

  it('takes its light from the hour: a night postcard has a dark sky and fireflies', () => {
    const night = gardenerKeepsake({ ...base, timeOfDay: 'night', visitorKind: 'firefly' })
    const firstSky = night.ops.find((op) => op.kind === 'rect' && op.y === VIEW.top && op.x === VIEW.left)
    expect(firstSky?.kind === 'rect' && luminance(inkColour(firstSky.ink, lookFor('light')))).toBeLessThan(0.02)
    expect(night.alt).toMatch(/autumn garden in moonlight: two poppies and a willow, with two fireflies among the plants/)
  })

  it('describes the picture and keeps the line in the description', () => {
    const plan = gardenerKeepsake(base)
    expect(plan.alt).toBe(`A postcard of your autumn garden in late afternoon gold: two poppies and a willow, with two butterflies among the plants. A stamp in the corner says autumn. Written beneath: “${LINE}”`)
    expect(gardenerKeepsake({ ...base, visitors: 0 }).alt).toContain('with no visitors, only quiet')
  })

  it('names visitors in words, as the line beneath does', () => {
    expect(gardenerKeepsake(base).alt).not.toMatch(/\d/)
  })

  it('draws each flower in the colour and at the place the garden gave it', () => {
    const pink = { ...plant('p', 'poppy', 0.25, 0.7), colorSeed: 0.95 }
    const plan = gardenerKeepsake({ ...base, plants: [pink] })
    const head = plan.ops.find((op) => op.kind === 'disc' && op.ink === 'glass-seed')
    expect(head?.kind === 'disc' && head.x).toBe(VIEW.left + 0.25 * VIEW.width)
  })

  it('keeps the foliage clearly apart from the ground in every season and hour, and the scene inside its frame', () => {
    for (const look of [lookFor('light'), lookFor('dark'), lookFor('light', 'quiet'), lookFor('light', 'gentle', 'high')]) {
      for (const timeOfDay of ['morning', 'day', 'evening', 'night'] as const) {
        for (const [season, canopy] of Object.entries(CANOPY)) {
          for (const earth of ground(timeOfDay)) {
            expect(contrast(inkColour(canopy, look), inkColour(earth, look)), `${season} at ${timeOfDay} in ${look.inks.paper}`).toBeGreaterThanOrEqual(1.5)
          }
        }
      }
    }
    const plan = gardenerKeepsake({ ...base, plants: [plant('p', 'pine', 0.02, 0.7)] })
    const pine = plan.ops.find((op) => op.kind === 'poly')
    expect(pine && pine.kind !== 'text' && pine.clip).toEqual({ x: VIEW.left, y: VIEW.top, w: VIEW.width, h: VIEW.height })
  })
})
