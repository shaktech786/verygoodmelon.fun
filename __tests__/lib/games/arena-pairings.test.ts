import { describe, expect, it } from 'vitest'
import { PAIRINGS, deckStep, pairingIndexOf } from '@/lib/games/arena-pairings'

describe('arena pairings', () => {
  it('finds the pairing a set of fields came from, and none once a field is changed', () => {
    const { first, second, topic } = PAIRINGS[3]
    expect(pairingIndexOf(first, second, topic)).toBe(3)
    expect(pairingIndexOf(first, second, `${topic} Really?`)).toBe(-1)
    expect(pairingIndexOf('', '', '')).toBe(-1)
  })

  it('gives every pairing two pictures and a question', () => {
    for (const pairing of PAIRINGS) {
      expect(pairing.emblems).toHaveLength(2)
      expect(pairing.topic.endsWith('?')).toBe(true)
    }
    expect(new Set(PAIRINGS.map((p) => p.topic)).size).toBe(PAIRINGS.length)
  })
})

describe('deck arrow keys', () => {
  it('moves one card sideways and one row up or down in a grid, stopping at the ends', () => {
    expect(deckStep(5, 'ArrowRight', 13, 4)).toBe(6)
    expect(deckStep(5, 'ArrowLeft', 13, 4)).toBe(4)
    expect(deckStep(5, 'ArrowDown', 13, 4)).toBe(9)
    expect(deckStep(5, 'ArrowUp', 13, 4)).toBe(1)
    expect(deckStep(1, 'ArrowUp', 13, 4)).toBe(0)
    expect(deckStep(11, 'ArrowDown', 13, 4)).toBe(12)
    expect(deckStep(12, 'ArrowRight', 13, 4)).toBe(12)
    expect(deckStep(0, 'ArrowLeft', 13, 4)).toBe(0)
    expect(deckStep(7, 'Home', 13, 4)).toBe(0)
    expect(deckStep(7, 'End', 13, 4)).toBe(12)
    expect(deckStep(7, 'Enter', 13, 4)).toBeNull()
  })

  it('treats up and down like left and right when every card sits in one row', () => {
    expect(deckStep(5, 'ArrowDown', 13, 13)).toBe(6)
    expect(deckStep(5, 'ArrowUp', 13, 13)).toBe(4)
  })
})
