import { describe, expect, it } from 'vitest'
import { endTurn, playCard, previewArgument } from '@/lib/games/thought-pockets/engine/battle'
import { MEANING_ANSWER, PHASE_SPILL, SORITES_CAP, SORITES_GRAIN, getEnemyDef } from '@/lib/games/thought-pockets/data/enemies'
import { BattleState } from '@/types/thought-pockets'
import { battleWith } from './helpers'

function playAll(battle: BattleState, uids: number[]): BattleState {
  return uids.reduce((state, uid) => playCard(state, uid), battle)
}

describe('damage is shown in the order the engine applies it', () => {
  it('Sorites near half Resolve, behind Guard: Guard first, then its cap, then the half-Resolve line', () => {
    const start = battleWith({ enemyId: 'sorites', hand: ['smoking_gun', 'observation'], school: 'skeptic', resolve: 999 })
    const half = Math.floor(start.enemy.maxHealth / 2)
    const battle = playAll({ ...start, focus: 4, enemy: { ...start.enemy, guard: 3, health: half + 10 } }, [101, 100])
    const preview = previewArgument(battle)
    const raw = preview.product
    expect(preview.chain.map((s) => s.kind)).toEqual(['guard', 'cap', 'half'])
    const afterGuard = raw - 3
    const grains = Math.floor((afterGuard - SORITES_CAP) / SORITES_GRAIN)
    expect(preview.chain.map((s) => s.after)).toEqual([afterGuard, SORITES_CAP, 10])
    expect(preview.chain[1].text).toBe(`Capped at ${SORITES_CAP}: the rest becomes Unsettle ${grains}`)
    expect(preview.damage).toBe(10)
    const spill = Math.floor((SORITES_CAP - 10) / PHASE_SPILL)
    expect(preview.spill).toBe(spill)
    expect(preview.chain[2].text).toBe(`It stops at ${half} and changes. Your extra ${SORITES_CAP - 10} shakes it: Unsettle +${spill}`)
    expect(endTurn(battle).lastRound?.chain).toEqual(preview.chain)
  })

  it('The Meaning of Life: its answer bonus comes before the Guard that absorbs it', () => {
    const start = battleWith({ enemyId: 'meaning_of_life', hand: ['observation'], school: 'skeptic', resolve: 999 })
    const battle = playCard({ ...start, enemy: { ...start.enemy, guard: 5 } }, 100)
    const preview = previewArgument(battle)
    expect(preview.chain.map((s) => s.kind)).toEqual(['answer', 'guard'])
    expect(preview.chain.map((s) => s.after)).toEqual([8 + MEANING_ANSWER, 8 + MEANING_ANSWER - 5])
    expect(preview.damage).toBe(preview.chain.at(-1)?.after)
  })

  it('every step’s value follows from the one before, for every enemy, ending at the damage dealt', () => {
    for (const enemyId of ['sorites', 'meaning_of_life', 'problem_of_induction', 'zenos_arrow', 'buridans_ass', 'newcomb']) {
      const start = battleWith({ enemyId, hand: ['smoking_gun', 'therefore'], school: 'skeptic', resolve: 999 })
      const battle = playAll({ ...start, focus: 4, enemy: { ...start.enemy, guard: 4 } }, [101, 100])
      const preview = previewArgument(battle)
      expect(preview.chain.at(-1)?.after ?? preview.product, enemyId).toBe(preview.damage)
    }
  })
})

describe('pushing a philosophical problem past half Resolve is not lost: it shakes it', () => {
  it(`every ${PHASE_SPILL} past the line becomes 1 Unsettle, which takes its toll next round`, () => {
    const start = battleWith({ enemyId: 'meaning_of_life', hand: ['smoking_gun'], school: 'skeptic', resolve: 999 })
    const half = Math.floor(start.enemy.maxHealth / 2)
    const battle = playCard({ ...start, focus: 3, enemy: { ...start.enemy, health: half + 2 } }, 100)
    const preview = previewArgument(battle)
    const overflow = preview.raw - 2
    expect(preview.damage).toBe(2)
    expect(preview.spill).toBe(Math.floor(overflow / PHASE_SPILL))
    const after = endTurn(battle)
    expect(after.enemy.health).toBe(half)
    expect(after.enemy.phase).toBe(2)
    expect(after.enemy.unsettle).toBe(preview.spill)
    expect(after.lastRound?.spill).toBe(preview.spill)
    expect(previewArgument({ ...after, focus: 0 }).unsettleTick).toBe(preview.spill)
  })

  it(`The Sorites Paradox caps one argument at ${SORITES_CAP}, and its rule says so`, () => {
    expect(getEnemyDef('sorites').ruleText).toContain(`${SORITES_CAP} damage`)
    expect(getEnemyDef('sorites').ruleText).toContain(`Every ${SORITES_GRAIN}`)
  })
})
