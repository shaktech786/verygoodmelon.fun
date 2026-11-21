import { describe, expect, it } from 'vitest'
import { endTurn, playCard, previewArgument } from '@/lib/games/thought-pockets/engine/battle'
import { availableNodes, chooseNode, battleAction, leaveReward, newRun, skipCards } from '@/lib/games/thought-pockets/engine/run'
import { CARDS, describeCard, getCardDef, summarizeCard } from '@/lib/games/thought-pockets/data/cards'
import { SCHOOLS } from '@/lib/games/thought-pockets/data/schools'
import { BattleState, RunState } from '@/types/thought-pockets'
import { battleWith, card } from './helpers'

function playAll(battle: BattleState, uids: number[]): BattleState {
  return uids.reduce((state, uid) => playCard(state, uid), battle)
}

function withFocus(battle: BattleState, focus = 6): BattleState {
  return { ...battle, focus }
}

describe('every school has build-around rares', () => {
  it('each school owns at least two rares, each with full and short text from its data', () => {
    for (const school of SCHOOLS) {
      const rares = CARDS.filter((c) => c.rarity === 'rare' && c.school === school.id)
      expect(rares.length, school.id).toBeGreaterThanOrEqual(2)
      for (const def of rares) {
        expect(describeCard(def).length, def.id).toBeGreaterThan(0)
        expect(summarizeCard(def).length, def.id).toBeGreaterThan(0)
      }
    }
  })
})

describe('the rares do what they say', () => {
  it('Meta-Analysis: +1 Weight for each Evidence played earlier in this fight', () => {
    const start = withFocus(battleWith({ hand: ['observation', 'observation', 'therefore'], school: 'skeptic' }))
    const next = endTurn(playAll(start, [100, 101, 102]))
    const per = getCardDef('meta_analysis').weightPerEarlierEvidence ?? 0
    const later = playCard({ ...next, hand: [card('meta_analysis', 400)], focus: 3 }, 400)
    expect(describeCard(getCardDef('meta_analysis'))).toContain(`+${per} Weight for each Evidence you played earlier in this fight.`)
    expect(previewArgument(later).steps[0].weight).toBe(((getCardDef('meta_analysis').weight ?? 0) + per * 2) * 2)
  })

  it('Replication: while it is in your argument, the Conclusion counts one more time', () => {
    const empiricist = playCard(withFocus(battleWith({ hand: ['replication'], school: 'empiricist' })), 100)
    expect(previewArgument(empiricist).steps[0].times).toBe(4)
    const other = playAll(withFocus(battleWith({ hand: ['replication', 'therefore'], school: 'skeptic' })), [100, 101])
    expect(previewArgument(other).steps[1].times).toBe(3)
  })

  it('Peer Review: Guard for each Evidence in the argument', () => {
    const battle = playAll(withFocus(battleWith({ hand: ['observation', 'observation', 'peer_review'], school: 'skeptic' })), [100, 101, 102])
    expect(previewArgument(battle).steps[2].guard).toBe((getCardDef('peer_review').guardPerEvidence ?? 0) * 2)
  })

  it('Cash Value: Weight from the Guard your cards give', () => {
    const battle = playAll(withFocus(battleWith({ hand: ['caveat', 'caveat', 'cash_value'], school: 'skeptic' })), [100, 101, 102])
    expect(previewArgument(battle).steps[2].weight).toBe(Math.floor(12 * (getCardDef('cash_value').weightPerGuard ?? 0)) * 2)
  })

  it('Meliorism: restores Resolve after each round you lose none, for the rest of the fight', () => {
    const restore = getCardDef('meliorism').lastingRestore ?? 0
    const start = battleWith({ hand: ['meliorism', 'concede', 'concede'], resolve: 30 })
    const safe = endTurn(playAll({ ...start, focus: 3 }, [100, 101, 102]))
    expect(safe.lastRound?.playerLoss).toBe(0)
    expect(safe.lastRound?.restored).toBe(restore)
    expect(safe.player.resolve).toBe(30 + restore)
    const hurt = endTurn({ ...safe, hand: [], focus: 0, enemy: { ...safe.enemy, moveIndex: 2 } })
    expect(hurt.lastRound?.playerLoss).toBeGreaterThan(0)
    expect(hurt.lastRound?.restored).toBe(0)
    expect(safe.exhausted.map((c) => c.cardId)).toContain('meliorism')
  })

  it('Chain of Reasoning: more Multiplier the later it comes', () => {
    const per = getCardDef('chain_of_reasoning').multiplierPerEarlierCard ?? 0
    const last = playAll(withFocus(battleWith({ hand: ['anecdote', 'anecdote', 'chain_of_reasoning'], school: 'skeptic' })), [100, 101, 102])
    expect(previewArgument(last).steps[2].multiplier).toBe(per * 2 * 2)
    const first = playAll(withFocus(battleWith({ hand: ['chain_of_reasoning', 'anecdote'], school: 'skeptic' })), [100, 101])
    expect(previewArgument(first).steps[0].multiplier).toBe(0)
  })

  it('Reductio: Multiplier for each Doubt in hand, counting the one it adds', () => {
    const per = getCardDef('reductio').multiplierPerDoubtInHand ?? 0
    const battle = playAll(withFocus(battleWith({ hand: ['doubt', 'observation', 'reductio'], school: 'skeptic' })), [101, 102])
    expect(previewArgument(battle).steps[1].multiplier).toBe(per * 2 * 2)
  })

  it('Epoché: the enemy’s Unsettle stops halving for the rest of the fight', () => {
    const battle = playCard(withFocus(battleWith({ hand: ['epoche'], school: 'rationalist' })), 100)
    const unsettle = getCardDef('epoche').unsettle ?? 0
    const once = endTurn(battle)
    expect(once.enemy.unsettle).toBe(unsettle)
    const twice = endTurn({ ...once, hand: [], focus: 0 })
    expect(twice.enemy.unsettle).toBe(unsettle)
  })

  it('Radical Doubt: Weight for each Unsettle on the enemy, this argument’s included', () => {
    const start = withFocus(battleWith({ hand: ['socratic_method', 'radical_doubt'], school: 'skeptic' }))
    const battle = playAll({ ...start, enemy: { ...start.enemy, unsettle: 4 } }, [100, 101])
    const socratic = (getCardDef('socratic_method').unsettle ?? 0) + 2
    expect(previewArgument(battle).steps[1].weight).toBe((4 + socratic) * (getCardDef('radical_doubt').weightPerUnsettle ?? 0) * 2)
  })

  it('Absurd Freedom: Weight for the Resolve you are missing', () => {
    const battle = playCard(withFocus(battleWith({ hand: ['absurd_freedom'], school: 'skeptic', resolve: 30 })), 100)
    const missing = battle.player.maxResolve - 30
    const per = getCardDef('absurd_freedom').weightPerMissingResolve ?? 0
    expect(previewArgument(battle).steps[0].weight).toBe(((getCardDef('absurd_freedom').weight ?? 0) + Math.floor(missing * per)) * 2)
  })

  it('Revolt: Guard for each Doubt in your hand', () => {
    const battle = playCard(withFocus(battleWith({ hand: ['revolt', 'doubt', 'doubt'], school: 'skeptic' })), 100)
    const def = getCardDef('revolt')
    expect(previewArgument(battle).steps[0].guard).toBe((def.guard ?? 0) + (def.guardPerDoubtInHand ?? 0) * 2)
  })
})

describe('rewards build toward a plan without forcing one', () => {
  function firstOffers(floor: 1 | 2): { own: number; total: number; crossSchool: number } {
    let own = 0
    let total = 0
    let crossSchool = 0
    for (const school of SCHOOLS) {
      for (let seed = 1; seed <= 30; seed++) {
        const run: RunState = { ...newRun(school.id, seed), floor }
        const fight = chooseNode(run, availableNodes(run)[0].id)
        const battle = fight.battle as BattleState
        const won = battleAction(fight, () => endTurn({ ...battle, enemy: { ...battle.enemy, health: 0 } }))
        const choices = won.reward?.cardChoices ?? []
        const first = getCardDef(choices[0])
        total++
        if (first.school === school.id) own++
        if (choices.some((id) => getCardDef(id).school && getCardDef(id).school !== school.id)) crossSchool++
        expect(leaveReward(skipCards(won)).screen).toBe('map')
      }
    }
    return { own, total, crossSchool }
  }

  it('floor 1 leans the first offer toward your school; later floors do not guarantee it, and other schools’ cards appear', () => {
    const one = firstOffers(1)
    expect(one.own / one.total).toBeGreaterThan(0.7)
    const two = firstOffers(2)
    expect(two.own / two.total).toBeLessThan(0.6)
    expect(two.crossSchool / two.total).toBeGreaterThan(0.3)
  })
})
