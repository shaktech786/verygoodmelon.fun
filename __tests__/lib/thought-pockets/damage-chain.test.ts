import { describe, expect, it } from 'vitest'
import { endTurn, playCard, previewArgument } from '@/lib/games/thought-pockets/engine/battle'
import { MEANING_ANSWER, OVERFLOW, OVERFLOW_TEXT, SORITES_CAP, getEnemyDef, overflowUnsettle } from '@/lib/games/thought-pockets/data/enemies'
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
    const grains = overflowUnsettle(afterGuard - SORITES_CAP)
    expect(preview.chain.map((s) => s.after)).toEqual([afterGuard, SORITES_CAP, 10])
    expect(preview.chain[1].text).toBe(`Capped at ${SORITES_CAP}: the extra ${afterGuard - SORITES_CAP} shakes it: Shaken +${grains}`)
    expect(preview.damage).toBe(10)
    const spill = overflowUnsettle(SORITES_CAP - 10, grains)
    expect(preview.shaken).toBe(grains + spill)
    expect(preview.chain[2].text).toBe(`It stops at ${half} and changes. Your extra ${SORITES_CAP - 10} shakes it: Shaken +${spill}`)
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

describe('pushing a philosophical problem past a line is not lost: it shakes it', () => {
  it(`every ${OVERFLOW.rate} past the line banks 1 Shaken, at most ${OVERFLOW.max}, and the problem changing lands it all at once`, () => {
    const start = battleWith({ enemyId: 'meaning_of_life', hand: ['smoking_gun'], school: 'skeptic', resolve: 999 })
    const half = Math.floor(start.enemy.maxHealth / 2)
    const banked = 3
    const battle = playCard({ ...start, focus: 3, enemy: { ...start.enemy, health: half + 2, shaken: banked } }, 100)
    const preview = previewArgument(battle)
    const overflow = preview.raw - 2
    expect(preview.damage).toBe(2)
    expect(preview.shaken).toBe(Math.min(OVERFLOW.max, Math.floor(overflow / OVERFLOW.rate)))
    expect(preview.released).toBe(banked + preview.shaken)
    const after = endTurn(battle)
    expect(after.enemy.phase).toBe(2)
    expect(after.enemy.health).toBe(half - preview.released)
    expect(after.enemy.shaken).toBe(0)
    expect(after.enemy.unsettle).toBe(Math.floor(preview.released / 2))
    expect(after.lastRound?.released).toBe(preview.released)
    expect(after.lastRound?.shaken).toBe(preview.shaken)
  })

  it('stopped at three quarters, the Shaken waits in the bank and does not tick until the problem changes', () => {
    const start = battleWith({ enemyId: 'problem_of_induction', hand: ['smoking_gun', 'syllogism'], school: 'skeptic', resolve: 999 })
    const battle = playAll({ ...start, focus: 9 }, [100, 101])
    const preview = previewArgument(battle)
    expect(preview.chain.at(-1)?.kind).toBe('line')
    expect(preview.shaken).toBeGreaterThan(0)
    expect(preview.released).toBe(0)
    const after = endTurn(battle)
    expect(after.enemy.phase).toBe(1)
    expect(after.enemy.shaken).toBe(preview.shaken)
    expect(after.enemy.unsettle).toBe(0)
    expect(after.lastRound?.released).toBe(0)
  })

  it(`The Sorites Paradox caps one argument at ${SORITES_CAP}, and its rule says so`, () => {
    expect(getEnemyDef('sorites').ruleText).toContain(`${SORITES_CAP} damage`)
    expect(getEnemyDef('sorites').ruleText).toContain(OVERFLOW_TEXT)
  })
})
