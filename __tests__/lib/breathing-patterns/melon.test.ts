import { describe, expect, it } from 'vitest'
import { type Breath, MAX_SEEDS, melonSeeds, readLastMelon, writeLastMelon } from '@/lib/games/breathing-patterns/melon'

const breaths = (pattern: Breath['pattern'], seconds: number, n: number): Breath[] =>
  Array.from({ length: n }, () => ({ pattern, seconds }))

describe('melonSeeds', () => {
  it('sets one seed per breath, up to a full melon', () => {
    expect(melonSeeds([])).toEqual([])
    expect(melonSeeds(breaths('box', 16, 12))).toHaveLength(12)
    expect(melonSeeds(breaths('box', 16, MAX_SEEDS + 30))).toHaveLength(MAX_SEEDS)
  })

  it('is the same melon for the same breaths', () => {
    const session = [...breaths('box', 16, 5), ...breaths('free', 6.2, 3)]
    expect(melonSeeds(session)).toEqual(melonSeeds(session.map((b) => ({ ...b }))))
  })

  it('makes a different pattern for a different rhythm, even with the same number of breaths', () => {
    const box = melonSeeds(breaths('box', 16, 15))
    const relax = melonSeeds(breaths('478', 19, 15))
    const coherent = melonSeeds(breaths('coherent', 11, 15))
    const far = (a: typeof box, b: typeof box) => a.some((s, i) => Math.hypot(s.x - b[i].x, s.y - b[i].y) > 0.02)
    expect(far(box, relax)).toBe(true)
    expect(far(box, coherent)).toBe(true)
    expect(far(relax, coherent)).toBe(true)
  })

  it('grows longer seeds from longer breaths', () => {
    const [quick] = melonSeeds([{ pattern: 'free', seconds: 4 }])
    const [slow] = melonSeeds([{ pattern: 'free', seconds: 18 }])
    expect(slow.length).toBeGreaterThan(quick.length * 1.3)
  })

  it('gives each rhythm its own seed shape', () => {
    const ratio = (pattern: Breath['pattern']) => {
      const [seed] = melonSeeds([{ pattern, seconds: 12 }])
      return seed.width / seed.length
    }
    expect(ratio('box')).toBeGreaterThan(ratio('478'))
    expect(new Set((['box', '478', 'coherent', 'sigh', 'free'] as const).map(ratio)).size).toBe(5)
  })

  it('keeps early seeds where they were while the melon is still filling', () => {
    const session = breaths('sigh', 11, 10)
    const later = melonSeeds([...session, ...breaths('box', 16, 6)])
    expect(later.slice(0, 10)).toEqual(melonSeeds(session))
  })

  it('keeps every seed inside the red of the melon', () => {
    const wild: Breath[] = Array.from({ length: MAX_SEEDS }, (_, i) => ({ pattern: 'free', seconds: (i * 7.3) % 40 }))
    for (const seed of melonSeeds(wild)) expect(Math.hypot(seed.x, seed.y) + seed.length).toBeLessThanOrEqual(0.8)
  })
})

describe('last melon', () => {
  const at = new Date('2026-11-21T10:00:00Z')

  it('round-trips the breaths and when they were taken', () => {
    const session = [...breaths('box', 16, 3), { pattern: 'free' as const, seconds: 5.5 }]
    expect(readLastMelon(writeLastMelon(session, at))).toEqual({ breaths: session, at: at.toISOString() })
  })

  it('forgives anything it cannot read by showing nothing', () => {
    for (const raw of [null, '', '{oops', '[]', '{"v":1}', JSON.stringify({ v: 1, at: 'soon', breaths: [] }), JSON.stringify({ v: 9, at: at.toISOString(), breaths: [] })]) {
      expect(readLastMelon(raw)).toBeNull()
    }
  })

  it('drops breaths it does not recognise and keeps the rest', () => {
    const raw = JSON.stringify({ v: 1, at: at.toISOString(), breaths: [{ pattern: 'box', seconds: 16 }, { pattern: 'gasp', seconds: 2 }, { pattern: 'free', seconds: -1 }, 'x'] })
    expect(readLastMelon(raw)?.breaths).toEqual([{ pattern: 'box', seconds: 16 }])
  })

  it('shows nothing for a melon without seeds', () => {
    expect(readLastMelon(JSON.stringify({ v: 1, at: at.toISOString(), breaths: [{ pattern: 'gasp', seconds: 2 }] }))).toBeNull()
  })
})
