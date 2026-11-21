/**
 * How big each plant is drawn, so taps can find the plant under them.
 * Sizes are in pixels of the drawn garden.
 */

import { GROUND_TOP, categoryOf, growthFactor, type Plant, type PlantCategory } from './garden'

/** Plants are drawn for a ~320px garden; wider gardens draw them larger. */
export function sizeFactor(width: number): number {
  return Math.max(1.1, Math.min(2.3, width / 320))
}

/** Plants further back, nearer the horizon, are drawn smaller. */
export function depthFactor(y: number): number {
  return 0.7 + 0.45 * Math.max(0, (y - GROUND_TOP) / (1 - GROUND_TOP))
}

export function plantSize(plant: Plant, width: number, now: number): number {
  return plant.scale * sizeFactor(width) * depthFactor(plant.y) * growthFactor(plant, now)
}

// Half-width and height of each kind of plant at size 1, as drawn.
const FOOTPRINT: Record<PlantCategory, { half: number; height: number }> = {
  flower: { half: 13, height: 46 },
  tree: { half: 24, height: 78 },
  stone: { half: 15, height: 17 },
  mushroom: { half: 12, height: 25 },
  bush: { half: 19, height: 28 },
}
const SLACK = 4

export function plantAtPoint(px: number, py: number, plants: readonly Plant[], width: number, height: number, now: number): Plant | null {
  let found: Plant | null = null
  for (const p of plants) {
    const s = plantSize(p, width, now)
    const { half, height: tall } = FOOTPRINT[categoryOf(p.type)]
    const x = p.x * width
    const y = p.y * height
    const inside = Math.abs(px - x) <= half * s + SLACK && py <= y + SLACK && py >= y - tall * s - SLACK
    if (inside && (!found || p.y > found.y)) found = p
  }
  return found
}
