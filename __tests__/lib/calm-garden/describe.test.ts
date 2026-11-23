import { describe, it, expect } from 'vitest'
import { describePlace, describeSpot, gardenSummary, sitLine } from '@/lib/games/calm-garden/describe'
import type { Plant, PlantType } from '@/lib/games/calm-garden/garden'

const NOW = Date.parse('2026-11-21T14:00:00Z')
const DAY = 86_400_000

function plant(type: PlantType, x: number, y: number, id = `${type}-${x}-${y}`): Plant {
  return { id, type, x, y, scale: 1, colorSeed: 0.5, phase: 0, plantedAt: NOW }
}

describe('describing a spot in words', () => {
  it('names the area of the meadow', () => {
    expect(describeSpot(0.1, 0.9, [])).toBe('Near the front, on the left, on open grass.')
    expect(describeSpot(0.5, 0.65, [])).toBe('In the very middle, on open grass.')
    expect(describeSpot(0.9, 0.4, [])).toBe('At the back, on the right, on open grass.')
    expect(describeSpot(0.5, 0.4, [])).toBe('At the back, in the center, on open grass.')
  })

  it('places the spot against the nearest plant', () => {
    const oak = plant('oak', 0.5, 0.6)
    expect(describeSpot(0.42, 0.6, [oak])).toBe('In the very middle, just left of the oak tree.')
    expect(describeSpot(0.58, 0.62, [oak])).toBe('In the very middle, just right of the oak tree.')
    expect(describeSpot(0.5, 0.52, [oak])).toBe('In the very middle, behind the oak tree.')
    expect(describeSpot(0.5, 0.7, [oak])).toBe('In the very middle, in front of the oak tree.')
    expect(describeSpot(0.505, 0.605, [oak])).toBe('In the very middle, beside the oak tree.')
    expect(describeSpot(0.9, 0.9, [oak])).toBe('Near the front, on the right, on open grass.')
  })

  it('says "one of the" when several of a kind are nearby', () => {
    const daisies = [plant('daisy', 0.2, 0.8), plant('daisy', 0.3, 0.8)]
    expect(describeSpot(0.22, 0.86, daisies)).toBe('Near the front, on the left, in front of one of the daisies.')
  })

  it('describes a planted thing without measuring it against itself', () => {
    const daisy = plant('daisy', 0.2, 0.8)
    const stone = plant('flat-stone', 0.26, 0.8)
    expect(describePlace(daisy, [daisy, stone])).toBe('near the front, on the left, just left of the flat stone')
    expect(describePlace(daisy, [daisy])).toBe('near the front, on the left')
  })
})

describe('summarising the garden', () => {
  it('lists what is planted in plain words', () => {
    expect(gardenSummary([])).toBe('nothing yet')
    expect(gardenSummary([plant('oak', 0.5, 0.5)])).toBe('an oak tree')
    expect(gardenSummary([plant('lavender', 0.5, 0.5), plant('crystal', 0.2, 0.5)])).toBe('some lavender and a crystal')
    expect(gardenSummary([
      plant('daisy', 0.1, 0.6), plant('oak', 0.5, 0.5), plant('daisy', 0.2, 0.6), plant('daisy', 0.3, 0.6), plant('berry-bush', 0.6, 0.7),
    ])).toBe('three daisies, an oak tree and a berry bush')
  })
})

describe('the line you are left with after sitting', () => {
  const base = { season: 'autumn' as const, visitorKind: 'butterfly' as const, kindBefore: 'butterfly' as const, since: NOW, now: NOW }

  it('names the garden you made, who stayed and how long it has been yours', () => {
    const plants = [
      plant('daisy', 0.1, 0.6), plant('poppy', 0.2, 0.6), plant('tulip', 0.3, 0.6), plant('daisy', 0.4, 0.7), plant('sunflower', 0.5, 0.7),
      plant('oak', 0.6, 0.5), plant('flat-stone', 0.7, 0.8),
    ]
    expect(sitLine({ ...base, plants, visitors: 2, before: 2 })).toBe(
      'An autumn garden: five flowers, an oak tree and a stone to rest on. Two butterflies stayed the whole time. You planted all of it today.',
    )
    expect(sitLine({ ...base, plants, visitors: 1, before: 1, visitorKind: 'firefly', kindBefore: 'firefly', season: 'winter', since: NOW - 3 * DAY })).toBe(
      'A winter garden: five flowers, an oak tree and a stone to rest on. A firefly stayed the whole time. You have been tending it for three days.',
    )
  })

  it('is kind about a quiet garden', () => {
    const plants = [plant('pine', 0.2, 0.5), plant('willow', 0.6, 0.5), plant('crystal', 0.5, 0.8), plant('cluster', 0.4, 0.7)]
    expect(sitLine({ ...base, plants, visitors: 0, before: 0, since: NOW - DAY, season: 'spring' })).toBe(
      'A spring garden: two trees, some mushrooms and a crystal. It was quiet, and that was enough. You have been tending it for a day.',
    )
  })

  describe('says what actually happened with the visitors', () => {
    const plants = [plant('daisy', 0.1, 0.6), plant('poppy', 0.2, 0.6), plant('tulip', 0.3, 0.6)]
    const visitorsPart = (line: string) => line.split('. ').slice(1, -1).join('. ')

    it('one was visiting before, more came while sitting', () => {
      expect(visitorsPart(sitLine({ ...base, plants, before: 1, visitors: 3 }))).toBe('A butterfly was here when you sat down, and others came to join it')
      expect(visitorsPart(sitLine({ ...base, plants, before: 2, visitors: 3 }))).toBe('Two butterflies were here when you sat down, and another came to join them')
    })

    it('none before, some came', () => {
      expect(visitorsPart(sitLine({ ...base, plants, before: 0, visitors: 1 }))).toBe('A butterfly came while you sat')
    })

    it('day giving way to dusk', () => {
      expect(visitorsPart(sitLine({ ...base, plants, before: 1, visitors: 3, visitorKind: 'firefly' }))).toBe('The butterfly gave way to three fireflies as the light went')
    })
  })
})
