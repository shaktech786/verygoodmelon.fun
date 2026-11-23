import { describe, expect, it } from 'vitest'
import { endTurn, playCard } from '@/lib/games/thought-pockets/engine/battle'
import { BIG_HIT, breakBeat, roundBeats, totalSize } from '@/app/games/thought-pockets/components/RoundShow'
import { RoundReport } from '@/types/thought-pockets'
import { battleWith } from './helpers'

function winningRound(health: number, hand: string[]): RoundReport {
  let battle = battleWith({ hand, school: 'empiricist' })
  battle = { ...battle, enemy: { ...battle.enemy, health } }
  for (const c of battle.hand) battle = playCard(battle, c.uid)
  const after = endTurn(battle)
  expect(after.outcome).toBe('won')
  return after.lastRound as RoundReport
}

describe('the moment a bias gives way', () => {
  it('is the hit that lands when the argument finishes it, and that beat is in the replay', () => {
    const report = winningRound(1, ['observation'])
    expect(breakBeat(report)).toBe('land')
    expect(roundBeats(report)).toContain('land')
  })

  it('is Unsettle when Unsettle takes the last of it', () => {
    const report = { ...winningRound(1, ['observation']), steps: [], damage: 0, unsettleLoss: 1 }
    expect(breakBeat(report)).toBe('unsettle')
    expect(roundBeats(report)).toContain('unsettle')
  })

  it('is the change when a problem’s Shaken lands and finishes it', () => {
    const report = { ...winningRound(1, ['observation']), phaseChanged: true, released: 6 }
    expect(breakBeat(report)).toBe('shift')
    expect(roundBeats(report)).toContain('shift')
  })
})

describe('the tally’s total is set by how hard the round hits', () => {
  const base = winningRound(1, ['observation'])
  it('grows with the damage, as the damage line does', () => {
    expect(totalSize({ ...base, damage: BIG_HIT - 1 })).toBe('text-lg')
    expect(totalSize({ ...base, damage: BIG_HIT })).toBe('text-xl')
    expect(totalSize({ ...base, damage: 2 * BIG_HIT })).toBe('text-2xl')
  })
})
