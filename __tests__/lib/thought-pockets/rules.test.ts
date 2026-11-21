import { describe, expect, it } from 'vitest'
import { COMPOSURE_GUARD, currentMove, endTurn, playCard, previewArgument } from '@/lib/games/thought-pockets/engine/battle'
import { MEANING_ANSWER, getEnemyDef } from '@/lib/games/thought-pockets/data/enemies'
import { CARDS, describeCard, getCardDef, resolveCard } from '@/lib/games/thought-pockets/data/cards'
import { KEYWORDS } from '@/lib/games/thought-pockets/data/keywords'
import { BattleState, CardEffects } from '@/types/thought-pockets'
import { battleWith, card } from './helpers'

function playAll(battle: BattleState, uids: number[]): BattleState {
  return uids.reduce((state, uid) => playCard(state, uid), battle)
}

describe('a round resolves in order: your argument, then Unsettle, then the bias acts', () => {
  it('Unsettle that finishes the bias stops it acting, so a win never leaves you at 0 (regression: won at 0, then lost the next fight)', () => {
    const start = battleWith({ hand: [], resolve: 1 })
    const battle = { ...start, focus: 0, enemy: { ...start.enemy, health: 5, unsettle: 5 } }
    const preview = previewArgument(battle)
    expect(preview.enemyFalls).toBe('unsettle')
    expect(preview.unsettleTick).toBe(5)
    expect(preview.incomingAfterGuard).toBe(0)
    const after = endTurn(battle)
    expect(after.outcome).toBe('won')
    expect(after.player.resolve).toBe(1)
    expect(after.lastRound?.enemyAttack).toBe(0)
  })

  it('a win always leaves at least 1 Resolve, even when Backfire stings on the finishing argument', () => {
    const start = battleWith({ enemyId: 'backfire', hand: ['observation', 'therefore', 'concede'], resolve: 2, school: 'skeptic' })
    const battle = playAll({ ...start, enemy: { ...start.enemy, health: 3 } }, [100, 101, 102])
    expect(previewArgument(battle).enemyFalls).toBe('argument')
    const after = endTurn(battle)
    expect(after.outcome).toBe('won')
    expect(after.player.resolve).toBe(1)
  })

  it('Unsettle ticks before the bias acts, then halves', () => {
    const start = battleWith({ hand: [] })
    const battle = { ...start, focus: 0, enemy: { ...start.enemy, unsettle: 8 } }
    const once = endTurn(battle)
    expect(once.lastRound?.unsettleLoss).toBe(8)
    expect(once.enemy.health).toBe(start.enemy.health - 8)
    expect(once.enemy.unsettle).toBe(4)
    const twice = endTurn({ ...once, hand: [], focus: 0 })
    expect(twice.enemy.health).toBe(start.enemy.health - 12)
    expect(twice.enemy.unsettle).toBe(2)
  })

  it('Unsettle from this argument is part of the preview and the warning', () => {
    const start = battleWith({ hand: ['socratic_method'], school: 'rationalist', resolve: 1 })
    const battle = playCard({ ...start, enemy: { ...start.enemy, health: 4 } }, 100)
    const preview = previewArgument(battle)
    expect(preview.enemyFalls).toBe('unsettle')
    expect(preview.incomingAfterGuard).toBe(0)
    expect(endTurn(battle).outcome).toBe('won')
  })
})

describe('every text matches what happens', () => {
  it('a Conclusion with nothing to double says so instead of claiming it counts twice', () => {
    const battle = playAll(battleWith({ hand: ['observation', 'caveat'], school: 'skeptic' }), [100, 101])
    const preview = previewArgument(battle)
    expect(preview.conclusionEmpty).toBe(true)
    expect(preview.steps.at(-1)?.notes).toContain('Conclusion: nothing to double')
    expect(preview.steps.at(-1)?.notes).not.toContain('Conclusion: counts twice')
    const marginal = playAll(battleWith({ hand: ['observation', 'caveat'], relics: ['marginalia'], school: 'skeptic' }), [100, 101])
    expect(previewArgument(marginal).conclusionEmpty).toBe(false)
  })

  it(`holding back: each unspent Focus is ${COMPOSURE_GUARD} Guard, and Focus The Long View carries is not also Guard`, () => {
    expect(previewArgument(battleWith({ hand: [] })).composure).toBe(3 * COMPOSURE_GUARD)
    const viewed = battleWith({ hand: [], relics: ['long_view'] })
    expect(previewArgument(viewed).composure).toBe(1 * COMPOSURE_GUARD)
    expect(endTurn(viewed).focus).toBe(5)
  })

  it('Postpone: the bias skips its action, its plan waits and its Guard stays, as the keyword says', () => {
    expect(KEYWORDS.Postpone).toMatch(/Guard stays/)
    const start = battleWith({ hand: ['pause'] })
    const after = endTurn(playCard({ ...start, focus: 3, enemy: { ...start.enemy, guard: 8 } }, 100))
    expect(after.enemy.guard).toBe(8)
    expect(after.enemy.moveIndex).toBe(0)
  })

  it('the keywords state the rules and numbers the engine uses', () => {
    expect(KEYWORDS.Unsettle).toMatch(/before it acts/)
    expect(KEYWORDS.Unsettle).toMatch(/halves/)
    expect(KEYWORDS.Focus).toContain(`${COMPOSURE_GUARD} Guard`)
  })

  it('every effect on every card appears in its text, and nothing else does', () => {
    const phrases: [keyof CardEffects, RegExp][] = [
      ['weight', /^\+\d+ Weight\.$/],
      ['multiplier', /^\+[\d.]+ Multiplier\.$/],
      ['guard', /^\d+ Guard\.$/],
      ['unsettle', /^Unsettle \d+\.$/],
      ['draw', /^Draw \d+ cards?\.$/],
      ['focus', /^Gain \d+ Focus\.$/],
      ['restore', /^Restore \d+ Resolve\.$/],
      ['retain', /^Keep\.$/],
      ['exhaust', /^Once\.$/],
      ['lastingMultiplier', /^For the rest of this fight, every argument gets \+[\d.]+ Multiplier\.$/],
      ['nextTurnFocus', /^Next turn, gain \d+ Focus\.$/],
      ['weightPerEarlierEvidence', /^\+\d+ Weight for each Evidence you played earlier in this fight\.$/],
      ['conclusionBonus', /^While this is in your argument, your Conclusion counts (one more time|\d+ more times)\.$/],
      ['guardPerEvidence', /^\+\d+ Guard for each Evidence in this argument\.$/],
      ['weightPerGuard', /^\+1 Weight for (every \d+|each) Guard your cards give in this argument\.$/],
      ['lastingRestore', /^For the rest of this fight, restore \d+ Resolve after each round in which you lose none\.$/],
      ['multiplierPerEarlierCard', /^\+[\d.]+ Multiplier for each card played before it in this argument\.$/],
      ['multiplierPerDoubtInHand', /^\+[\d.]+ Multiplier for each Doubt in your hand\.$/],
      ['unsettleLasts', /^For the rest of this fight, the enemy’s Unsettle no longer halves\.$/],
      ['weightPerUnsettle', /^\+\d+ Weight for each Unsettle on the enemy, this argument’s included\.$/],
      ['weightPerMissingResolve', /^\+1 Weight for every \d+ Resolve you are missing\.$/],
      ['guardPerDoubtInHand', /^\+\d+ Guard for each Doubt in your hand\.$/],
    ]
    for (const def of CARDS.flatMap((c) => [resolveCard({ cardId: c.id, upgraded: false }), resolveCard({ cardId: c.id, upgraded: true })])) {
      const lines = describeCard(def)
      for (const [field, pattern] of phrases) {
        const present = Boolean(def[field])
        expect(lines.some((line) => pattern.test(line)), `${def.name}: ${String(field)}`).toBe(present)
      }
    }
  })
})

describe('cards that reach across turns', () => {
  it('Keep: an unplayed Keep card stays in your hand for the next turn, on top of a full draw', () => {
    const start = battleWith({ hand: ['working_hypothesis', 'observation'] })
    const deck = Array.from({ length: 8 }, (_, i) => card('observation', 300 + i))
    const after = endTurn({ ...start, drawPile: deck })
    expect(after.hand.map((c) => c.cardId)).toContain('working_hypothesis')
    expect(after.hand).toHaveLength(6)
    expect(after.discardPile.map((c) => c.cardId)).toEqual(['observation'])
  })

  it('Once: a played Once card is gone for the rest of the fight', () => {
    const battle = playCard(battleWith({ hand: ['eureka'] }), 100)
    expect(battle.focus).toBe(3 + (getCardDef('eureka').focus ?? 0))
    const after = endTurn(battle)
    expect(after.exhausted.map((c) => c.cardId)).toEqual(['eureka'])
    expect([...after.hand, ...after.drawPile, ...after.discardPile].some((c) => c.cardId === 'eureka')).toBe(false)
  })

  it('for the rest of this fight: a lasting Multiplier applies to this argument and every later one, and undo takes it back', () => {
    const battle = playAll({ ...battleWith({ hand: ['observation', 'first_premise'], school: 'skeptic' }), focus: 3 }, [100, 101])
    const bonus = getCardDef('first_premise').lastingMultiplier ?? 0
    expect(previewArgument(battle).multiplier).toBe(1 + bonus)
    const next = endTurn(battle)
    const again = playCard({ ...next, hand: [card('observation', 400)] }, 400)
    expect(previewArgument(again).multiplier).toBe(1 + bonus)
    expect(previewArgument(playCard(battleWith({ hand: ['first_premise'] }), 100)).multiplier).toBe(1 + bonus)
  })

  it('next turn, gain Focus', () => {
    const battle = playCard(battleWith({ hand: ['sleep_on_it'] }), 100)
    expect(endTurn(battle).focus).toBe(3 + (getCardDef('sleep_on_it').nextTurnFocus ?? 0))
  })
})

describe('bosses change at half Resolve, after the round they were in', () => {
  function nearHalf(enemyId: string): BattleState {
    const start = battleWith({ enemyId, hand: ['observation'], school: 'skeptic' })
    const half = Math.floor(start.enemy.maxHealth / 2)
    return playCard({ ...start, enemy: { ...start.enemy, health: half + 4 } }, 100)
  }

  it('The Problem of Induction: below half, its pattern breaks and a new one starts', () => {
    const def = getEnemyDef('problem_of_induction')
    const after = endTurn(nearHalf('problem_of_induction'))
    expect(after.enemy.phase).toBe(2)
    expect(after.lastRound?.phaseChanged).toBe(true)
    expect(currentMove(after)).toEqual(def.phase2?.moves[0])
    expect(after.lastRound?.enemyAttack).toBe(def.moves[0].attack)
  })

  it('The Sorites Paradox: below half, the cap is gone', () => {
    const start = battleWith({ enemyId: 'sorites', hand: ['smoking_gun'] })
    const phased = { ...start, focus: 3, enemy: { ...start.enemy, phase: 2 as const, moveIndex: 0 } }
    expect(previewArgument(playCard(phased, 100)).damage).toBe(24)
  })

  it('The Meaning of Life: below half, it asks for two types and only both answer it', () => {
    const start = battleWith({ enemyId: 'meaning_of_life', hand: ['observation', 'therefore'], school: 'skeptic' })
    const phased = { ...start, enemy: { ...start.enemy, phase: 2 as const, moveIndex: 0 } }
    const asks = currentMove(phased).asks ?? []
    expect(asks).toEqual(['evidence', 'logic'])
    expect(previewArgument(playCard(phased, 100)).raw).toBe(8)
    expect(previewArgument(playAll(phased, [100, 101])).raw).toBe(8 + MEANING_ANSWER)
  })
})

describe('a philosophical problem cannot be argued past half Resolve in one round', () => {
  const half = (enemyId: string) => Math.floor(getEnemyDef(enemyId).health / 2)

  it('an argument that would carry it past half stops there, says so, and the problem changes', () => {
    const start = battleWith({ enemyId: 'meaning_of_life', hand: ['smoking_gun'], school: 'skeptic' })
    const battle = playCard({ ...start, focus: 3, enemy: { ...start.enemy, health: half('meaning_of_life') + 10 } }, 100)
    const preview = previewArgument(battle)
    expect(preview.raw).toBeGreaterThan(10)
    expect(preview.damage).toBe(10)
    expect(preview.modifiers.some((m) => m.includes('half'))).toBe(true)
    const after = endTurn(battle)
    expect(after.enemy.health).toBe(half('meaning_of_life'))
    expect(after.enemy.phase).toBe(2)
  })

  it('Unsettle stops at half too, and in its second phase nothing is held back', () => {
    const start = battleWith({ enemyId: 'problem_of_induction', hand: [] })
    const unsettled = { ...start, focus: 0, enemy: { ...start.enemy, health: half('problem_of_induction') + 3, unsettle: 12 } }
    expect(previewArgument(unsettled).unsettleTick).toBe(3)
    const landed = playCard({ ...battleWith({ enemyId: 'meaning_of_life', hand: ['smoking_gun'], school: 'skeptic' }), focus: 3 }, 100)
    const atEdge = { ...landed, enemy: { ...landed.enemy, health: half('meaning_of_life') + 5, unsettle: 40 } }
    expect(previewArgument(atEdge).unsettleTick).toBe(0)
    expect(endTurn(atEdge).enemy.health).toBe(half('meaning_of_life'))
    const phased = playCard({ ...battleWith({ enemyId: 'meaning_of_life', hand: ['smoking_gun'], school: 'skeptic' }), focus: 3 }, 100)
    const second = { ...phased, enemy: { ...phased.enemy, phase: 2 as const, health: 30 } }
    expect(previewArgument(second).damage).toBe(previewArgument(second).raw)
  })

  it('the review’s combo (Rationalist, Ockham’s Razor, Syllogism+ then Observation+) needs at least four rounds for The Meaning of Life', () => {
    const start = battleWith({ enemyId: 'meaning_of_life', school: 'rationalist', relics: ['ockhams_razor'], resolve: 999 })
    const combo = [card('syllogism', 300, true), card('observation', 301, true)]
    let battle: BattleState = start
    let rounds = 0
    while (battle.outcome === 'ongoing' && rounds < 12) {
      const turn = { ...battle, hand: combo, focus: 3 }
      battle = endTurn(playAll(turn, [300, 301]))
      rounds++
    }
    expect(battle.outcome).toBe('won')
    expect(rounds).toBeGreaterThanOrEqual(4)
  })
})

describe("Gambler's Fallacy teaches that the odds have no memory", () => {
  it('every round has the same shown chance of the big hit, however long since the last', () => {
    const def = getEnemyDef('gamblers_fallacy')
    const gamble = def.gamble as { chance: number; attack: number }
    let afterMisses = 0
    let afterMissesHits = 0
    let rounds = 0
    let hits = 0
    for (let seed = 1; seed <= 300; seed++) {
      let battle = battleWith({ enemyId: 'gamblers_fallacy', hand: [], resolve: 999, rng: seed })
      for (let turn = 0; turn < 8; turn++) {
        const misses = battle.enemy.misses
        const hit = battle.enemy.gambleHit
        rounds++
        if (hit) hits++
        if (misses >= 3) {
          afterMisses++
          if (hit) afterMissesHits++
        }
        battle = endTurn({ ...battle, hand: [], focus: 0 })
        expect(battle.lastRound?.enemyAttack).toBe(hit ? gamble.attack : currentMoveAttack(def, turn))
      }
    }
    expect(Math.abs(hits / rounds - gamble.chance)).toBeLessThan(0.05)
    expect(Math.abs(afterMissesHits / afterMisses - gamble.chance)).toBeLessThan(0.07)
  })

  it('the preview shows the usual action and the risk, without giving the roll away', () => {
    const def = getEnemyDef('gamblers_fallacy')
    const battle = battleWith({ enemyId: 'gamblers_fallacy', hand: [] })
    const hit = { ...battle, focus: 0, enemy: { ...battle.enemy, gambleHit: true } }
    const miss = { ...battle, focus: 0, enemy: { ...battle.enemy, gambleHit: false } }
    expect(previewArgument(hit)).toEqual(previewArgument(miss))
    expect(previewArgument(hit).risk?.total).toBe(def.gamble?.attack)
  })
})

function currentMoveAttack(def: ReturnType<typeof getEnemyDef>, turn: number): number {
  return def.moves[turn % def.moves.length].attack ?? 0
}
