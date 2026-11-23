import { BattleState, MapNode, RunState } from '@/types/thought-pockets'
import { endTurn, playCard, previewArgument, stopLine } from '@/lib/games/thought-pockets/engine/battle'
import {
  RUN_VERSION,
  chooseNode,
  hasHalfwayMark,
  leaveReward,
  migrateRun,
  newRun,
  skipCards,
  studiesAtRest,
  takeCard,
} from '@/lib/games/thought-pockets/engine/run'
import { ALL_LESSONS, LESSONS, lessonsIn, lessonsOnCards } from '@/lib/games/thought-pockets/engine/lessons'
import { SECOND_LESSON, TUTORIAL_ENEMY, fullRuleText, getEnemyDef, slowGroundText } from '@/lib/games/thought-pockets/data/enemies'
import { getCardDef } from '@/lib/games/thought-pockets/data/cards'
import { useInsightStore } from '@/lib/games/thought-pockets/store/runStore'
import { battleWith } from './helpers'

function at(run: RunState, node: MapNode): RunState {
  const before = run.map.find((n) => n.next.includes(node.id))
  return before ? { ...run, position: before.id, visited: [before.id] } : run
}

function fightAt(run: RunState, row: number): BattleState {
  const node = run.map.find((n) => n.row === row && n.type === 'battle') as MapNode
  return chooseNode(at(run, node), node.id).battle as BattleState
}

describe('a first Gentle walk brings one new idea per fight', () => {
  it('opens with the teaching fight, then the bias whose whole rule is Unsettle, then a bias with a halfway mark', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const run = newRun('empiricist', seed, 'gentle', [], undefined, 'short')
      expect(run.teaching).toBe(true)
      const battles = run.map.filter((n) => n.type === 'battle').sort((a, b) => a.row - b.row)
      expect(battles.map((n) => n.enemyId).slice(0, 2)).toEqual([TUTORIAL_ENEMY, SECOND_LESSON])
      expect(fightAt(run, 1).halfway).toBe(false)
      expect(fightAt(run, 2).halfway).toBe(true)
    }
  })

  it('the second fight brings Unsettle alone; the third brings the halfway mark; a problem brings its stages', () => {
    const run = newRun('empiricist', 3, 'gentle', [], undefined, 'short')
    const second = fightAt(run, 1)
    expect(lessonsIn(second, previewArgument(second))).toEqual(['unsettle'])
    expect(stopLine(second)).toBeNull()
    const third = fightAt(run, 2)
    expect(lessonsIn(third, previewArgument(third))).toEqual(['halfway'])
    const problem = battleWith({ enemyId: 'problem_of_induction', hand: ['observation', 'therefore'] })
    expect(lessonsIn(problem, previewArgument(problem))).toEqual(['stages'])
  })

  it('the map states each bias’s rules as they will play: no halfway mark on the Unsettle lesson', () => {
    const run = newRun('empiricist', 3, 'gentle', [], undefined, 'short')
    const rumination = getEnemyDef(SECOND_LESSON)
    expect(hasHalfwayMark(run, SECOND_LESSON)).toBe(false)
    expect(fullRuleText(rumination, 0, hasHalfwayMark(run, SECOND_LESSON))).not.toContain(slowGroundText(14))
    expect(hasHalfwayMark(run, 'sunk_cost')).toBe(true)
  })

  it('Rigorous walks and walks after the first are not reordered, and their opening fights keep the halfway mark at Gentle pace', () => {
    expect(newRun('empiricist', 3, 'rigorous', [], 1, 'short').teaching).toBe(false)
    for (let seed = 1; seed <= 30; seed++) {
      const later = newRun('empiricist', seed, 'gentle', [], undefined, 'short', false)
      expect(later.teaching).toBe(false)
      expect(later.map.filter((n) => n.row > 0).some((n) => n.enemyId === SECOND_LESSON)).toBe(false)
      const opener = later.map.find((n) => n.row === 0) as MapNode
      expect(hasHalfwayMark(later, opener.enemyId as string)).toBe(opener.enemyId !== TUTORIAL_ENEMY)
    }
  })

  it('cards name the ideas they use, and each idea has one plain line', () => {
    expect(lessonsOnCards([getCardDef('counterexample'), getCardDef('epoche'), getCardDef('observation')])).toEqual(['unsettle', 'pierce', 'once'])
    for (const lesson of ALL_LESSONS) expect(LESSONS[lesson].line.split('. ').length).toBeLessThanOrEqual(3)
  })

  it('Shaken is introduced once a problem’s line has banked some', () => {
    let battle = battleWith({ enemyId: 'problem_of_induction', hand: ['field_study', 'field_study', 'therefore'], school: 'empiricist' })
    battle = { ...battle, focus: 6 }
    expect(lessonsIn(battle, previewArgument(battle))).not.toContain('shaken')
    for (const card of battle.hand.slice()) battle = playCard(battle, card.uid)
    battle = endTurn(battle)
    expect(battle.enemy.shaken).toBeGreaterThan(0)
    expect(lessonsIn(battle, previewArgument(battle))).toEqual(['stages', 'shaken'])
  })
})

describe('a Short walk’s quiet place offers one more card to build on', () => {
  function atRest(run: RunState): RunState {
    const rest = run.map.find((n) => n.type === 'rest') as MapNode
    return chooseNode(at(run, rest), rest.id)
  }

  it('offers your school’s rare you lack and cards that fit, then lets you rest', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const run = newRun('skeptic', seed, 'gentle', [], undefined, 'short')
      expect(studiesAtRest(run)).toBe(true)
      const study = atRest(run)
      expect(study.screen).toBe('reward')
      expect(study.reward?.source).toBe('rest')
      expect(study.reward?.gold).toBe(0)
      expect(study.reward?.relicChoices).toEqual([])
      const choices = study.reward?.cardChoices ?? []
      expect(choices).toHaveLength(3)
      expect(new Set(choices).size).toBe(3)
      expect(getCardDef(choices[0])).toMatchObject({ rarity: 'rare', school: 'skeptic' })
      const taken = leaveReward(takeCard(study, choices[1]))
      expect(taken.screen).toBe('rest')
      expect(taken.deck.at(-1)?.cardId).toBe(choices[1])
      expect(leaveReward(skipCards(study)).deck).toHaveLength(run.deck.length)
    }
  })

  it('a Long walk’s rest is unchanged', () => {
    const run = newRun('skeptic', 4, 'gentle', [], undefined, 'long')
    expect(studiesAtRest(run)).toBe(false)
    expect(atRest(run).screen).toBe('rest')
  })
})

describe('saved runs from version 10 load as walks that are not teaching, with each battle’s halfway mark', () => {
  it('migrates a mid-battle save and plays on', () => {
    const current = newRun('empiricist', 5, 'gentle', [], undefined, 'short', false)
    const node = current.map.find((n) => n.row === 1 && n.type === 'battle') as MapNode
    const fighting = chooseNode(at(current, node), node.id)
    const live = playCard(fighting.battle as BattleState, (fighting.battle as BattleState).hand[0].uid)
    const strip = ({ halfway: _halfway, ...core }: BattleState | BattleState['undo'][number]) => core
    const { teaching: _teaching, ...rest } = { ...fighting, battle: live }
    const saved = { ...rest, version: 10, battle: { ...strip(live), undo: live.undo.map(strip) } }
    const run = migrateRun(JSON.parse(JSON.stringify(saved)), 10) as RunState
    expect(run.version).toBe(RUN_VERSION)
    expect(run.teaching).toBe(false)
    expect(run.battle?.halfway).toBe(true)
    expect(run.battle?.undo.every((core) => core.halfway)).toBe(true)
    const battle = run.battle as BattleState
    expect(endTurn(battle).turn).toBe(battle.turn + 1)
  })
})

describe('which ideas you have been shown carries across walks', () => {
  it('starts empty, remembers each idea once, and counts a player who has finished a walk as having met them all', async () => {
    useInsightStore.setState({ seen: [] })
    useInsightStore.getState().learn('unsettle')
    useInsightStore.getState().learn('unsettle')
    expect(useInsightStore.getState().seen).toEqual(['unsettle'])
    const migrate = useInsightStore.persist.getOptions().migrate as (state: unknown, version: number) => { seen: string[] }
    expect(migrate({ beaten: [], finishedWith: ['empiricist'], tutorialDone: true, rigorWon: 0 }, 0).seen).toEqual(ALL_LESSONS)
    expect(migrate({ beaten: ['rumination'], finishedWith: [], tutorialDone: true, rigorWon: 0 }, 0).seen).toEqual([])
  })
})
