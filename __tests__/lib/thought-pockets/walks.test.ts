import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  RUN_FLOORS,
  RUN_VERSION,
  START_RESOLVE,
  availableNodes,
  battleAction,
  chooseNode,
  fightWarning,
  leaveReward,
  migrateRun,
  newRun,
  opensNextLevel,
  reconsider,
  skipCards,
} from '@/lib/games/thought-pockets/engine/run'
import { endTurn, incomingDamage, undoPlay } from '@/lib/games/thought-pockets/engine/battle'
import { generateFloor } from '@/lib/games/thought-pockets/engine/map'
import { CARDS } from '@/lib/games/thought-pockets/data/cards'
import { enemiesFor, getEnemyDef } from '@/lib/games/thought-pockets/data/enemies'
import { BattleState, MapNode, RunState, School } from '@/types/thought-pockets'

function winFight(run: RunState): RunState {
  const battle = run.battle as BattleState
  return battleAction({ ...run, battle: { ...battle, enemy: { ...battle.enemy, health: 0 } } }, endTurn)
}

function loseFight(run: RunState): RunState {
  const battle = run.battle as BattleState
  let next: RunState = { ...run, battle: { ...battle, player: { ...battle.player, resolve: 1 }, hand: [], played: [] } }
  for (let i = 0; i < 40 && next.screen === 'battle'; i++) next = battleAction(next, endTurn)
  return next
}

function standingBefore(run: RunState, type: MapNode['type']): { run: RunState; node: MapNode } {
  const node = run.map.find((n) => n.type === type) as MapNode
  const before = run.map.find((n) => n.next.includes(node.id))
  return { run: { ...run, position: before ? before.id : null }, node }
}

function beatBoss(run: RunState): RunState {
  const { run: ready, node } = standingBefore(run, 'boss')
  return winFight(chooseNode(ready, node.id))
}

describe('a Short walk', () => {
  it('is one floor that ends at its philosophical problem, drawn from the floor’s two', () => {
    expect(RUN_FLOORS).toEqual({ short: 1, long: 3 })
    const bosses = new Set<string>()
    for (let seed = 1; seed <= 30; seed++) {
      const run = newRun('empiricist', seed, 'gentle', [], undefined, 'short')
      expect(run.length).toBe('short')
      bosses.add(run.map.find((n) => n.type === 'boss')?.enemyId as string)
    }
    expect([...bosses].sort()).toEqual(enemiesFor(1, 'boss').map((e) => e.id).sort())
  })

  it('beating its problem finishes the walk, with nothing left to choose that the run could not use', () => {
    const won = beatBoss(newRun('pragmatist', 5, 'gentle', [], undefined, 'short'))
    expect(won.screen).toBe('reward')
    expect(won.reward?.cardChoices).toEqual([])
    expect(won.reward?.relicChoices).toEqual([])
    expect(won.reward?.finalRound).not.toBeNull()
    const done = leaveReward(won)
    expect(done.screen).toBe('victory')
    expect(done.floor).toBe(1)
  })

  it('the Long walk still goes on to floor 2 after the same problem, and the floor-1 problem offers your school a rare you lack', () => {
    for (const school of ['empiricist', 'pragmatist', 'rationalist', 'skeptic', 'absurdist'] as School[]) {
      const rares = CARDS.filter((c) => c.rarity === 'rare' && c.school === school).map((c) => c.id)
      const owned = { uid: 900, cardId: rares[0], upgraded: false }
      for (let seed = 1; seed <= 10; seed++) {
        const start = newRun(school, seed)
        const won = beatBoss({ ...start, deck: [...start.deck, owned] })
        const lacking = won.reward?.cardChoices.filter((id) => rares.includes(id) && id !== rares[0]) ?? []
        expect(lacking.length, `${school} seed ${seed}`).toBeGreaterThan(0)
        expect(leaveReward(skipCards(won)).floor).toBe(2)
      }
    }
  })

  it('every shop stocks a rare, your school’s when there is one you lack', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { run, node } = standingBefore(newRun('skeptic', seed), 'shop')
      const shop = chooseNode(run, node.id).shop
      const rares = shop?.cards.filter((c) => CARDS.find((d) => d.id === c.cardId)?.rarity === 'rare') ?? []
      expect(rares.length, `seed ${seed}`).toBeGreaterThan(0)
      expect(rares.some((c) => CARDS.find((d) => d.id === c.cardId)?.school === 'skeptic'), `seed ${seed}`).toBe(true)
    }
  })

  it('only a Long walk win opens the next Rigorous level', () => {
    const victory = (length: 'short' | 'long', mode: 'gentle' | 'rigorous') => ({ ...newRun('empiricist', 3, mode, [], 2, length), screen: 'victory' as const })
    expect(opensNextLevel(victory('long', 'rigorous'))).toBe(true)
    expect(opensNextLevel(victory('short', 'rigorous'))).toBe(false)
    expect(opensNextLevel(victory('long', 'gentle'))).toBe(false)
    expect(opensNextLevel({ ...victory('long', 'rigorous'), screen: 'map' })).toBe(false)
  })
})

describe('Gentle never lets you walk into a problem unready', () => {
  it('in Gentle every floor has one quiet place, a rest, right before its problem; Rigorous keeps the choice', () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const floor of [1, 2, 3] as const) {
        const calm = generateFloor(floor, seed, true).nodes
        const beforeBoss = calm.filter((n) => n.next.includes(calm.find((b) => b.type === 'boss')?.id as string))
        expect(beforeBoss.map((n) => n.type), `seed ${seed} floor ${floor}`).toEqual(['rest'])
        const usual = generateFloor(floor, seed).nodes
        expect(usual.filter((n) => n.row === usual.find((b) => b.type === 'boss')!.row - 1)).toHaveLength(3)
      }
    }
    expect(newRun('empiricist', 4).map.filter((n) => n.type === 'rest')).toHaveLength(1)
    expect(newRun('empiricist', 4, 'rigorous').map.filter((n) => n.row === 3)).toHaveLength(3)
  })

  it('a fight you would enter at less than its opening attack, or at a quarter of your Resolve, says so first', () => {
    const run = newRun('empiricist', 905, 'gentle', [], undefined, 'long')
    const { run: ready, node } = standingBefore(run, 'boss')
    const attack = incomingDamage(chooseNode(ready, node.id).battle as BattleState, 0).total
    expect(fightWarning({ ...ready, resolve: START_RESOLVE }, node)).toBeNull()
    expect(fightWarning({ ...ready, resolve: attack }, node)).toEqual({ resolve: attack, attack })
    expect(fightWarning({ ...ready, resolve: Math.floor(START_RESOLVE / 4) }, node)?.resolve).toBe(Math.floor(START_RESOLVE / 4))
    const rest = run.map.find((n) => n.type === 'rest') as MapNode
    expect(fightWarning({ ...ready, resolve: 1 }, rest)).toBeNull()
  })

  it('Reconsider in Gentle restarts the fight with at least half your Resolve', () => {
    const run = newRun('empiricist', 9)
    const entered = chooseNode({ ...run, resolve: 6 }, availableNodes(run)[0].id)
    const again = reconsider(loseFight(entered))
    expect(again.battle?.player.resolve).toBe(START_RESOLVE / 2)
    const healthy = reconsider(loseFight(chooseNode({ ...run, resolve: 50 }, availableNodes(run)[0].id)))
    expect(healthy.battle?.player.resolve).toBe(50)
  })
})

describe('saved runs from version 6', () => {
  it('a version 6 save, mid-battle with a played card and a last round, becomes a Long walk and plays on', () => {
    const saved = JSON.parse(readFileSync(path.join(__dirname, 'fixtures/run-v6.json'), 'utf8'))
    expect(saved.version).toBe(6)
    const run = migrateRun(saved.state.run, saved.version) as RunState
    expect(run.version).toBe(RUN_VERSION)
    expect(run.length).toBe('long')
    expect(run.battle?.rigor).toBe(saved.state.run.rigor)
    expect(run.battle?.undo.every((core) => core.rigor === saved.state.run.rigor)).toBe(true)
    expect(run.battle?.hand).toEqual(saved.state.run.battle.hand)
    expect(run.battle?.played).toEqual(saved.state.run.battle.played)
    expect(run.battle?.lastRound).toBeNull()
    expect(battleAction(run, undoPlay).battle?.played).toHaveLength(0)
    let next = battleAction(run, endTurn)
    expect(next.battle?.lastRound?.chain).toBeDefined()
    for (let i = 0; i < 60 && next.screen === 'battle'; i++) next = battleAction(next, endTurn)
    expect(['reward', 'defeat']).toContain(next.screen)
    expect(getEnemyDef(saved.state.run.battle.enemy.id).floor).toBe(1)
  })
})
