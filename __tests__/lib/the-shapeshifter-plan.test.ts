import { describe, it, expect } from 'vitest'
import { categoryOf, movementFor, offerClues } from '@/app/games/the-mutation/engine/plan'
import { CIRCLE_AFTER, ENDING, MAX_FORKS, OFFER_SIZE } from '@/app/games/the-mutation/engine/types'

/** A repeatable stand-in for Math.random. */
function seeded(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

const offer = (chosen: string[], forks: number, asleep: string[] = [], seed = 1) =>
  offerClues({ chosen, asleep, forks }, seeded(seed))

describe('The Shapeshifter crossroads', () => {
  it('only offers touch players a way of moving they can use', () => {
    for (let seed = 1; seed <= 10; seed++) expect(movementFor(seeded(seed), true)).toBe('mouse_follow')
    const desktop = new Set(Array.from({ length: 20 }, (_, i) => movementFor(seeded(i * 98765431 + 1), false)))
    expect(desktop).toEqual(new Set(['arrow_keys', 'mouse_follow']))
  })

  it('the first crossroads puts both lights side by side, with something different beside them', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const clues = offer(['arrow_keys'], 0, [], seed)
      expect(clues).toHaveLength(OFFER_SIZE)
      expect(clues).toEqual(expect.arrayContaining(['stars', 'pulse_gems']))
      const third = clues.find((id) => id !== 'stars' && id !== 'pulse_gems') ?? ''
      expect(['threat', 'power', 'modifier']).toContain(categoryOf(third))
    }
  })

  it('a run holds one rule of each kind: choosing tides means the shadows never come', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const clues = offer(['arrow_keys', 'stars', 'sweepers'], 2, [], seed)
      expect(clues).not.toContain('chasers')
      expect(clues).not.toContain('pulse_gems')
      expect(clues).not.toContain('sweepers')
    }
  })

  it('offers different kinds of thing at once, so each crossroads is a real choice', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const clues = offer(['arrow_keys', 'stars'], 1, [], seed).filter((id) => id !== ENDING)
      expect(new Set(clues.map(categoryOf)).size).toBe(clues.length)
    }
  })

  it('never offers again a clue the player let sleep', () => {
    const asleep = ['stars', 'pulse_gems', 'chasers']
    for (let seed = 1; seed <= 20; seed++) {
      for (const id of offer(['arrow_keys'], 1, asleep, seed)) expect(asleep).not.toContain(id)
    }
  })

  it('keeps the bloom back until there is something for it to gather up', () => {
    for (let seed = 1; seed <= 40; seed++) {
      expect(offer(['arrow_keys', 'stars'], 1, [], seed)).not.toContain('score_rush')
    }
    const later = new Set(Array.from({ length: 40 }, (_, i) => offer(['arrow_keys', 'stars', 'chasers'], 2, [], i + 1)).flat())
    expect(later).toContain('score_rush')
  })

  it('lets the player choose when to end: the circle joins the clues after a few crossroads', () => {
    expect(offer(['arrow_keys', 'stars', 'chasers'], CIRCLE_AFTER - 1)).not.toContain(ENDING)
    const withCircle = offer(['arrow_keys', 'stars', 'chasers', 'blaster'], CIRCLE_AFTER)
    expect(withCircle).toContain(ENDING)
    expect(withCircle.length).toBeGreaterThan(1)
  })

  it('leaves only the circle once the bloom is chosen, or the crossroads run out', () => {
    expect(offer(['arrow_keys', 'stars', 'chasers', 'score_rush'], 3)).toEqual([ENDING])
    expect(offer(['arrow_keys'], MAX_FORKS, ['stars'])).toEqual([ENDING])
    const everything = ['stars', 'pulse_gems', 'chasers', 'sweepers', 'blaster', 'phase_dash', 'combo_chain', 'gravity_well']
    expect(offer(['arrow_keys'], 3, everything)).toEqual([ENDING])
  })

  it('different choices lead to different later crossroads', () => {
    const afterTides = new Set(Array.from({ length: 30 }, (_, i) => offer(['arrow_keys', 'stars', 'sweepers'], 2, [], i + 1)).flat())
    const afterLantern = new Set(Array.from({ length: 30 }, (_, i) => offer(['arrow_keys', 'stars', 'blaster'], 2, [], i + 1)).flat())
    expect(afterTides).not.toEqual(afterLantern)
    expect(afterTides).not.toContain('chasers')
    expect(afterLantern).toContain('chasers')
  })
})
