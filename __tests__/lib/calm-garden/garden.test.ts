import { describe, it, expect } from 'vitest'
import {
  GROUND_TOP,
  createPlant,
  growthFactor,
  livingCount,
  loadGarden,
  plantedSince,
  returnToGarden,
  seasonAt,
  timeOfDayAt,
  visitorCount,
  type Garden,
  type Plant,
  type PlantType,
} from '@/lib/games/calm-garden/garden'

const HOUR = 3_600_000
const DAY = 24 * HOUR
const NOW = Date.parse('2026-11-21T14:00:00Z')

function plant(type: PlantType, x: number, y: number, plantedAt = NOW): Plant {
  return { id: `${type}-${x}-${y}`, type, x, y, scale: 1, colorSeed: 0.5, phase: 0, plantedAt }
}

function gardenOf(plants: Plant[], lastVisit = NOW): Garden {
  return { version: 2, plants, lastVisit }
}

const sequence = (...values: number[]) => {
  let i = 0
  return () => values[i++ % values.length]
}

describe('loading a saved garden', () => {
  it('starts empty when nothing is saved or the save is unreadable', () => {
    for (const raw of [null, '', '{not json', '42', '{"elements": "many"}']) {
      const g = loadGarden(raw, NOW)
      expect(g.plants).toEqual([])
      expect(g.lastVisit).toBe(NOW)
    }
  })

  it('migrates a garden saved by the first version, keeping every recognisable plant', () => {
    const v1 = {
      version: 1,
      elements: [
        { id: 'a', variant: { category: 'flower', id: 'daisy', label: 'Daisy' }, x: 0.5, y: 0.6, scale: 1.1, colorSeed: 0.2, phase: 1, placedAt: NOW - 2 * DAY },
        { id: 'b', variant: { category: 'tree', id: 'baobab', label: 'Baobab' }, x: 0.4, y: 0.6, scale: 1, colorSeed: 0.2, phase: 0, placedAt: 0 },
        null,
        { id: 'c', variant: { category: 'tree', id: 'oak', label: 'Oak Tree' }, x: 0.2, y: 0.1, scale: 1, colorSeed: 0.3, phase: 0, placedAt: 0 },
      ],
    }
    const g = loadGarden(JSON.stringify(v1), NOW)
    expect(g.version).toBe(2)
    expect(g.plants.map((p) => p.type)).toEqual(['daisy', 'oak'])
    expect(g.plants[0]).toMatchObject({ id: 'a', x: 0.5, y: 0.6, scale: 1.1, plantedAt: NOW - 2 * DAY })
    // Older saves reset the planting time to 0 and once allowed plants in the sky.
    expect(g.plants[1].plantedAt).toBe(NOW)
    expect(g.plants[1].y).toBe(GROUND_TOP)
    expect(plantedSince(g.plants, NOW)).toBe(NOW - 2 * DAY)
    expect(g.lastVisit).toBe(NOW)
  })

  it('round-trips the current format and drops anything malformed', () => {
    const saved = gardenOf([plant('tulip', 0.3, 0.7, NOW - DAY), { ...plant('pine', 0.5, 0.5), x: Number.NaN }], NOW - 3 * DAY)
    const g = loadGarden(JSON.stringify(saved), NOW)
    expect(g.plants).toHaveLength(1)
    expect(g.plants[0]).toEqual(saved.plants[0])
    expect(g.lastVisit).toBe(NOW - 3 * DAY)
  })
})

describe('what grows and who visits', () => {
  it('counts stones and crystals as part of the garden but not as living things', () => {
    const plants = [plant('daisy', 0.2, 0.6), plant('round-stone', 0.3, 0.6), plant('crystal', 0.4, 0.6), plant('oak', 0.5, 0.5)]
    expect(livingCount(plants)).toBe(2)
  })

  it('brings a visitor for every three flowers, and a couple more while you sit', () => {
    const flowers = (n: number) => Array.from({ length: n }, (_, i) => plant('poppy', 0.1 + i * 0.05, 0.6))
    expect(visitorCount(flowers(2), false)).toBe(0)
    expect(visitorCount(flowers(3), false)).toBe(1)
    expect(visitorCount(flowers(30), false)).toBe(3)
    expect(visitorCount([plant('oak', 0.5, 0.5)], true)).toBe(1)
    expect(visitorCount(flowers(6), true)).toBe(4)
    expect(visitorCount([plant('flat-stone', 0.5, 0.5)], true)).toBe(0)
  })

  it('grows living plants over the first few days and never grows stones', () => {
    const oak = plant('oak', 0.5, 0.5, NOW - 10 * DAY)
    expect(growthFactor(oak, NOW - 10 * DAY)).toBe(1)
    expect(growthFactor(oak, NOW - 8 * DAY)).toBeGreaterThan(1)
    expect(growthFactor(oak, NOW)).toBeCloseTo(1.35)
    expect(growthFactor(plant('daisy', 0.5, 0.5, NOW - 10 * DAY), NOW)).toBeCloseTo(1.15)
    expect(growthFactor(plant('round-stone', 0.5, 0.5, NOW - 10 * DAY), NOW)).toBe(1)
    // A clock that runs backwards must not shrink anything.
    expect(growthFactor(oak, NOW - 20 * DAY)).toBe(1)
  })

  it('creates plants on the grass with gentle variation', () => {
    const p = createPlant('willow', 0.4, 0.1, NOW, sequence(0, 0.5, 0.99))
    expect(p.type).toBe('willow')
    expect(p.y).toBe(GROUND_TOP)
    expect(p.scale).toBeGreaterThanOrEqual(0.85)
    expect(p.scale).toBeLessThanOrEqual(1.15)
    expect(p.plantedAt).toBe(NOW)
  })
})

describe('coming back to the garden', () => {
  it('says nothing after a short break', () => {
    const g = gardenOf([plant('oak', 0.5, 0.5, NOW - 2 * HOUR)], NOW - 2 * HOUR)
    const back = returnToGarden(g, NOW, sequence(0.5))
    expect(back.note).toBeNull()
    expect(back.garden.plants).toHaveLength(1)
    expect(back.garden.lastVisit).toBe(NOW)
  })

  it('tells you what grew while you were away', () => {
    const g = gardenOf([plant('daisy', 0.3, 0.7, NOW - DAY), plant('oak', 0.5, 0.5, NOW - DAY)], NOW - DAY)
    const back = returnToGarden(g, NOW + 7 * HOUR - DAY, sequence(0.5))
    expect(back.note).toBe('While you were away, your oak tree grew a little taller.')
    expect(back.garden.lastVisit).toBe(NOW + 7 * HOUR - DAY)
  })

  it('lets a flower seed itself beside the others after a night away', () => {
    const g = gardenOf([plant('poppy', 0.3, 0.7, NOW - 3 * DAY), plant('poppy', 0.6, 0.8, NOW - 3 * DAY), plant('pine', 0.8, 0.5, NOW - 3 * DAY)], NOW - 2 * DAY)
    const back = returnToGarden(g, NOW, sequence(0, 1, 0))
    expect(back.garden.plants).toHaveLength(4)
    const sown = back.garden.plants[3]
    expect(sown).toMatchObject({ type: 'poppy', selfSown: true })
    expect(Math.abs(sown.x - 0.3)).toBeLessThanOrEqual(0.08)
    expect(sown.y).toBeGreaterThan(GROUND_TOP)
    expect(back.note).toBe('While you were away, your pine tree grew a little taller and a new poppy came up on its own.')
  })

  it('stops seeding once a few flowers have come up by themselves', () => {
    const sown = [0.2, 0.3, 0.4, 0.5].map((x) => ({ ...plant('daisy', x, 0.6, NOW - 9 * DAY), selfSown: true as const }))
    const g = gardenOf(sown, NOW - 2 * DAY)
    expect(returnToGarden(g, NOW, sequence(0.5)).garden.plants).toHaveLength(4)
  })
})

describe('the light of the real day', () => {
  it('follows the local clock and calendar', () => {
    expect(timeOfDayAt(new Date(2026, 10, 21, 6))).toBe('morning')
    expect(timeOfDayAt(new Date(2026, 10, 21, 13))).toBe('day')
    expect(timeOfDayAt(new Date(2026, 10, 21, 18))).toBe('evening')
    expect(timeOfDayAt(new Date(2026, 10, 21, 23))).toBe('night')
    expect(seasonAt(new Date(2026, 10, 21))).toBe('autumn')
    expect(seasonAt(new Date(2026, 0, 5))).toBe('winter')
    expect(seasonAt(new Date(2026, 3, 5))).toBe('spring')
    expect(seasonAt(new Date(2026, 6, 5))).toBe('summer')
  })
})
