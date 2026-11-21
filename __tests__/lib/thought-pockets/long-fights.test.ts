import { describe, expect, it } from 'vitest'
import { canPlay, createBattle, endTurn, playCard, previewArgument, tiringUnsettle } from '@/lib/games/thought-pockets/engine/battle'
import { ENEMIES, STATUS_QUO_MAX_GUARD, getEnemyDef } from '@/lib/games/thought-pockets/data/enemies'
import { TIRING } from '@/lib/games/thought-pockets/data/pace'
import { resolveCard } from '@/lib/games/thought-pockets/data/cards'
import { defeatLine } from '@/lib/games/thought-pockets/data/defeat'
import { BattleState, CardInstance } from '@/types/thought-pockets'
import { battleWith, card } from './helpers'

const LONGEST_FIGHT = 40

function fight(enemyId: string, deck: CardInstance[], rigor = 0, rng = 1, resolve = 999): BattleState {
  return createBattle({ enemyId, deck, resolve, maxResolve: resolve, relics: [], school: 'pragmatist', rng, rigor, known: false })
}

/** Plays only Guard cards: the most a player can stall without ever arguing. */
function onlyDefend(battle: BattleState): BattleState {
  let state = battle
  for (const c of battle.hand) if (resolveCard(c).type === 'guard' && canPlay(state, c.uid)) state = playCard(state, c.uid)
  return endTurn(state)
}

/** The reviewer's newcomer: Rhetoric first, then Logic, then the lightest Evidence, with one Guard when told it will lose 6 or more. */
function newcomer(battle: BattleState): BattleState {
  let state = battle
  let guarded = false
  for (let k = 0; k < 7; k++) {
    const p = previewArgument(state)
    if (p.enemyFalls) break
    const playable = state.hand.filter((c) => canPlay(state, c.uid))
    const of = (type: string) => playable.filter((c) => resolveCard(c).type === type)
    const evidence = of('evidence').sort((a, b) => (resolveCard(a).weight ?? 0) - (resolveCard(b).weight ?? 0))
    const next = (p.incomingAfterGuard >= 6 && !guarded && of('guard')[0]) || of('rhetoric')[0] || of('logic')[0] || evidence[0] || of('guard')[0]
    if (!next) break
    if (resolveCard(next).type === 'guard') guarded = true
    state = playCard(state, next.uid)
  }
  return endTurn(state)
}

const SEED_701_DECK = [
  'observation', 'observation', 'observation', 'observation', 'caveat', 'caveat', 'caveat', 'steelman', 'measured_reply', 'measured_reply',
  'syllogism', 'breathe', 'steelman', 'meliorism', 'measured_reply', 'patience', 'breathe', 'corroboration',
].map((id, i) => card(id, i + 1))

describe('a long argument is never a hidden loss', () => {
  it('there is no turn limit: at full Resolve, a fight on its fortieth turn goes on', () => {
    const start = battleWith({ hand: [], resolve: 999 })
    const late = endTurn({ ...start, turn: 40, focus: 0 })
    expect(late.outcome).not.toBe('lost')
  })

  it(`from turn ${TIRING.gentle} in Gentle (${TIRING.rigorous} in Rigorous) the bias tires: Unsettle ${TIRING.step} more each turn`, () => {
    for (const [rigor, from] of [[0, TIRING.gentle], [3, TIRING.rigorous]]) {
      let battle = fight('status_quo', [], rigor)
      while (battle.turn < from - 1) battle = endTurn({ ...battle, enemy: { ...battle.enemy, health: 999, maxHealth: 999 } })
      expect(tiringUnsettle(battle), `rigor ${rigor} turn ${battle.turn}`).toBe(0)
      const unsettleBefore = battle.enemy.unsettle
      const first = endTurn(battle)
      expect(first.turn).toBe(from)
      expect(tiringUnsettle(first)).toBe(TIRING.step)
      expect(first.enemy.unsettle).toBe(Math.floor(unsettleBefore / 2) + TIRING.step)
      expect(tiringUnsettle(endTurn(first))).toBe(2 * TIRING.step)
    }
  })

  it(`a player who only defends still wins every fight, on every floor, within ${LONGEST_FIGHT} turns`, () => {
    const deck = ['caveat', 'caveat', 'caveat', 'patience', 'measured_reply', 'observation', 'observation'].map((id, i) => card(id, i + 1))
    for (const enemy of ENEMIES) {
      for (const rigor of [0, 7]) {
        let battle = fight(enemy.id, deck, rigor)
        while (battle.outcome === 'ongoing' && battle.turn <= LONGEST_FIGHT) battle = onlyDefend(battle)
        expect(battle.outcome, `${enemy.id} at rigor ${rigor}`).toBe('won')
      }
    }
  })

  it(`Status Quo Bias keeps its Guard, but never holds more than ${STATUS_QUO_MAX_GUARD}, and says so`, () => {
    expect(getEnemyDef('status_quo').ruleText).toContain(`${STATUS_QUO_MAX_GUARD}`)
    let battle = battleWith({ enemyId: 'status_quo', hand: [], resolve: 999 })
    for (let i = 0; i < 9; i++) {
      battle = endTurn({ ...battle, focus: 0 })
      expect(battle.enemy.guard).toBeLessThanOrEqual(STATUS_QUO_MAX_GUARD)
    }
    expect(battle.enemy.guard).toBe(STATUS_QUO_MAX_GUARD)
  })

  it('the seed-701 newcomer deck that stalled at 1 Resolve now beats Status Quo Bias in a fair number of turns', () => {
    const turns: number[] = []
    for (let rng = 1; rng <= 30; rng++) {
      let battle = fight('status_quo', SEED_701_DECK, 0, rng, 65)
      while (battle.outcome === 'ongoing' && battle.turn <= LONGEST_FIGHT) battle = newcomer(battle)
      expect(battle.outcome, `shuffle ${rng}`).toBe('won')
      turns.push(battle.turn)
    }
    expect(Math.max(...turns)).toBeLessThanOrEqual(16)
  })
})

describe('every defeat names its real cause', () => {
  it('a hit that takes the last Resolve says how much it hit for and what Guard absorbed', () => {
    const battle = battleWith({ enemyId: 'halo_effect', hand: [], resolve: 5 })
    const lost = endTurn({ ...battle, focus: 0 })
    expect(lost.outcome).toBe('lost')
    const report = lost.lastRound
    if (!report) throw new Error('no report')
    const line = defeatLine(report, getEnemyDef('halo_effect'))
    expect(line).toContain(`${report.enemyAttack}`)
    expect(line).not.toMatch(/turn/i)
  })

  it('Backfire that takes the last Resolve says it was Backfire, before the bias acts', () => {
    const start = battleWith({ enemyId: 'backfire', hand: ['observation', 'observation'], resolve: 2, school: 'skeptic' })
    const lost = endTurn(playCard(playCard(start, 100), 101))
    expect(lost.outcome).toBe('lost')
    const report = lost.lastRound
    if (!report) throw new Error('no report')
    expect(report.enemyAttack).toBe(0)
    expect(defeatLine(report, getEnemyDef('backfire'))).toMatch(/Backfire/)
  })
})
