import { describe, expect, it } from 'vitest'
import { createBattle, endTurn, enemyRuleText, playCard, previewArgument } from '@/lib/games/thought-pockets/engine/battle'
import {
  ARROW_MIN,
  CONFIRMATION_GROWTH,
  OVERFLOW,
  OVERFLOW_TEXT,
  STOP_LINES,
  SORITES_CAP,
  SUNK_COST_GROWTH,
  getEnemyDef,
  PROBLEM_RULE,
  ruleTextAt,
} from '@/lib/games/thought-pockets/data/enemies'
import { TIRING } from '@/lib/games/thought-pockets/data/pace'
import { argueLabel } from '@/lib/games/thought-pockets/data/turnText'
import { BattleState } from '@/types/thought-pockets'
import { battleWith } from './helpers'

function at(enemyId: string, rigor: number, hand: string[], health?: number): BattleState {
  const base = createBattle({ enemyId, deck: [], resolve: 60, maxResolve: 60, relics: [], school: 'rationalist', rng: 1, rigor, known: false })
  const def = getEnemyDef(enemyId)
  const enemy = health === undefined ? base.enemy : { ...base.enemy, health, maxHealth: def.health }
  return { ...base, enemy, hand: hand.map((cardId, i) => ({ uid: 100 + i, cardId, upgraded: false })), drawPile: [], discardPile: [], focus: 5 }
}

function play(battle: BattleState, count: number): BattleState {
  let state = battle
  for (let i = 0; i < count; i++) state = playCard(state, state.hand[0].uid)
  return state
}

describe("Gentle pace keeps a newcomer's fight moving", () => {
  it(`Zeno's Arrow lets ${ARROW_MIN.gentle} or more through in Gentle, ${ARROW_MIN.rigorous} in Rigorous, and its rule says which`, () => {
    expect(ARROW_MIN.gentle).toBeLessThan(ARROW_MIN.rigorous)
    const gentle = play(at('zenos_arrow', 0, ['anecdote', 'observation']), 2)
    expect(previewArgument(gentle).damage).toBe(10)
    expect(enemyRuleText(gentle)).toContain(`less than ${ARROW_MIN.gentle} damage`)
    const rigorous = play(at('zenos_arrow', 1, ['anecdote', 'observation']), 2)
    expect(previewArgument(rigorous).damage).toBe(0)
    expect(previewArgument(rigorous).chain.at(-1)).toMatchObject({ kind: 'arrow', short: `under ${ARROW_MIN.rigorous}` })
    expect(enemyRuleText(rigorous)).toContain(`less than ${ARROW_MIN.rigorous} damage`)
    expect(ruleTextAt(getEnemyDef('zenos_arrow'), 0)).toContain(`${ARROW_MIN.gentle}`)
    expect(ruleTextAt(getEnemyDef('zenos_arrow'), 3)).toContain(`${ARROW_MIN.rigorous}`)
  })

  it('a long fight starts to tire the bias from turn 7 in Gentle', () => {
    expect(TIRING.gentle).toBe(7)
    expect(createBattle({ enemyId: 'status_quo', deck: [], resolve: 60, maxResolve: 60, relics: [], school: 'skeptic', rng: 1, rigor: 0, known: false }).tiresFrom).toBe(7)
  })

  it('End turn names what the argument would deal and what stops it: "Argue for 9 → 0 (under 12)"', () => {
    const blocked = play(at('zenos_arrow', 1, ['observation', 'therefore']), 2)
    const p = previewArgument(blocked)
    expect(argueLabel(p)).toBe(`Argue for ${p.raw} → 0 (under ${ARROW_MIN.rigorous})`)
    const plain = at('jumping_to_conclusions', 0, ['observation'])
    const guarded = play({ ...plain, enemy: { ...plain.enemy, guard: 3 } }, 1)
    expect(argueLabel(previewArgument(guarded))).toBe('Argue for 8 → 5 (its Guard)')
    expect(argueLabel(previewArgument(play(at('jumping_to_conclusions', 0, ['observation']), 1)))).toBe('Argue for 8')
  })

  it('End turn shows the real number when nothing is played but Doubts or leftover Guard bring Weight', () => {
    const absurd = { ...battleWith({ hand: ['doubt', 'doubt'], school: 'absurdist' }), focus: 3 }
    const p = previewArgument(absurd)
    expect(p.steps).toHaveLength(0)
    expect(argueLabel(p)).toBe(`Argue for ${p.damage}`)
    expect(p.damage).toBeGreaterThan(0)
    const walled = { ...absurd, enemy: { ...absurd.enemy, guard: 50 } }
    expect(argueLabel(previewArgument(walled))).toBe(`Argue for ${p.damage} → 0 (its Guard)`)
    expect(argueLabel(previewArgument({ ...battleWith({ hand: ['caveat'] }), focus: 3 }))).toBe('Hold: 6 Guard')
  })
})

describe('damage a rule stops is never lost, at one stated rate', () => {
  it(`past a problem's half line or Sorites' cap it banks Shaken, 1 for every ${OVERFLOW.rate}, at most ${OVERFLOW.max} a round`, () => {
    const def = getEnemyDef('problem_of_induction')
    const half = Math.floor(def.health / 2)
    const huge = play({ ...at('problem_of_induction', 0, ['smoking_gun', 'syllogism', 'smoking_gun'], half + 1), focus: 9 }, 3)
    const p = previewArgument(huge)
    expect(p.raw - 1).toBeGreaterThan(OVERFLOW.rate * (OVERFLOW.max + 2))
    expect(p.shaken).toBe(OVERFLOW.max)
    const soritesHalf = Math.floor(getEnemyDef('sorites').health / 2)
    const sorites = play({ ...at('sorites', 0, ['smoking_gun', 'syllogism', 'smoking_gun'], soritesHalf + SORITES_CAP / 2), focus: 9 }, 3)
    const s = previewArgument(sorites)
    expect(s.unsettle).toBe(0)
    expect(s.shaken).toBe(OVERFLOW.max)
  })

  it('a philosophical problem gives ground slowly: no round takes it past three quarters, or past half, so even a huge deck needs three rounds', () => {
    const def = getEnemyDef('problem_of_induction')
    const lines = STOP_LINES.map((share) => Math.floor(def.health * share))
    const opening = play({ ...at('problem_of_induction', 0, ['smoking_gun', 'syllogism', 'smoking_gun']), focus: 9 }, 3)
    const first = previewArgument(opening)
    expect(first.damage).toBe(def.health - lines[0])
    expect(first.chain.at(-1)).toMatchObject({ kind: 'line', short: 'stops at 3/4', after: def.health - lines[0] })
    expect(first.shaken).toBe(OVERFLOW.max)
    expect(endTurn(opening).enemy.health).toBe(lines[0])
    const changed = play({ ...at('problem_of_induction', 0, ['smoking_gun', 'syllogism', 'smoking_gun'], lines[1]), enemy: { ...at('problem_of_induction', 0, [], lines[1]).enemy, phase: 2 }, focus: 9 }, 3)
    expect(previewArgument(changed).enemyFalls).toBe('argument')
    const second = play({ ...at('problem_of_induction', 0, ['smoking_gun', 'syllogism', 'smoking_gun'], lines[0]), focus: 9 }, 3)
    expect(previewArgument(second).chain.at(-1)?.kind).toBe('half')
    expect(previewArgument(second).damage).toBe(lines[0] - lines[1])
    expect(PROBLEM_RULE).toContain('three quarters')
    expect(PROBLEM_RULE).toContain(OVERFLOW_TEXT)
  })

  it('the rate is stated where each rule is stated, from the same constants', () => {
    expect(OVERFLOW_TEXT).toBe(
      `Anything past it shakes it: 1 Shaken for every ${OVERFLOW.rate} (at most ${OVERFLOW.max} a round). When it changes, all its Shaken takes that much Resolve at once, and half of it stays as Unsettle for the next turn.`,
    )
    expect(getEnemyDef('sorites').ruleText).toContain(OVERFLOW_TEXT)
    for (const text of [getEnemyDef('sorites').ruleText, OVERFLOW_TEXT]) {
      const rates = [...text.matchAll(/1 for every (\d+)/g)].map((m) => Number(m[1]))
      expect(rates.every((r) => r === OVERFLOW.rate)).toBe(true)
    }
  })
})

describe('Rigorous growth is honest about its size', () => {
  it(`Sunk Cost grows ${SUNK_COST_GROWTH} each time it acts; Confirmation Bias's second rule only ${CONFIRMATION_GROWTH}, and each says so`, () => {
    expect(CONFIRMATION_GROWTH).toBeLessThan(SUNK_COST_GROWTH)
    expect(getEnemyDef('sunk_cost').ruleText).toContain(`grow by ${SUNK_COST_GROWTH}`)
    expect(getEnemyDef('confirmation_bias').secondRule?.ruleText).toContain(`grow by ${CONFIRMATION_GROWTH}`)
    const confirmation = createBattle({ enemyId: 'confirmation_bias', deck: [], resolve: 99, maxResolve: 99, relics: [], school: 'empiricist', rng: 1, rigor: 6, known: false })
    expect(endTurn({ ...confirmation, focus: 0 }).enemy.strength - confirmation.enemy.strength).toBe(CONFIRMATION_GROWTH)
    const sunk = createBattle({ enemyId: 'sunk_cost', deck: [], resolve: 99, maxResolve: 99, relics: [], school: 'empiricist', rng: 1, rigor: 0, known: false })
    expect(endTurn({ ...sunk, focus: 0 }).enemy.strength - sunk.enemy.strength).toBe(SUNK_COST_GROWTH)
  })
})

describe('The Long View is counted in the held-Focus line', () => {
  it('Focus the relic carries forward is reported apart from the Focus that becomes Guard', () => {
    const battle = { ...battleWith({ hand: [], relics: ['long_view'] }), focus: 4 }
    const p = previewArgument(battle)
    expect(p.focusCarried).toBe(2)
    expect(p.heldFocus).toBe(2)
    expect(p.composure).toBe(4)
  })
})
