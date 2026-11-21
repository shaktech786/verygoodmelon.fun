import { describe, it, expect } from 'vitest'
import { plantAtPoint, plantSize, sizeFactor } from '@/lib/games/calm-garden/geometry'
import type { Plant, PlantType } from '@/lib/games/calm-garden/garden'

const NOW = Date.parse('2026-11-21T14:00:00Z')
const W = 800
const H = 500

function plant(type: PlantType, x: number, y: number): Plant {
  return { id: `${type}-${x}`, type, x, y, scale: 1, colorSeed: 0.5, phase: 0, plantedAt: NOW }
}

describe('finding the plant under a tap', () => {
  it('draws plants larger in a wider garden and nearer the front', () => {
    expect(sizeFactor(300)).toBe(1.1)
    expect(sizeFactor(800)).toBeGreaterThan(2)
    expect(sizeFactor(4000)).toBe(2.3)
    expect(plantSize(plant('oak', 0.5, 0.9), W, NOW)).toBeGreaterThan(plantSize(plant('oak', 0.5, 0.4), W, NOW))
  })

  it('hits a tree by its canopy and misses the open grass beside it', () => {
    const oak = plant('oak', 0.5, 0.6)
    expect(plantAtPoint(400, 300 - 120, [oak], W, H, NOW)?.id).toBe(oak.id)
    expect(plantAtPoint(400, 302, [oak], W, H, NOW)?.id).toBe(oak.id)
    expect(plantAtPoint(560, 300, [oak], W, H, NOW)).toBeNull()
    expect(plantAtPoint(400, 340, [oak], W, H, NOW)).toBeNull()
  })

  it('prefers the plant in front when two overlap', () => {
    const oak = plant('oak', 0.5, 0.6)
    const daisy = plant('daisy', 0.5, 0.65)
    expect(plantAtPoint(400, 310, [oak, daisy], W, H, NOW)?.id).toBe(daisy.id)
  })
})
