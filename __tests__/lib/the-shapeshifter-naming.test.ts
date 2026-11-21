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
    expect(fallbackName(['mouse_follow', 'pulse_gems', 'gravity_well', 'sweepers', 'phase_dash', 'score_rush'], 'collector')).toBe('GATHERING GEMS & GENTLE PULL')
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
    expect(reflection({ transformed: 3, bumps: 0, carries: 0 })).toBe('Six rules arrived without asking. You turned 3 shadows into stars.')
    expect(reflection({ transformed: 1, bumps: 0, carries: 0 })).toBe('Six rules arrived without asking. You turned 1 shadow into a star.')
    expect(reflection({ transformed: 0, bumps: 0, carries: 0 })).toBe('Six rules arrived without asking. You met each one as it came.')
  })

  it('explains a shadow bump only when a shadow bumped the orb', () => {
    expect(reflection({ transformed: 0, bumps: 4, carries: 0 })).toBe('Six rules arrived without asking. A shadow bumped you 4 times, and nothing was lost. You kept going.')
    expect(reflection({ transformed: 0, bumps: 1, carries: 0 })).toBe('Six rules arrived without asking. A shadow bumped you once, and nothing was lost. You kept going.')
  })

  it('never mentions shadows in a run where only tides carried the orb', () => {
    const line = reflection({ transformed: 0, bumps: 0, carries: 16 })
    expect(line).toBe('Six rules arrived without asking. A tide carried you 16 times. You kept going.')
    expect(line).not.toMatch(/shadow/i)
    expect(reflection({ transformed: 0, bumps: 0, carries: 1 })).toBe('Six rules arrived without asking. A tide carried you once. You kept going.')
  })

  it('never mentions tides in a run where only shadows bumped the orb', () => {
    expect(reflection({ transformed: 0, bumps: 2, carries: 0 })).not.toMatch(/tide/i)
  })

  it('tells each thing that happened in its own words when several did', () => {
    expect(reflection({ transformed: 2, bumps: 1, carries: 3 })).toBe(
      'Six rules arrived without asking. You turned 2 shadows into stars. A shadow bumped you once, and nothing was lost. A tide carried you 3 times.',
    )
  })

  it('calls the pull rule by its card name, never by another word', () => {
    const ids = ['arrow_keys', 'stars', 'gravity_well']
    expect(fallbackName(ids, 'gentle')).toBe('QUIET STARS & GENTLE PULL')
    const tagline = fallbackTagline({ mechanicIds: ids, style: 'gentle', collected: 3, transformed: 0 })
    expect(tagline).toBe('A game for someone who let 3 stars drift their way in the gentle pull.')
    expect(`${fallbackName(ids, 'gentle')} ${tagline}`).not.toMatch(/orbit/i)
  })
})
