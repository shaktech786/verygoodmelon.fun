import { describe, it, expect } from 'vitest'
import { WHOLE, arrivalLine, arrivalTimes, glowAt, growthShown, mixCamera, returnCamera, visitorKindAt } from '@/lib/games/calm-garden/moments'

const inside = ({ zoom, x, y }: { zoom: number; x: number; y: number }) => {
  const half = 0.5 / zoom
  return x - half >= -1e-9 && x + half <= 1 + 1e-9 && y - half >= -1e-9 && y + half <= 1 + 1e-9
}

describe('the look across a garden that grew', () => {
  const spots = [{ x: 0.1, y: 0.7 }, { x: 0.9, y: 0.6 }]

  it('drifts left to right, close in, then shows the whole garden again', () => {
    const start = returnCamera(0, spots)
    const middle = returnCamera(0.4, spots)
    expect(start.zoom).toBeGreaterThan(1)
    expect(middle.x).toBeGreaterThan(start.x)
    expect(returnCamera(1, spots)).toEqual(WHOLE)
  })

  it('never shows anything beyond the edges of the garden', () => {
    for (let t = 0; t <= 1; t += 0.05) expect(inside(returnCamera(t, spots))).toBe(true)
    for (let k = 0; k <= 1; k += 0.1) expect(inside(mixCamera(returnCamera(0.3, spots), WHOLE, k))).toBe(true)
  })

  it('still moves across a garden where only one thing grew', () => {
    const one = [{ x: 0.5, y: 0.6 }]
    expect(returnCamera(0.69, one).x).toBeGreaterThan(returnCamera(0, one).x)
  })

  it('stays on the whole garden when nothing grew', () => {
    expect(returnCamera(0.3, [])).toEqual(WHOLE)
  })

  it('grows the left side first and finishes every plant before the view settles', () => {
    expect(growthShown(0.3, 0.1)).toBeGreaterThan(growthShown(0.3, 0.9))
    expect(growthShown(0, 0)).toBe(0)
    expect(growthShown(0.78, 1)).toBe(1)
  })

  it('lets the new growth glow while the view moves, and gone by the end', () => {
    expect(glowAt(0)).toBe(0)
    expect(glowAt(0.5)).toBe(1)
    expect(glowAt(1)).toBe(0)
  })
})

describe('visitors arriving while you sit', () => {
  it('brings only the visitors beyond those already here, spread through the sit', () => {
    expect(arrivalTimes(1, 3)).toHaveLength(2)
    expect(arrivalTimes(3, 3)).toEqual([])
    const times = arrivalTimes(0, 2)
    expect(times[0]).toBeGreaterThan(0.1)
    expect(times[1] - times[0]).toBeGreaterThan(0.2)
    expect(times[1]).toBeLessThan(0.9)
  })

  it('names the first arrival to an empty garden, and is quieter about the rest', () => {
    expect(arrivalLine(0, 0, 'butterfly')).toBe('A butterfly came to sit with you.')
    expect(arrivalLine(1, 0, 'butterfly')).toBe('Another came to sit with you.')
    expect(arrivalLine(0, 2, 'firefly')).toBe('Another came to sit with you.')
  })

  it('brings fireflies at night and once an evening sit has let the light go', () => {
    expect(visitorKindAt('night', false, 0)).toBe('firefly')
    expect(visitorKindAt('evening', true, 0.3)).toBe('butterfly')
    expect(visitorKindAt('evening', true, 0.6)).toBe('firefly')
    expect(visitorKindAt('evening', false, 0.6)).toBe('butterfly')
    expect(visitorKindAt('day', true, 1)).toBe('butterfly')
  })
})
