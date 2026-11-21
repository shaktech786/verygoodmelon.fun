import { describe, expect, it } from 'vitest'
import { endTurn, enemyRuleText, incomingDamage, playCard, previewArgument } from '@/lib/games/thought-pockets/engine/battle'
import { generateFloor } from '@/lib/games/thought-pockets/engine/map'
import { availableNodes, battleAction, chooseNode, newRun } from '@/lib/games/thought-pockets/engine/run'
import { seedRng } from '@/lib/games/thought-pockets/engine/rng'
import { ARROW_MIN, BURIDAN_CHARGE, BURIDAN_GUARD, ENEMIES, enemiesFor, getEnemyDef } from '@/lib/games/thought-pockets/data/enemies'
import { getCardDef } from '@/lib/games/thought-pockets/data/cards'
import { SCHOOLS } from '@/lib/games/thought-pockets/data/schools'
import { BattleState, MapNode, RunState } from '@/types/thought-pockets'
import { battleWith } from './helpers'

function playAll(battle: BattleState, uids: number[]): BattleState {
  return uids.reduce((state, uid) => playCard(state, uid), battle)
}

function phased(battle: BattleState): BattleState {
  return { ...battle, enemy: { ...battle.enemy, phase: 2, moveIndex: 0 } }
}

describe('each floor ends in one of two philosophical problems, drawn by seed', () => {
  it('every floor has two, each with its own rule and a change at half Resolve', () => {
    for (const floor of [1, 2, 3] as const) {
      const bosses = enemiesFor(floor, 'boss')
      expect(bosses, `floor ${floor}`).toHaveLength(2)
      expect(new Set(bosses.map((b) => b.rule)).size).toBe(2)
      for (const boss of bosses) {
        expect(boss.phase2, boss.id).toBeDefined()
        expect(boss.phase2?.ruleText).not.toBe(boss.ruleText)
      }
    }
  })

  it('across seeds, both problems of every floor turn up', () => {
    for (const floor of [1, 2, 3] as const) {
      const seen = new Set<string>()
      for (let seed = 1; seed <= 40; seed++) seen.add(generateFloor(floor, seedRng(seed)).nodes.find((n) => n.type === 'boss')?.enemyId as string)
      expect([...seen].sort()).toEqual(enemiesFor(floor, 'boss').map((b) => b.id).sort())
    }
  })
})

describe("Zeno's Arrow: an argument too small to move it does nothing", () => {
  it(`below ${ARROW_MIN} the argument deals 0, says why, and Unsettle still works`, () => {
    expect(getEnemyDef('zenos_arrow').ruleText).toContain(`${ARROW_MIN}`)
    const start = battleWith({ enemyId: 'zenos_arrow', hand: ['observation', 'why'], school: 'skeptic' })
    const small = playAll(start, [101, 100])
    const preview = previewArgument(small)
    expect(preview.product).toBe(8)
    expect(preview.damage).toBe(0)
    expect(preview.chain.at(-1)).toEqual({ kind: 'arrow', text: `Under ${ARROW_MIN}: the arrow does not move`, after: 0 })
    expect(preview.unsettleTick).toBe(3)
    expect(endTurn(small).enemy.health).toBe(start.enemy.health - 3)
  })

  it(`at ${ARROW_MIN} or more it lands in full, and below half Resolve any argument lands`, () => {
    const big = playAll(battleWith({ enemyId: 'zenos_arrow', hand: ['observation', 'observation', 'therefore'], school: 'skeptic' }), [100, 101, 102])
    expect(previewArgument(big).damage).toBe(previewArgument(big).product)
    const later = playCard(phased(battleWith({ enemyId: 'zenos_arrow', hand: ['observation'], school: 'skeptic' })), 100)
    expect(previewArgument(later).damage).toBe(8)
  })
})

describe("Buridan's Ass: every card you leave unplayed feeds its indecision", () => {
  it(`each card left in hand (Doubts aside) gives it ${BURIDAN_GUARD} Guard when it acts, shown before you end the turn`, () => {
    expect(getEnemyDef('buridans_ass').ruleText).toContain(`${BURIDAN_GUARD} Guard`)
    const start = battleWith({ enemyId: 'buridans_ass', hand: ['observation', 'caveat', 'caveat', 'doubt'], school: 'skeptic' })
    const battle = playCard(start, 100)
    const move = getEnemyDef('buridans_ass').moves[0]
    expect(previewArgument(battle).ruleGuard).toBe(2 * BURIDAN_GUARD)
    const after = endTurn(battle)
    expect(after.enemy.guard).toBe((move.guard ?? 0) + 2 * BURIDAN_GUARD)
    expect(after.lastRound?.ruleGuard).toBe(2 * BURIDAN_GUARD)
  })

  it(`below half Resolve it charges instead: every hit is ${BURIDAN_CHARGE} stronger for each card left`, () => {
    const start = phased(battleWith({ enemyId: 'buridans_ass', hand: ['observation', 'caveat', 'caveat'], school: 'skeptic', resolve: 999 }))
    const move = getEnemyDef('buridans_ass').phase2?.moves[0]
    const perHit = (move?.attack ?? 0) + 3 * BURIDAN_CHARGE
    expect(incomingDamage(start, 0).perHit).toBe(perHit)
    const battle = playCard(start, 100)
    expect(previewArgument({ ...battle, focus: 0 }).incoming).toBe(((move?.attack ?? 0) + 2 * BURIDAN_CHARGE) * (move?.hits ?? 1))
    expect(enemyRuleText(start)).toContain(`${BURIDAN_CHARGE} stronger`)
  })
})

describe("Newcomb's Problem: it has already predicted what you will do", () => {
  it('when it acts it raises Guard equal to half the damage your argument dealt', () => {
    const battle = playAll(battleWith({ enemyId: 'newcomb', hand: ['observation', 'observation', 'therefore'], school: 'skeptic', resolve: 999 }), [100, 101, 102])
    const preview = previewArgument(battle)
    expect(preview.ruleGuard).toBe(Math.floor(preview.damage / 2))
    const move = getEnemyDef('newcomb').moves[0]
    expect(endTurn(battle).enemy.guard).toBe((move.guard ?? 0) + Math.floor(preview.damage / 2))
  })

  it('below half Resolve it predicts your caution instead: Guard equal to half of yours', () => {
    const battle = playAll(phased(battleWith({ enemyId: 'newcomb', hand: ['caveat', 'observation'], school: 'skeptic', resolve: 999 })), [100, 101])
    const preview = previewArgument(battle)
    expect(preview.ruleGuard).toBe(Math.floor(preview.guard / 2))
    const move = getEnemyDef('newcomb').phase2?.moves[0]
    expect(endTurn(battle).enemy.guard).toBe((move?.guard ?? 0) + Math.floor(preview.guard / 2))
  })
})

describe('the run is built so builds and recovery can happen', () => {
  function enterBoss(run: RunState): RunState {
    const boss = run.map.find((n) => n.type === 'boss') as MapNode
    const before = run.map.find((n) => n.next.includes(boss.id)) as MapNode
    return chooseNode({ ...run, position: before.id, visited: [before.id] }, boss.id)
  }

  it('the floor-1 problem always offers a rare of your own school', () => {
    for (const school of SCHOOLS) {
      for (let seed = 1; seed <= 12; seed++) {
        const fighting = enterBoss(newRun(school.id, seed))
        const won = battleAction(fighting, (battle) => ({ ...battle, outcome: 'won' }))
        expect(won.reward?.source).toBe('boss')
        const first = getCardDef(won.reward?.cardChoices[0] as string)
        expect(first.rarity, `${school.id} seed ${seed}`).toBe('rare')
        expect(first.school, `${school.id} seed ${seed}`).toBe(school.id)
      }
    }
  })

  it('after every hard fight, on every floor, a rest is one of the next steps', () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const floor of [1, 2, 3] as const) {
        const nodes = generateFloor(floor, seedRng(seed)).nodes
        const elite = nodes.find((n) => n.type === 'elite') as MapNode
        const next = elite.next.map((id) => nodes.find((n) => n.id === id)?.type)
        expect(next, `seed ${seed} floor ${floor}`).toContain('rest')
      }
    }
  })

  it('every opponent can be met: each is on some floor map or is the opening fight', () => {
    const met = new Set<string>()
    for (let seed = 1; seed <= 80; seed++) {
      for (const floor of [1, 2, 3] as const) generateFloor(floor, seedRng(seed)).nodes.forEach((n) => n.enemyId && met.add(n.enemyId))
    }
    expect([...met].sort()).toEqual(ENEMIES.map((e) => e.id).sort())
    expect(availableNodes(newRun('empiricist', 1))).toHaveLength(1)
  })
})
