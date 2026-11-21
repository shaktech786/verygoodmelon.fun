import { describe, expect, it } from 'vitest'
import {
  CONCLUSION_TIMES,
  EMPIRICIST_EVIDENCE_TIMES,
  timesWord,
} from '@/lib/games/thought-pockets/data/conclusion'
import { createBattle, endTurn, playCard, previewArgument, stopLine, tiringUnsettle } from '@/lib/games/thought-pockets/engine/battle'
import {
  availableNodes,
  bossOptions,
  chooseNode,
  holdsNothingBack,
  migrateRun,
  newRun,
  nodesAhead,
  relicMatters,
  standing,
} from '@/lib/games/thought-pockets/engine/run'
import { generateFloor } from '@/lib/games/thought-pockets/engine/map'
import { seedRng } from '@/lib/games/thought-pockets/engine/rng'
import {
  ARROW_MIN,
  ARROW_RIGOROUS_TIRING,
  ARROW_TIRES,
  CATASTROPHE,
  OPENERS,
  OVERFLOW,
  RUMINATION_STEP,
  SHORT_WALK_GUESTS,
  SHORT_WALK_PROBLEMS,
  SLOW_GROUND_TEXT,
  TUTORIAL_ENEMY,
  enemiesFor,
  fullRuleText,
  getEnemyDef,
  givesGroundSlowly,
  releaseLeftover,
} from '@/lib/games/thought-pockets/data/enemies'
import { getRelicDef } from '@/lib/games/thought-pockets/data/relics'
import { STANDING_WORDS } from '@/lib/games/thought-pockets/data/mapText'
import { finalRoundWords, releaseWords } from '@/lib/games/thought-pockets/data/turnText'
import { SHORT_WALK_BOSS, TIRING } from '@/lib/games/thought-pockets/data/pace'
import { EMBLEMS } from '@/app/games/thought-pockets/components/Sprites'
import { BattleState, MapNode, RunState } from '@/types/thought-pockets'
import { battleWith } from './helpers'

function playAll(battle: BattleState, uids: number[]): BattleState {
  return uids.reduce((state, uid) => playCard(state, uid), battle)
}

/** A Gentle problem standing just above its 3/4 line, so an argument of `value` passes it by `value - room`. */
function pastTheLine(room: number, hand: string[], shaken = 0): BattleState {
  const start = battleWith({ enemyId: 'problem_of_induction', hand, school: 'skeptic', resolve: 999 })
  const line = Math.floor(start.enemy.maxHealth * 0.75)
  return { ...start, focus: 9, enemy: { ...start.enemy, health: line + room, shaken } }
}

describe('what the text says is what the engine does', () => {
  it('an extra that banks no Shaken is "lost", with the reason; only a real gain "shakes it"', () => {
    const two = playAll(pastTheLine(11, ['observation', 'observation']), [100, 101])
    const one = previewArgument(two)
    expect(one.raw - 11).toBe(1)
    expect(one.shaken).toBe(0)
    expect(one.chain.at(-1)?.text).toBe(`It stops at ${stopLine(two)}, three quarters of its Resolve. Your extra 1 is lost (1 Shaken for every ${OVERFLOW.rate})`)
    expect(one.chain.at(-1)?.text).not.toContain('shakes')

    const four = previewArgument(playAll(pastTheLine(8, ['observation', 'observation']), [100, 101]))
    expect(four.shaken).toBe(2)
    expect(four.chain.at(-1)?.text).toContain('Your extra 4 shakes it: Shaken +2')
  })

  it('a Shaken that is already full for the round says the extra is lost because of the round cap', () => {
    const start = battleWith({ enemyId: 'sorites', hand: ['smoking_gun', 'syllogism', 'observation'], school: 'skeptic', resolve: 999 })
    const half = Math.floor(start.enemy.maxHealth / 2)
    const battle = playAll({ ...start, focus: 9, enemy: { ...start.enemy, health: half + 4 } }, [102, 101, 100])
    const preview = previewArgument(battle)
    expect(preview.chain.map((s) => s.kind)).toEqual(['cap', 'half'])
    expect(preview.chain[0].text).toMatch(/^Capped at 20: the extra \d+ shakes it: Shaken \+5$/)
    expect(preview.chain[1].text).toBe(`It stops at ${half} and changes. Your extra 16 is lost (at most ${OVERFLOW.max} Shaken a round)`)
    expect(preview.shaken).toBe(OVERFLOW.max)
  })

  it('a Shaken release says it takes its toll at once and leaves half as Unsettle for the next turn, as the engine does', () => {
    expect(releaseWords(10)).toBe('−10 Resolve at once, and Unsettle +5 for next turn')
    expect(releaseWords(1)).toBe('−1 Resolve at once')
    const start = battleWith({ enemyId: 'problem_of_induction', hand: ['observation'], school: 'skeptic', resolve: 999 })
    const half = Math.floor(start.enemy.maxHealth / 2)
    const battle = playCard({ ...start, focus: 3, enemy: { ...start.enemy, health: half + 2, shaken: 10 } }, 100)
    const after = endTurn(battle)
    expect(after.lastRound?.released).toBe(10 + (previewArgument(battle).shaken))
    const released = after.lastRound?.released as number
    expect(after.enemy.health).toBe(half - released)
    expect(after.enemy.unsettle).toBe(releaseLeftover(released))
  })

  it('the round that ended a fight is introduced by what really ended it', () => {
    const unsettled = battleWith({ enemyId: 'jumping_to_conclusions' })
    const byUnsettle = endTurn({ ...unsettled, focus: 0, enemy: { ...unsettled.enemy, health: 3, unsettle: 6 } })
    expect(byUnsettle.outcome).toBe('won')
    const quiet = finalRoundWords(byUnsettle.lastRound as NonNullable<BattleState['lastRound']>)
    expect(quiet.title).toBe('Unsettle had the last word')
    expect(quiet.noArgument).toBe('You made no argument this round: Unsettle 3 took the last of its Resolve.')

    const hand = battleWith({ enemyId: 'jumping_to_conclusions', hand: ['observation'] })
    const byArgument = endTurn(playCard({ ...hand, enemy: { ...hand.enemy, health: 4 } }, 100))
    expect(finalRoundWords(byArgument.lastRound as NonNullable<BattleState['lastRound']>).title).toBe('Your winning argument')

    const both = endTurn(playCard({ ...hand, enemy: { ...hand.enemy, health: 10, unsettle: 6 } }, 100))
    expect(both.outcome).toBe('won')
    expect(finalRoundWords(both.lastRound as NonNullable<BattleState['lastRound']>).title).toBe(`Your argument, then Unsettle ${both.lastRound?.unsettleLoss}, finished it`)
  })

  it('the map calls a fight you passed "behind you", and only a fight on another path "not on your path"', () => {
    const run = newRun('empiricist', 31)
    const first = availableNodes(run)[0]
    const atStart: RunState = { ...run, position: first.id, visited: [first.id] }
    expect(standing(atStart, first.id)).toBe('behind')
    const next = availableNodes({ ...atStart, screen: 'map' })[0]
    const moved: RunState = { ...atStart, position: next.id, visited: [first.id, next.id] }
    const sameRow = moved.map.filter((n) => n.row === next.row && n.id !== next.id)
    for (const node of sameRow) expect(standing(moved, node.id)).toBe('behind')
    const ahead = new Set(nodesAhead(moved).map((n) => n.id))
    for (const node of moved.map.filter((n) => n.row > next.row)) expect(standing(moved, node.id)).toBe(ahead.has(node.id) ? 'ahead' : 'elsewhere')
    expect(STANDING_WORDS).toEqual({ behind: 'Behind you.', elsewhere: 'Not on your path.' })
  })
})

describe('no dead relic offers', () => {
  function shortWalkBefore(type: MapNode['type'], seed: number): RunState {
    const run = newRun('empiricist', seed, 'gentle', [], undefined, 'short')
    const node = run.map.find((n) => n.type === type) as MapNode
    return { ...run, position: node.id, visited: [node.id] }
  }

  it('on the last floor, Library Card needs a shop still ahead and Tea Flask a fight before the end', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const beforeBoss = shortWalkBefore('rest', seed)
      expect(nodesAhead(beforeBoss).map((n) => n.type)).toEqual(['boss'])
      expect(relicMatters(beforeBoss, 'library_card')).toBe(false)
      expect(relicMatters(beforeBoss, 'tea_flask')).toBe(false)
      expect(relicMatters(beforeBoss, 'pocket_notebook')).toBe(false)
      expect(relicMatters(beforeBoss, 'seed_of_doubt')).toBe(true)
      const long = { ...beforeBoss, length: 'long' as const }
      expect(relicMatters(long, 'library_card')).toBe(true)
      expect(relicMatters(long, 'tea_flask')).toBe(true)
    }
  })

  it('a treasure right before the last stretch never offers what cannot matter', () => {
    for (let seed = 1; seed <= 120; seed++) {
      const run = newRun('empiricist', seed, 'gentle', [], undefined, 'short')
      const treasure = run.map.find((n) => n.type === 'treasure') as MapNode
      const before = run.map.find((n) => n.next.includes(treasure.id)) as MapNode
      const opened = chooseNode({ ...run, position: before.id, visited: [before.id] }, treasure.id)
      for (const relic of opened.reward?.relicChoices ?? []) expect(relicMatters(opened, relic), `${seed}: ${relic}`).toBe(true)
    }
  })
})

describe('Bookends counts the far end only the plain number of times', () => {
  it(`an Empiricist's Evidence Conclusion counts ${timesWord(EMPIRICIST_EVIDENCE_TIMES)}, the Bookend ${timesWord(CONCLUSION_TIMES)}, and Replication's bonus only the Conclusion`, () => {
    const battle = { ...battleWith({ hand: ['field_study', 'replication', 'field_study'], school: 'empiricist', relics: ['bookends'] }), focus: 9 }
    const steps = previewArgument(playAll(battle, [100, 101, 102])).steps
    expect(steps[0].times).toBe(CONCLUSION_TIMES)
    expect(steps[0].notes).toContain(`Bookend Conclusion: counts ${timesWord(CONCLUSION_TIMES)}`)
    expect(steps[2].times).toBe(EMPIRICIST_EVIDENCE_TIMES + 1)
    expect(getRelicDef('bookends').text).toContain(`counting ${timesWord(CONCLUSION_TIMES)} whatever your school or relics`)
  })
})

describe('Gentle biases give ground slowly, so a strong deck needs two rounds', () => {
  it('no round takes a Gentle bias past half; the teaching fight, problems and Rigorous are untouched', () => {
    const start = battleWith({ enemyId: 'sunk_cost', hand: ['smoking_gun', 'syllogism', 'smoking_gun'], school: 'empiricist', resolve: 999 })
    const battle = playAll({ ...start, focus: 9 }, [101, 100, 102])
    const half = Math.floor(start.enemy.maxHealth / 2)
    const preview = previewArgument(battle)
    expect(preview.damage).toBe(start.enemy.maxHealth - half)
    expect(preview.chain.at(-1)?.text).toBe(`It gives ground slowly: it stops at ${half}, half its Resolve. Your extra ${preview.raw - (start.enemy.maxHealth - half)} is lost`)
    expect(preview.shaken).toBe(0)
    const second = endTurn(battle)
    expect(second.enemy.health).toBe(half)
    expect(stopLine(second)).toBeNull()
    expect(givesGroundSlowly(getEnemyDef(TUTORIAL_ENEMY), 0)).toBe(false)
    expect(givesGroundSlowly(getEnemyDef('sunk_cost'), 1)).toBe(false)
    expect(givesGroundSlowly(getEnemyDef('zenos_arrow'), 0)).toBe(false)
    expect(fullRuleText(getEnemyDef('sunk_cost'), 0)).toContain(SLOW_GROUND_TEXT)
    expect(fullRuleText(getEnemyDef('sunk_cost'), 1)).not.toContain(SLOW_GROUND_TEXT)
  })
})

describe('walks open and end in more than one way', () => {
  it('a teaching run opens with the teaching fight; otherwise the seed draws one of the openers', () => {
    expect(availableNodes(newRun('skeptic', 5))[0].enemyId).toBe(TUTORIAL_ENEMY)
    const seen = new Set<string>()
    for (let seed = 1; seed <= 30; seed++) seen.add(availableNodes(newRun('skeptic', seed, 'gentle', [], undefined, 'long', false))[0].enemyId as string)
    expect([...seen].sort()).toEqual([...OPENERS].sort())
    for (const id of OPENERS) {
      expect(enemiesFor(1, 'normal').map((e) => e.id)).not.toContain(id)
      expect(EMBLEMS[id], id).toHaveLength(16)
    }
  })

  it('Rumination Unsettles itself more each turn and never halves; Catastrophizing eases after every round that costs you nothing', () => {
    const rumination = createBattle({ enemyId: 'rumination', deck: [], resolve: 60, maxResolve: 60, relics: [], school: 'empiricist', rng: 1, rigor: 0, known: false })
    expect(rumination.enemy.unsettle).toBe(RUMINATION_STEP)
    const after = endTurn({ ...rumination, focus: 0 })
    expect(after.lastRound?.unsettleLoss).toBe(RUMINATION_STEP)
    expect(after.enemy.unsettle).toBe(2 * RUMINATION_STEP)
    expect(getEnemyDef('rumination').ruleText).toContain(`Unsettles itself ${RUMINATION_STEP} more`)

    const worst = createBattle({ enemyId: 'catastrophizing', deck: [], resolve: 60, maxResolve: 60, relics: [], school: 'empiricist', rng: 1, rigor: 0, known: false })
    expect(worst.enemy.strength).toBe(CATASTROPHE.start)
    const hurt = endTurn({ ...worst, focus: 0 })
    expect(hurt.lastRound?.playerLoss).toBeGreaterThan(0)
    expect(hurt.enemy.strength).toBe(CATASTROPHE.start)
    const guarded = endTurn({ ...worst, focus: 0, player: { ...worst.player, guard: 0 }, enemy: { ...worst.enemy, moveIndex: 1 } })
    expect(guarded.lastRound?.eased).toBe(CATASTROPHE.ease)
    expect(guarded.enemy.strength).toBe(CATASTROPHE.start - CATASTROPHE.ease)
    let calm: BattleState = { ...worst, enemy: { ...worst.enemy, strength: 0, moveIndex: 1 } }
    calm = endTurn({ ...calm, focus: 0 })
    expect(calm.enemy.strength).toBe(0)
    expect(calm.lastRound?.eased).toBe(0)
  })

  it('a Short walk ends at two of four problems drawn by the seed; the guests are scaled for the first floor', () => {
    expect(SHORT_WALK_PROBLEMS).toHaveLength(4)
    const pairs = new Set<string>()
    for (let seed = 1; seed <= 60; seed++) {
      const run = newRun('rationalist', seed, 'gentle', [], undefined, 'short')
      const options = bossOptions(run)
      expect(options).toHaveLength(2)
      for (const id of options) expect(SHORT_WALK_PROBLEMS).toContain(id)
      pairs.add([...options].sort().join('+'))
    }
    expect(pairs.size).toBeGreaterThanOrEqual(5)
    for (const [id, guest] of Object.entries(SHORT_WALK_GUESTS)) {
      const def = getEnemyDef(id)
      expect(def.floor).toBeGreaterThan(1)
      expect(def.phase2, id).toBeDefined()
      expect(EMBLEMS[id], id).toHaveLength(16)
      const battle = createBattle({ enemyId: id, deck: [], resolve: 60, maxResolve: 60, relics: [], school: 'empiricist', rng: 1, rigor: 0, known: false, lastOfShortWalk: true })
      expect(battle.enemy.maxHealth).toBe(Math.round(guest.health * SHORT_WALK_BOSS.health))
      expect(battle.enemy.strength).toBe(SHORT_WALK_BOSS.attack + guest.attack)
    }
    const run = newRun('rationalist', 3, 'gentle', [], undefined, 'short')
    for (const id of bossOptions(run)) expect(holdsNothingBack(run, id)).toBe(true)
    expect(bossOptions(newRun('rationalist', 3))).toEqual(enemiesFor(1, 'boss').map((e) => e.id))
  })

  it('a Long walk keeps each floor’s own two problems, exactly as before', () => {
    for (const floor of [1, 2, 3] as const) {
      for (let seed = 1; seed <= 10; seed++) {
        const boss = generateFloor(floor, seedRng(seed)).nodes.find((n) => n.type === 'boss') as MapNode
        expect(boss.options).toEqual(enemiesFor(floor, 'boss').map((e) => e.id))
        expect(boss.options).toContain(boss.enemyId)
      }
    }
  })
})

describe("Zeno's Arrow tires sooner for every argument it stops", () => {
  it(`each stopped argument brings its tiring ${ARROW_TIRES} turns sooner, never before your next turn, and the step says from when`, () => {
    const start = createBattle({ enemyId: 'zenos_arrow', deck: [], resolve: 99, maxResolve: 99, relics: [], school: 'skeptic', rng: 1, rigor: 7, known: false })
    expect(start.tiresFrom).toBe(ARROW_RIGOROUS_TIRING)
    expect(ARROW_RIGOROUS_TIRING).toBeLessThan(TIRING.rigorous)
    const small = { ...start, hand: [{ uid: 900, cardId: 'observation', upgraded: false }], focus: 3 }
    const played = playCard(small, 900)
    const preview = previewArgument(played)
    expect(preview.damage).toBe(0)
    expect(preview.chain[0].text).toBe(`Under ${ARROW_MIN.rigorous}: the arrow does not move, and it tires from turn ${ARROW_RIGOROUS_TIRING - ARROW_TIRES}`)
    const after = endTurn(played)
    expect(after.tiresFrom).toBe(ARROW_RIGOROUS_TIRING - ARROW_TIRES)
    const late = { ...played, turn: ARROW_RIGOROUS_TIRING - 1 }
    expect(endTurn(late).tiresFrom).toBe(ARROW_RIGOROUS_TIRING)
    expect(tiringUnsettle({ ...after, turn: after.tiresFrom })).toBe(TIRING.step)
    expect(getEnemyDef('zenos_arrow').ruleText).toContain(`It tires from turn ${ARROW_RIGOROUS_TIRING}, and each argument it stops brings that ${ARROW_TIRES} turns sooner.`)
  })
})

describe('saved runs from version 8 load with the boss options and round summaries filled in', () => {
  it('migrates the fixture', async () => {
    const { readFileSync } = await import('fs')
    const path = await import('path')
    const saved = JSON.parse(readFileSync(path.join(__dirname, 'fixtures', 'run-v8.json'), 'utf8'))
    const run = migrateRun(saved, 8) as RunState
    expect(run.version).toBe(9)
    expect(bossOptions(run)).toEqual(enemiesFor(run.floor, 'boss').map((e) => e.id))
    expect(run.battle?.lastRound?.eased).toBe(0)
    const battle = run.battle as BattleState
    const next = endTurn(battle)
    expect(next.turn).toBe(battle.turn + 1)
  })
})
