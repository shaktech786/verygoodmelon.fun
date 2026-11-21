import { describe, it, expect } from 'vitest'
import { fallbackName, fallbackTagline, reflection } from '@/app/games/the-mutation/engine/naming'

const RUN = ['arrow_keys', 'stars', 'chasers', 'blaster', 'combo_chain', 'score_rush']

describe('The Shapeshifter naming', () => {
  it('names a game from how it was played and what it grew into, never from a score', () => {
    expect(fallbackName(RUN, 'gentle')).toBe('QUIET STARS & SHADOWS')
    expect(fallbackName(['mouse_follow', 'pulse_gems', 'sweepers'], 'explorer')).toBe('WANDERING GEMS & TIDES')
    expect(fallbackName([], 'bold')).toMatch(/^BRIGHT /)
    expect(fallbackName(RUN, 'gentle')).not.toMatch(/\d/)
  })

  it('gives every play style a kind tagline', () => {
    for (const style of ['gentle', 'explorer', 'collector', 'bold'] as const) {
      const line = fallbackTagline(style)
      expect(line.length).toBeGreaterThan(10)
      expect(line).not.toMatch(/lazy|slow|fail|lose|lost/i)
    }
  })

  it('closes with a line about meeting change, shaped by what the player did', () => {
    expect(reflection({ transformed: 3, nudges: 5 })).toBe('Six rules arrived without asking. You turned 3 shadows into stars.')
    expect(reflection({ transformed: 1, nudges: 0 })).toBe('Six rules arrived without asking. You turned 1 shadow into a star.')
    expect(reflection({ transformed: 0, nudges: 4 })).toBe('Six rules arrived without asking. You were nudged 4 times and kept going.')
    expect(reflection({ transformed: 0, nudges: 0 })).toBe('Six rules arrived without asking. You met each one as it came.')
  })
})
