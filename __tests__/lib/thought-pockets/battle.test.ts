import { describe, expect, it } from 'vitest'
import {
  COMPOSURE_GUARD,
  MAX_TURNS,
  SORITES_CAP,
  canPlay,
  endTurn,
  incomingDamage,
  playCard,
  previewArgument,
  undoPlay,
} from '@/lib/games/thought-pockets/engine/battle'
import { BattleState } from '@/types/thought-pockets'
import { getEnemyDef } from '@/lib/games/thought-pockets/data/enemies'
import { battleWith, card, deepFreeze } from './helpers'

const START = getEnemyDef('jumping_to_conclusions').health

function attackOf(enemyId: string, move: number): number {
  return getEnemyDef(enemyId).moves[move].attack ?? 0
}

function playAll(battle: BattleState, uids: number[]): BattleState {
  return uids.reduce((state, uid) => playCard(state, uid), battle)
}

function strip(battle: BattleState) {
  const { undo: _undo, ...core } = battle
  return core
}

describe('the argument', () => {
  it('adds Weight, multiplies by Multiplier, and counts the last card (Conclusion) Weight or Multiplier twice', () => {
    const battle = battleWith({ hand: ['observation', 'observation', 'therefore'], school: 'skeptic' })
    const evidenceLast = previewArgument(playAll(battle, [100, 102, 101]))
    expect(evidenceLast.weight).toBe(12)
    expect(evidenceLast.multiplier).toBe(1.5)
    expect(evidenceLast.damage).toBe(18)
    expect(evidenceLast.steps.at(-1)?.conclusion).toBe(true)

    const logicLast = previewArgument(playAll(battle, [100, 101, 102]))
    expect(logicLast.weight).toBe(8)
    expect(logicLast.multiplier).toBe(2)
    expect(logicLast.damage).toBe(16)
  })

  it('lands when the turn ends, exactly as previewed', () => {
    const battle = playAll(battleWith({ hand: ['observation', 'observation', 'therefore'], school: 'skeptic' }), [100, 102, 101])
    const preview = previewArgument(battle)
    const after = endTurn(battle)
    expect(after.enemy.health).toBe(START - preview.damage)
    expect(after.lastRound?.damage).toBe(preview.damage)
  })

  it('enemy Guard absorbs the argument and is used up by it (regression: infinite block)', () => {
    const start = battleWith({ hand: ['observation', 'observation', 'therefore'], school: 'skeptic' })
    const guarded = { ...start, enemy: { ...start.enemy, guard: 8 } }
    const played = playAll(guarded, [100, 102, 101])
    const preview = previewArgument(played)
    expect(preview.blocked).toBe(8)
    expect(preview.damage).toBe(10)
    const after = endTurn(played)
    expect(after.enemy.health).toBe(START - 10)
    expect(after.enemy.guard).toBe(0)
    expect(after.lastRound?.guardBroken).toBe(true)
  })

  it('enemy Guard wears off when the enemy next acts, even if nothing hit it', () => {
    const start = battleWith({ hand: [] })
    const after = endTurn({ ...start, enemy: { ...start.enemy, guard: 8 } })
    expect(after.enemy.guard).toBe(0)
  })

  it('holding back: each Focus left unspent becomes Guard when the turn ends', () => {
    const battle = battleWith({ hand: ['observation'] })
    expect(previewArgument(battle).guard).toBe(3 * COMPOSURE_GUARD)
    const played = playCard(battle, 100)
    expect(previewArgument(played).guard).toBe(2 * COMPOSURE_GUARD)
    expect(previewArgument(played).composure).toBe(2 * COMPOSURE_GUARD)
    expect(endTurn(played).lastRound?.enemyBlocked).toBe(Math.min(2 * COMPOSURE_GUARD, attackOf('jumping_to_conclusions', 0)))
  })

  it('your Guard absorbs the attack this round and resets on your next turn', () => {
    const battle = playCard({ ...battleWith({ hand: ['caveat'] }), focus: 1 }, 100)
    expect(previewArgument(battle).guard).toBe(6)
    const after = endTurn(battle)
    expect(after.player.resolve).toBe(50 - (attackOf('jumping_to_conclusions', 0) - 6))
    expect(after.lastRound?.enemyBlocked).toBe(6)
    expect(after.player.guard).toBe(0)
  })

  it('wins immediately on a lethal argument and the enemy does not act', () => {
    const start = battleWith({ hand: ['smoking_gun'] })
    const after = endTurn(playCard({ ...start, focus: 3, enemy: { ...start.enemy, health: 20 } }, 100))
    expect(after.outcome).toBe('won')
    expect(after.player.resolve).toBe(50)
  })

  it('previews exactly what you will take this round', () => {
    const attack = attackOf('jumping_to_conclusions', 0)
    const battle = playCard({ ...battleWith({ hand: ['concede'] }), focus: 0 }, 100)
    const incoming = incomingDamage(battle, previewArgument(battle).guard)
    expect(incoming.total).toBe(attack)
    expect(incoming.afterGuard).toBe(attack - 4)
    expect(previewArgument(battle).incomingAfterGuard).toBe(attack - 4)
    const noGuard = { ...battleWith({ hand: [] }), focus: 0 }
    expect(incomingDamage(noGuard, 0).afterGuard).toBe(attack)
    expect(endTurn(noGuard).player.resolve).toBe(50 - attack)
  })
})

describe('playing cards', () => {
  it('spends Focus and refuses cards you cannot afford', () => {
    const battle = battleWith({ hand: ['field_study', 'field_study'], school: 'skeptic' })
    const after = playCard(battle, 100)
    expect(after.focus).toBe(1)
    expect(canPlay(after, 101)).toBe(false)
    expect(playCard(after, 101)).toBe(after)
  })

  it('never plays Doubt', () => {
    const battle = battleWith({ hand: ['doubt'] })
    expect(canPlay(battle, 100)).toBe(false)
  })

  it('undo reverts draw, Focus and Resolve effects (regression)', () => {
    const start = battleWith({ hand: ['insight', 'clarity', 'breathe'], resolve: 40, school: 'skeptic' })
    const battle = { ...start, drawPile: [card('observation', 150)] }
    const played = playAll(battle, [100, 101, 102])
    expect(played.hand.map((c) => c.cardId)).toEqual(['observation'])
    expect(played.focus).toBe(3)
    expect(played.player.resolve).toBe(47)
    const undone = undoPlay(undoPlay(undoPlay(played)))
    expect(strip(undone)).toEqual(strip(battle))
  })

  it('does not mutate the state it is given', () => {
    const battle = deepFreeze(battleWith({ hand: ['observation', 'therefore', 'caveat'] }))
    expect(() => endTurn(playAll(battle, [100, 101, 102]))).not.toThrow()
  })

  it('draws a new hand of 5 and refills Focus each turn', () => {
    const start = battleWith({ hand: [] })
    const deck = Array.from({ length: 8 }, (_, i) => card('observation', 300 + i))
    const after = endTurn({ ...start, drawPile: deck })
    expect(after.hand).toHaveLength(5)
    expect(after.focus).toBe(3)
    expect(after.turn).toBe(2)
  })

  it('ends the fight as a loss when the turn cap is reached', () => {
    const start = battleWith({ hand: [] })
    expect(endTurn({ ...start, turn: MAX_TURNS }).outcome).toBe('lost')
  })
})

describe('card effects do what they say', () => {
  it('Pierce ignores enemy Guard and leaves it in place', () => {
    const start = battleWith({ hand: ['counterexample'], school: 'skeptic' })
    const battle = playCard({ ...start, enemy: { ...start.enemy, guard: 9 } }, 100)
    expect(previewArgument(battle).damage).toBe(6)
    expect(previewArgument(battle).blocked).toBe(0)
  })

  it('Postpone stops the enemy acting this round and keeps its intent', () => {
    const battle = playCard({ ...battleWith({ hand: ['pause'] }), focus: 3 }, 100)
    const after = endTurn(battle)
    expect(after.player.resolve).toBe(50)
    expect(after.enemy.moveIndex).toBe(0)
  })

  it('Unsettle makes the enemy lose that much Resolve each round, then halves', () => {
    const battle = playCard(battleWith({ hand: ['socratic_method'], school: 'rationalist' }), 100)
    expect(previewArgument(battle).unsettle).toBe(4)
    const after = endTurn(battle)
    expect(after.enemy.unsettle).toBe(2)
    expect(after.enemy.health).toBe(START - 4)
    expect(endTurn(after).enemy.health).toBe(START - 6)
  })

  it('Corroboration, Induction and Deduction count the rest of the argument', () => {
    const corroborated = playAll(battleWith({ hand: ['observation', 'observation', 'corroboration'], school: 'skeptic' }), [100, 101, 102])
    expect(corroborated.focus).toBe(0)
    expect(previewArgument(corroborated).weight).toBe(4 + 4 + (2 + 4) * 2)

    const induced = playAll(battleWith({ hand: ['observation', 'observation', 'induction'], school: 'skeptic' }), [100, 101, 102])
    expect(previewArgument(induced).multiplier).toBe(1 + 2 * 1)

    const deduced = playAll(battleWith({ hand: ['observation', 'therefore', 'deduction'], school: 'skeptic' }), [100, 101, 102])
    expect(previewArgument(deduced).multiplier).toBe(1 + 0.5 + 2 * (0.5 + 0.5))
  })

  it('Q.E.D. counts three times as the Conclusion', () => {
    const battle = playAll({ ...battleWith({ hand: ['observation', 'qed'], school: 'skeptic' }), focus: 3 }, [100, 101])
    expect(previewArgument(battle).multiplier).toBe(4)
  })

  it('Embrace the Absurd adds a temporary Doubt to your hand', () => {
    const battle = playCard(battleWith({ hand: ['embrace_absurd'] }), 100)
    const doubt = battle.hand.find((c) => c.cardId === 'doubt')
    expect(doubt?.temporary).toBe(true)
  })

  it('Lived Experience adds more Weight at half Resolve or less', () => {
    const battle = playCard(battleWith({ hand: ['lived_experience'], resolve: 25, school: 'skeptic' }), 100)
    expect(previewArgument(battle).weight).toBe((3 + 6) * 2)
  })
})

describe('school passives', () => {
  it('Empiricist: an Evidence Conclusion counts three times', () => {
    const battle = playAll(battleWith({ hand: ['observation', 'therefore', 'observation'], school: 'empiricist' }), [100, 101, 102])
    expect(previewArgument(battle).weight).toBe(4 + 12)
    const logicLast = playAll(battleWith({ hand: ['observation', 'therefore'], school: 'empiricist' }), [100, 101])
    expect(previewArgument(logicLast).multiplier).toBe(2)
  })

  it('Pragmatist: Guard left after the enemy acts becomes Weight next argument', () => {
    const battle = playCard({ ...battleWith({ hand: ['burden_of_proof'], school: 'pragmatist' }), focus: 2 }, 100)
    const after = endTurn(battle)
    const left = 12 - attackOf('jumping_to_conclusions', 0)
    expect(after.carriedWeight).toBe(left)
    expect(previewArgument({ ...after, played: [] }).weight).toBe(left)
  })

  it('Rationalist: the first Logic each turn costs 0', () => {
    const battle = battleWith({ hand: ['therefore', 'therefore'], school: 'rationalist' })
    const once = playCard(battle, 100)
    expect(once.focus).toBe(3)
    expect(playCard(once, 101).focus).toBe(2)
  })

  it('Skeptic: Unsettle 2 more', () => {
    const battle = playCard(battleWith({ hand: ['why'], school: 'skeptic' }), 100)
    expect(previewArgument(battle).unsettle).toBe(3)
  })

  it('Absurdist: each Doubt in hand adds 3 Weight', () => {
    const battle = playCard(battleWith({ hand: ['observation', 'doubt', 'doubt'], school: 'absurdist' }), 100)
    expect(previewArgument(battle).weight).toBe(8 + 6)
  })
})

describe('enemy rules are real', () => {
  it('Sunk Cost grows by 2 each time it acts', () => {
    const after = endTurn(endTurn(battleWith({ enemyId: 'sunk_cost' })))
    expect(after.enemy.strength).toBe(4)
    expect(incomingDamage(after, 0).total).toBe(attackOf('sunk_cost', 2) + 4)
  })

  it('Dunning-Kruger hits +4 only while above half', () => {
    const battle = battleWith({ enemyId: 'dunning_kruger' })
    expect(incomingDamage(battle, 0).total).toBe(attackOf('dunning_kruger', 0) + 4)
    const half = battle.enemy.maxHealth / 2
    expect(incomingDamage({ ...battle, enemy: { ...battle.enemy, health: half } }, 0).total).toBe(attackOf('dunning_kruger', 0))
  })

  it('Confirmation Bias halves Evidence it saw in an earlier turn', () => {
    const first = playCard(battleWith({ enemyId: 'confirmation_bias', hand: ['observation', 'observation'], school: 'skeptic' }), 100)
    const next = endTurn(first)
    expect(next.enemy.seen).toContain('observation')
    const again = playCard({ ...next, hand: [card('observation', 400)] }, 400)
    expect(previewArgument(again).weight).toBe(4)
  })

  it('Anchoring makes your first card the Conclusion', () => {
    const battle = playAll(battleWith({ enemyId: 'anchoring', hand: ['observation', 'therefore'], school: 'skeptic' }), [100, 101])
    const preview = previewArgument(battle)
    expect(preview.steps[0].conclusion).toBe(true)
    expect(preview.weight).toBe(8)
    expect(preview.multiplier).toBe(1.5)
  })

  it('Bandwagon gains +1 attack for each repeated card name', () => {
    const battle = playAll(battleWith({ enemyId: 'bandwagon', hand: ['observation', 'observation', 'observation'], school: 'skeptic' }), [100, 101, 102])
    expect(previewArgument(battle).growth).toBe(2)
    expect(endTurn(battle).enemy.strength).toBe(2)
  })

  it('Availability adds a temporary Doubt to your draw pile', () => {
    const after = endTurn(battleWith({ enemyId: 'availability' }))
    const doubts = [...after.drawPile, ...after.hand, ...after.discardPile].filter((c) => c.cardId === 'doubt')
    expect(doubts).toHaveLength(1)
    expect(doubts[0].temporary).toBe(true)
  })

  it('Backfire costs you 1 Resolve per card in an argument that hurts it', () => {
    const battle = playAll({ ...battleWith({ enemyId: 'backfire', hand: ['observation', 'therefore', 'concede'], school: 'skeptic' }), focus: 2 }, [100, 101, 102])
    expect(previewArgument(battle).selfLoss).toBe(3)
    const after = endTurn(battle)
    expect(after.player.resolve).toBe(50 - 3 - (attackOf('backfire', 0) - 4))
  })

  it('The Problem of Induction rewards a Conclusion of a different type from last turn with +50%', () => {
    const first = endTurn(playCard(battleWith({ enemyId: 'problem_of_induction', hand: ['observation'], school: 'skeptic' }), 100))
    const hand = [card('observation', 400), card('observation', 401), card('caveat', 402), card('therefore', 403)]
    const repeat = playAll({ ...first, hand }, [400, 401])
    expect(previewArgument(repeat).damage).toBe(12)
    const varied = playAll({ ...first, hand }, [400, 401, 403])
    expect(previewArgument(varied).product).toBe(16)
    expect(previewArgument(varied).damage).toBe(24)
  })

  it('The Sorites Paradox caps one argument and turns every 5 beyond the cap into 1 Unsettle', () => {
    const battle = playCard({ ...battleWith({ enemyId: 'sorites', hand: ['smoking_gun'] }), focus: 3 }, 100)
    const preview = previewArgument(battle)
    expect(preview.damage).toBe(SORITES_CAP)
    expect(preview.unsettle).toBe(Math.floor((24 - SORITES_CAP) / 5))
    expect(endTurn(battle).lastRound?.unsettleLoss).toBe(1)
  })

  it("Status Quo Bias keeps its Guard between rounds", () => {
    const moves = getEnemyDef('status_quo').moves
    const after = endTurn(battleWith({ enemyId: 'status_quo' }))
    expect(after.enemy.guard).toBe(moves[0].guard)
    expect(endTurn(after).enemy.guard).toBe((moves[0].guard ?? 0) + (moves[1].guard ?? 0))
  })

  it('Halo Effect halves all but your strongest Evidence', () => {
    const battle = playAll(battleWith({ enemyId: 'halo_effect', hand: ['statistic', 'observation', 'therefore'], school: 'skeptic' }), [100, 101, 102])
    expect(previewArgument(battle).weight).toBe(6 + 2)
  })

  it('Motivated Reasoning recovers half the damage from arguments under 3 cards', () => {
    const thin = playAll(battleWith({ enemyId: 'motivated_reasoning', hand: ['observation', 'therefore'], school: 'skeptic' }), [100, 101])
    const preview = previewArgument(thin)
    expect(preview.damage).toBe(8)
    expect(preview.healedBack).toBe(4)
    expect(endTurn(thin).enemy.health).toBe(getEnemyDef('motivated_reasoning').health - 4)
    const full = playAll(battleWith({ enemyId: 'motivated_reasoning', hand: ['observation', 'observation', 'therefore'], school: 'skeptic' }), [100, 101, 102])
    expect(previewArgument(full).healedBack).toBe(0)
  })

  it('The Meaning of Life doubles an argument that answers its question', () => {
    const answered = playCard(battleWith({ enemyId: 'meaning_of_life', hand: ['observation'], school: 'skeptic' }), 100)
    expect(previewArgument(answered).damage).toBe(16)
    const unanswered = playCard(battleWith({ enemyId: 'meaning_of_life', hand: ['therefore'], school: 'skeptic' }), 100)
    expect(previewArgument(unanswered).damage).toBe(0)
    expect(previewArgument(unanswered).modifiers).toContain('Not answered: include an Evidence card to double')
  })
})

describe('relics bend the rules', () => {
  it("Ockham's Razor: exactly 2 cards gets +1 Multiplier", () => {
    const battle = playAll(battleWith({ hand: ['observation', 'observation'], relics: ['ockhams_razor'], school: 'skeptic' }), [100, 101])
    expect(previewArgument(battle).multiplier).toBe(2)
  })

  it('Footnotes: 4+ cards makes the Conclusion count three times', () => {
    const battle = playAll(
      { ...battleWith({ hand: ['anecdote', 'anecdote', 'anecdote', 'observation'], relics: ['footnotes'], school: 'skeptic' }) },
      [100, 101, 102, 103],
    )
    expect(previewArgument(battle).weight).toBe(6 + 12)
  })

  it('Worry Stone: unspent Focus gives 3 more Guard each', () => {
    const battle = battleWith({ hand: [], relics: ['worry_stone'] })
    expect(previewArgument(battle).guard).toBe(3 * (COMPOSURE_GUARD + 3))
  })

  it('Lantern: the first argument pierces', () => {
    const start = battleWith({ hand: ['observation'], relics: ['lantern'], school: 'skeptic' })
    const battle = playCard({ ...start, enemy: { ...start.enemy, guard: 5 } }, 100)
    expect(previewArgument(battle).damage).toBe(8)
  })

  it('Stoic Pebble caps one enemy action at 12', () => {
    const start = battleWith({ enemyId: 'gamblers_fallacy', relics: ['stoic_pebble'] })
    const battle = { ...start, focus: 0, enemy: { ...start.enemy, gambleHit: true } }
    expect(previewArgument(battle).risk?.afterGuard).toBe(12)
    expect(endTurn(battle).player.resolve).toBe(38)
  })

  it('The Long View carries up to 2 unspent Focus', () => {
    const after = endTurn(battleWith({ hand: [], relics: ['long_view'] }))
    expect(after.focus).toBe(5)
  })
})
