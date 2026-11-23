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
      const line = fallbackTagline({ mechanicIds: RUN, style, transformed: 3 })
      expect(line).toMatch(/^A game for someone who .+\.$/)
      expect(line).not.toMatch(/\d/)
      expect(line.length).toBeLessThanOrEqual(110)
      expect(line).not.toMatch(/lazy|fail|lose|lost/i)
    }
  })

  it('draws the tagline from the run itself, so different runs never share one line', () => {
    const lanterns = fallbackTagline({ mechanicIds: ['arrow_keys', 'stars', 'chasers', 'blaster'], style: 'explorer', transformed: 0 })
    const tides = fallbackTagline({ mechanicIds: ['mouse_follow', 'pulse_gems', 'sweepers'], style: 'explorer', transformed: 0 })
    expect(lanterns).toBe('A game for someone who roamed the whole field and found stars by lantern light.')
    expect(tides).toBe('A game for someone who roamed the whole field and found gems as the tides came and went.')
    expect(fallbackTagline({ mechanicIds: RUN, style: 'bold', transformed: 1 })).toBe('A game for someone who turned shadows into light in an easy rhythm.')
    expect(fallbackTagline({ mechanicIds: RUN, style: 'collector', transformed: 0 })).toBe('A game for someone who gathered stars, one small light at a time in an easy rhythm.')
    expect(fallbackTagline({ mechanicIds: [], style: 'gentle', transformed: 0 })).toBe('A game for someone who let the stars drift their way.')
  })

  const RESTED = ['rested'] as const

  it('closes by telling how the rules were found, never that they were announced', () => {
    expect(reflection({ transformed: 0, bumps: 0, carries: 0, foundBy: ['rested', 'rested'] })).toBe(
      'Nobody told you the rules. Each one grew while you simply rested. Nothing was lost along the way.',
    )
    expect(reflection({ transformed: 0, bumps: 0, carries: 0, foundBy: ['went'] })).toBe(
      'Nobody told you the rules. You went looking, and found every one. Nothing was lost along the way.',
    )
    expect(reflection({ transformed: 0, bumps: 0, carries: 0, foundBy: ['gathered', 'went'] })).toBe(
      'Nobody told you the rules. Some you went looking for, and some opened while you gathered light. Nothing was lost along the way.',
    )
    expect(reflection({ transformed: 0, bumps: 0, carries: 0, foundBy: ['rested', 'gathered', 'went'] })).toBe(
      'Nobody told you the rules. Some you went looking for, some opened while you gathered light, and some grew while you rested. Nothing was lost along the way.',
    )
  })

  it('tells back what the player did with the rules they found', () => {
    expect(reflection({ transformed: 3, bumps: 0, carries: 0, foundBy: RESTED })).toBe('Nobody told you the rules. Each one grew while you simply rested. You turned shadows into stars.')
    expect(reflection({ transformed: 1, bumps: 0, carries: 0, foundBy: RESTED })).toBe('Nobody told you the rules. Each one grew while you simply rested. You turned a shadow into a star.')
  })

  it('explains a shadow bump only when a shadow bumped the orb', () => {
    expect(reflection({ transformed: 0, bumps: 4, carries: 0, foundBy: RESTED })).toBe('Nobody told you the rules. Each one grew while you simply rested. A shadow bumped into you, and nothing was lost.')
    expect(reflection({ transformed: 0, bumps: 1, carries: 0, foundBy: RESTED })).toMatch(/A shadow bumped into you/)
  })

  it('never mentions shadows in a run where only tides carried the orb', () => {
    const line = reflection({ transformed: 0, bumps: 0, carries: 16, foundBy: RESTED })
    expect(line).toBe('Nobody told you the rules. Each one grew while you simply rested. A tide carried you along.')
    expect(line).not.toMatch(/shadow/i)
  })

  it('never counts anything, so the closing never reads as a score', () => {
    for (const run of [
      { transformed: 7, bumps: 3, carries: 16, foundBy: ['went', 'rested', 'gathered', 'went'] as const },
      { transformed: 1, bumps: 1, carries: 1, foundBy: RESTED },
    ]) {
      expect(reflection(run)).not.toMatch(/\d|once|twice|times|six/i)
    }
  })

  it('never mentions tides in a run where only shadows bumped the orb', () => {
    expect(reflection({ transformed: 0, bumps: 2, carries: 0, foundBy: RESTED })).not.toMatch(/tide/i)
  })

  it('tells each thing that happened in its own words when several did', () => {
    expect(reflection({ transformed: 2, bumps: 1, carries: 3, foundBy: ['went', 'rested'] })).toBe(
      'Nobody told you the rules. Some you went looking for, and some grew while you rested. You turned shadows into stars. A shadow bumped into you, and nothing was lost. A tide carried you along.',
    )
  })

  it('calls the pull rule by its card name, never by another word', () => {
    const ids = ['arrow_keys', 'stars', 'gravity_well']
    expect(fallbackName(ids, 'gentle')).toBe('QUIET STARS & GENTLE PULL')
    const tagline = fallbackTagline({ mechanicIds: ids, style: 'gentle', transformed: 0 })
    expect(tagline).toBe('A game for someone who let the stars drift their way in the gentle pull.')
    expect(`${fallbackName(ids, 'gentle')} ${tagline}`).not.toMatch(/orbit/i)
  })
})
