import { describe, expect, it } from 'vitest'
import { ENEMIES } from '@/lib/games/thought-pockets/data/enemies'
import { EMBLEMS } from '@/app/games/thought-pockets/components/Sprites'

describe('bias emblems', () => {
  it('every opponent has its own 16x16 emblem, and nothing else does', () => {
    expect(Object.keys(EMBLEMS).sort()).toEqual(ENEMIES.map((e) => e.id).sort())
    for (const [id, rows] of Object.entries(EMBLEMS)) {
      expect(rows, id).toHaveLength(16)
      for (const row of rows) expect(row, id).toMatch(/^[.kwrglyb]{16}$/)
    }
    expect(new Set(Object.values(EMBLEMS).map((rows) => rows.join(''))).size).toBe(ENEMIES.length)
  })
})
