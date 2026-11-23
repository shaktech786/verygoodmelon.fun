import { describe, it, expect } from 'vitest'
import { endingKind, fallbackName, fallbackTagline, reflection, type RunStory } from '@/app/games/the-mutation/engine/naming'

const story = (over: Partial<RunStory>): RunStory => ({
  mechanicIds: ['arrow_keys'],
  letBe: [],
  foundBy: ['rested', 'rested'],
  style: 'gentle',
  transformed: 0,
  bumps: 0,
  carries: 0,
  ...over,
})

// Three ways to play one game, the kinds of run the finale has to tell apart
const RESTER = story({ letBe: ['stars', 'pulse_gems', 'chasers', 'sweepers', 'blaster', 'combo_chain', 'gravity_well', 'phase_dash'] })
const EXPLORER = story({
  mechanicIds: ['arrow_keys', 'stars', 'sweepers', 'blaster'],
  foundBy: ['gathered', 'went', 'went', 'went', 'went'],
  style: 'explorer',
  carries: 2,
})
const BLOOMER = story({
  mechanicIds: ['mouse_follow', 'pulse_gems', 'chasers', 'gravity_well', 'score_rush'],
  foundBy: ['rested', 'gathered', 'went', 'gathered', 'went', 'rested'],
  style: 'collector',
  transformed: 4,
})
const KEEPER = story({
  mechanicIds: ['arrow_keys', 'stars'],
  letBe: ['chasers', 'blaster', 'combo_chain'],
  foundBy: ['rested', 'went', 'rested'],
})

describe('The Shapeshifter endings', () => {
  it('reads the ending from what the player chose and how they played', () => {
    expect(endingKind(RESTER)).toBe('still')
    expect(endingKind(EXPLORER)).toBe('wandering')
    expect(endingKind(BLOOMER)).toBe('bloom')
    expect(endingKind(KEEPER)).toBe('kept')
    expect(endingKind(story({ mechanicIds: ['arrow_keys', 'stars', 'combo_chain', 'gravity_well'], foundBy: ['rested', 'gathered', 'gathered', 'rested', 'went'] }))).toBe('gathering')
    expect(endingKind(story({ mechanicIds: ['arrow_keys', 'stars', 'combo_chain', 'gravity_well'], foundBy: ['rested', 'rested', 'rested', 'gathered', 'rested'] }))).toBe('resting')
  })

  it('gives each kind of run its own name, tagline and closing words', () => {
    const runs = [RESTER, EXPLORER, BLOOMER, KEEPER]
    for (const tell of [fallbackName, fallbackTagline, reflection]) {
      expect(new Set(runs.map(tell)).size).toBe(runs.length)
    }
    expect(fallbackName(RESTER)).toBe('SLEEPING STARS & GEMS')
    expect(fallbackName(EXPLORER)).toBe('WANDERING STARS & TIDES')
    expect(fallbackName(BLOOMER)).toBe('GEMS & SHADOWS IN BLOOM')
    expect(fallbackName(KEEPER)).toBe('HALF-KEPT STARS')
  })

  it('a player who only rested hears a gentle ending of their own, not a lesser one', () => {
    const line = reflection(RESTER)
    expect(line).toBe('You let every clue be. They are still out there, asleep, and the field kept its quiet for you.')
    expect(fallbackTagline(RESTER)).toBe('A game for someone who let every clue sleep and kept the field quiet.')
    expect(`${line} ${fallbackTagline(RESTER)}`).not.toMatch(/lazy|fail|lose|lost|only|nothing happened/i)
  })

  it('tells back the rules the player chose, in their order, and what they made together', () => {
    expect(reflection(EXPLORER)).toBe(
      'You went looking, and the game grew wherever you went. You chose the stars, then the tides, then a lantern. Together, your tides carried the stars along and your lantern left stars along the tides.',
    )
    expect(reflection(BLOOMER)).toBe(
      'You chose the bloom, and everything you had gathered glowed at once. You chose the breathing gems, then the shy shadows, then the gentle pull, then the bloom. Together, the pull drew shadows in and made them stars and the bloom turned every shadow to light.',
    )
  })

  it('remembers what was let be, and a game ended early', () => {
    expect(reflection(KEEPER)).toBe(
      'You took a little and let the rest sleep. The field remembers both. You chose the stars. You let the shy shadows, a lantern and a rhythm sleep. You ended it while it was still small.',
    )
  })

  it('the same rules chosen in another order, or found another way, end differently', () => {
    const otherOrder = { ...EXPLORER, mechanicIds: ['arrow_keys', 'stars', 'blaster', 'sweepers'] }
    expect(reflection(otherOrder)).not.toBe(reflection(EXPLORER))
    const rested = { ...EXPLORER, style: 'gentle' as const, foundBy: ['rested', 'rested', 'rested', 'gathered', 'rested'] as const }
    expect(endingKind({ ...rested, foundBy: [...rested.foundBy] })).toBe('resting')
    expect(fallbackName({ ...rested, foundBy: [...rested.foundBy] })).toBe('QUIET STARS & TIDES')
  })

  it('mentions a bump or a carry only when no shared rule already told it', () => {
    expect(reflection(story({ mechanicIds: ['arrow_keys', 'stars', 'chasers'], bumps: 2, foundBy: ['rested', 'went', 'went'] }))).toMatch(/A shadow bumped into you, and nothing was lost\./)
    const tides = reflection(story({ mechanicIds: ['arrow_keys', 'gravity_well', 'sweepers'], carries: 3, foundBy: ['rested', 'went', 'went'] }))
    expect(tides).toMatch(/the pull held you steady in the tides/)
    expect(tides).not.toMatch(/A tide carried you along/)
    expect(tides).not.toMatch(/shadow/i)
  })

  it('never counts anything, so no ending reads as a score', () => {
    for (const run of [RESTER, EXPLORER, BLOOMER, KEEPER]) {
      expect(`${reflection(run)} ${fallbackName(run)} ${fallbackTagline(run)}`).not.toMatch(/\d|\btwice\b|\btimes\b|\bsix\b|\bfive\b|\bthree\b/i)
      expect(fallbackTagline(run).length).toBeLessThanOrEqual(110)
      expect(fallbackName(run).length).toBeLessThanOrEqual(32)
    }
  })

  it('calls the pull rule by its card name, never by another word', () => {
    const run = story({ mechanicIds: ['arrow_keys', 'stars', 'gravity_well'], foundBy: ['rested', 'rested', 'rested'] })
    expect(fallbackName(run)).toBe('QUIET STARS & GENTLE PULL')
    expect(fallbackTagline(run)).toBe('A game for someone who let the stars drift their way in the gentle pull.')
    expect(`${fallbackName(run)} ${fallbackTagline(run)}`).not.toMatch(/orbit/i)
  })
})
