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

  it('takes the name from whichever rule arrived third, so the same play grows a different name in a different order', () => {
    expect(fallbackName(['arrow_keys', 'stars', 'blaster', 'chasers', 'combo_chain', 'score_rush'], 'gentle')).toBe('QUIET STARS & LANTERNS')
    expect(fallbackName(['mouse_follow', 'pulse_gems', 'gravity_well', 'sweepers', 'phase_dash', 'score_rush'], 'collector')).toBe('GATHERING GEMS & ORBITS')
    expect(fallbackName(['arrow_keys', 'stars', 'combo_chain', 'chasers', 'phase_dash', 'score_rush'], 'bold')).toBe('BRIGHT STARS & RHYTHMS')
  })

  it('gives every play style a kind tagline, short enough for the finale', () => {
    for (const style of ['gentle', 'explorer', 'collector', 'bold'] as const) {
      const line = fallbackTagline({ mechanicIds: RUN, style, collected: 42, transformed: 3 })
      expect(line).toMatch(/^A game for someone who .+\.$/)
      expect(line.length).toBeLessThanOrEqual(110)
      expect(line).not.toMatch(/lazy|fail|lose|lost/i)
    }
  })

  it('draws the tagline from the run itself, so different runs never share one line', () => {
    const lanterns = fallbackTagline({ mechanicIds: ['arrow_keys', 'stars', 'chasers', 'blaster'], style: 'explorer', collected: 31, transformed: 0 })
    const tides = fallbackTagline({ mechanicIds: ['mouse_follow', 'pulse_gems', 'sweepers'], style: 'explorer', collected: 12, transformed: 0 })
    expect(lanterns).toBe('A game for someone who roamed the whole field and found 31 stars by lantern light.')
    expect(tides).toBe('A game for someone who roamed the whole field and found 12 gems as the tides came and went.')
    expect(fallbackTagline({ mechanicIds: RUN, style: 'bold', collected: 5, transformed: 1 })).toBe('A game for someone who turned 1 shadow into light in an easy rhythm.')
    expect(fallbackTagline({ mechanicIds: [], style: 'gentle', collected: 1, transformed: 0 })).toBe('A game for someone who let 1 star drift their way.')
  })

  it('closes with a line about meeting change, shaped by what the player did', () => {
    expect(reflection({ transformed: 3, nudges: 5 })).toBe('Six rules arrived without asking. You turned 3 shadows into stars.')
    expect(reflection({ transformed: 1, nudges: 0 })).toBe('Six rules arrived without asking. You turned 1 shadow into a star.')
    // A nudge is explained, not just counted
    expect(reflection({ transformed: 0, nudges: 4 })).toBe('Six rules arrived without asking. A shadow bumped you 4 times, nothing was lost, and you kept going.')
    expect(reflection({ transformed: 0, nudges: 1 })).toBe('Six rules arrived without asking. A shadow bumped you once, nothing was lost, and you kept going.')
    expect(reflection({ transformed: 0, nudges: 0 })).toBe('Six rules arrived without asking. You met each one as it came.')
  })
})
