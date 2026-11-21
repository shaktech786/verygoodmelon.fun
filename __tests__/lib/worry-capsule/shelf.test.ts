import { describe, expect, it } from 'vitest'
import type { Capsule, Outcome } from '@/lib/games/worry-capsule/capsules'
import { SHELF_JAR_SCALE, shelfLayout, shelfOutcomes } from '@/lib/games/worry-capsule/shelf'

function opened(id: string, outcome: Outcome | null): Capsule {
  return {
    id,
    worry: id,
    horizon: 'week',
    sealedAt: '2026-11-01T10:00:00.000Z',
    opensOn: '2026-11-08',
    opening: outcome && { at: '2026-11-09T10:00:00.000Z', outcome, note: '' },
    lookedIn: [],
  }
}

describe('shelfLayout', () => {
  it('centres jars on the plank, oldest on the left, each standing on it', () => {
    const layout = shelfLayout(['no', 'partly', 'yes'])
    expect(layout.slots.map((s) => s.outcome)).toEqual(['no', 'partly', 'yes'])
    const centres = layout.slots.map((s) => s.x + 40 * SHELF_JAR_SCALE)
    expect(centres[1]).toBeCloseTo(layout.width / 2)
    expect(centres[0] + centres[2]).toBeCloseTo(layout.width)
    for (const slot of layout.slots) expect(slot.y + 66 * SHELF_JAR_SCALE).toBeCloseTo(layout.plankY)
  })

  it('keeps a lone jar from looming and grows to fit many without overlapping', () => {
    expect(shelfLayout(['no']).width).toBe(220)
    const many = shelfLayout(Array.from({ length: 6 }, () => 'yes' as const))
    expect(many.slots[0].x).toBeGreaterThanOrEqual(0)
    expect(many.slots[5].x + 80 * SHELF_JAR_SCALE).toBeLessThanOrEqual(many.width)
    for (let i = 1; i < 6; i++) expect(many.slots[i].x - many.slots[i - 1].x).toBeGreaterThanOrEqual(80 * SHELF_JAR_SCALE)
  })

  it('adds headroom above the plank for a jar to arrive from', () => {
    expect(shelfLayout(['no'], 40).plankY - shelfLayout(['no']).plankY).toBe(40)
  })
})

describe('shelfOutcomes', () => {
  it('takes the newest answered jars and stands them oldest first', () => {
    const newestFirst = [opened('d', 'yes'), opened('c', null), opened('b', 'partly'), opened('a', 'no')]
    expect(shelfOutcomes(newestFirst, 2)).toEqual(['partly', 'yes'])
    expect(shelfOutcomes(newestFirst, 9)).toEqual(['no', 'partly', 'yes'])
    expect(shelfOutcomes([], 3)).toEqual([])
  })
})
