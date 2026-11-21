import { describe, it, expect } from 'vitest'
import { fullMelonRadius } from '@/components/games/BreathingPatterns'

describe('the melon inside the breathing guide', () => {
  const r = 100
  const STROKE = 3

  it('never reaches the path of a triangle (4-7-8), a square or a circle', () => {
    for (const sides of [2, 3, 4]) {
      const inner = sides === 2 ? r : r * Math.cos(Math.PI / sides)
      expect(fullMelonRadius(sides, r) + STROKE).toBeLessThan(inner - 5)
    }
  })

  it('keeps the size the square and circle always had', () => {
    expect(fullMelonRadius(4, r)).toBeCloseTo(45)
    expect(fullMelonRadius(2, r)).toBeCloseTo(45)
    expect(fullMelonRadius(3, r)).toBeLessThan(45)
  })
})
