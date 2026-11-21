import { describe, expect, it } from 'vitest'
import { generateFloor, FLOOR_ROWS } from '@/lib/games/thought-pockets/engine/map'
import {
  START_RESOLVE,
  availableNodes,
  battleAction,
  buyCard,
  chooseEvent,
  chooseNode,
  leaveReward,
  newRun,
  pickCard,
  reconsider,
  restHeal,
  skipCards,
  startShopRemoval,
  takeCard,
  takeRelic,
} from '@/lib/games/thought-pockets/engine/run'
import { KNOWN_UNSETTLE, endTurn } from '@/lib/games/thought-pockets/engine/battle'
import { MapNode, RunState } from '@/types/thought-pockets'
import { TUTORIAL_ENEMY, getEnemyDef } from '@/lib/games/thought-pockets/data/enemies'
import { getCardDef } from '@/lib/games/thought-pockets/data/cards'

function winFight(run: RunState): RunState {
  const battle = run.battle
  if (!battle) throw new Error('no battle')
  const doomed = { ...run, battle: { ...battle, enemy: { ...battle.enemy, health: 0 } } }
  return battleAction(doomed, endTurn)
}

function loseFight(run: RunState): RunState {
  const battle = run.battle
  if (!battle) throw new Error('no battle')
  const doomed = { ...run, battle: { ...battle, player: { ...battle.player, resolve: 1 }, hand: [], played: [] } }
  let next: RunState = doomed
  for (let i = 0; i < 40 && next.screen === 'battle'; i++) next = battleAction(next, endTurn)
  return next
}

function nodeOfType(run: RunState, type: MapNode['type']): MapNode | undefined {
  return run.map.find((n) => n.type === type)
}

function withPosition(run: RunState, nodeId: string): RunState {
  const node = run.map.find((n) => n.id === nodeId) as MapNode
  const before = run.map.find((n) => n.row === node.row - 1 && n.next.includes(node.id))
  return { ...run, position: before ? before.id : null }
}

describe('the map', () => {
  it('is short: 5 rows per floor ending in one boss, the first fight fixed on floor 1', () => {
    const { nodes } = generateFloor(1, 7)
    expect(Math.max(...nodes.map((n) => n.row))).toBe(FLOOR_ROWS - 1)
    const boss = nodes.filter((n) => n.type === 'boss')
    expect(boss).toHaveLength(1)
    expect(boss[0].row).toBe(FLOOR_ROWS - 1)
    const first = nodes.filter((n) => n.row === 0)
    expect(first).toHaveLength(1)
    expect(first[0].enemyId).toBe(TUTORIAL_ENEMY)
  })

  it('only connects forward to the next row, without crossing paths, and everything reaches the boss', () => {
    for (let seed = 1; seed < 60; seed++) {
      for (const floor of [1, 2, 3] as const) {
        const { nodes } = generateFloor(floor, seed)
        const byId = new Map(nodes.map((n) => [n.id, n]))
        const edges: [MapNode, MapNode][] = []
        for (const node of nodes) {
          if (node.type !== 'boss') expect(node.next.length).toBeGreaterThan(0)
          for (const id of node.next) {
            const target = byId.get(id) as MapNode
            expect(target.row).toBe(node.row + 1)
            edges.push([node, target])
          }
        }
        for (const [a, b] of edges) {
          for (const [c, d] of edges) {
            if (a.row !== c.row) continue
            const ax = a.lane / Math.max(1, a.lanes - 1)
            const cx = c.lane / Math.max(1, c.lanes - 1)
            const bx = b.lane / Math.max(1, b.lanes - 1)
            const dx = d.lane / Math.max(1, d.lanes - 1)
            if (ax < cx) expect(bx).toBeLessThanOrEqual(dx)
          }
        }
        for (const node of nodes.filter((n) => n.row > 0)) {
          expect(nodes.some((n) => n.next.includes(node.id))).toBe(true)
        }
      }
    }
  })

  it('only lets you move forward along a path (regression: backwards/sideways travel)', () => {
    let run = newRun('empiricist', 11)
    const start = availableNodes(run)
    expect(start.map((n) => n.row)).toEqual([0])
    run = chooseNode(run, start[0].id)
    run = winFight(run)
    run = leaveReward(skipCards(run))
    const options = availableNodes(run)
    expect(options.every((n) => n.row === 1)).toBe(true)
    const row1 = run.map.filter((n) => n.row === 1)
    const blocked = row1.find((n) => !options.includes(n))
    if (blocked) expect(chooseNode(run, blocked.id)).toBe(run)
    expect(chooseNode(run, start[0].id)).toBe(run)
  })
})

describe('a run', () => {
  it('starts on the map with the school deck', () => {
    const run = newRun('skeptic', 3)
    expect(run.screen).toBe('map')
    expect(run.resolve).toBe(START_RESOLVE)
    expect(run.deck.map((c) => c.cardId)).toContain('why')
    expect(new Set(run.deck.map((c) => c.uid)).size).toBe(run.deck.length)
  })

  it('starts the battle in one place when you choose a fight', () => {
    const run = chooseNode(newRun('empiricist', 5), availableNodes(newRun('empiricist', 5))[0].id)
    expect(run.screen).toBe('battle')
    expect(run.battle?.enemy.id).toBe(TUTORIAL_ENEMY)
    expect(run.battle?.hand).toHaveLength(5)
  })

  it('opens the first fight with Evidence, Logic and Guard in hand, for every school', () => {
    for (const school of ['empiricist', 'pragmatist', 'rationalist', 'skeptic', 'absurdist'] as const) {
      for (let seed = 1; seed < 10; seed++) {
        const run = newRun(school, seed)
        const battle = chooseNode(run, availableNodes(run)[0].id).battle
        const types = battle?.hand.map((c) => getCardDef(c.cardId).type)
        expect(types).toEqual(expect.arrayContaining(['evidence', 'logic', 'guard']))
      }
    }
  })

  it('offers a card reward after a normal fight and adds the chosen card (regression)', () => {
    let run = chooseNode(newRun('empiricist', 5), availableNodes(newRun('empiricist', 5))[0].id)
    run = winFight(run)
    expect(run.screen).toBe('reward')
    expect(run.reward?.cardChoices).toHaveLength(3)
    expect(run.reward?.gold).toBeGreaterThan(0)
    const choice = run.reward?.cardChoices[0] as string
    const deckBefore = run.deck.length
    run = takeCard(run, choice)
    expect(run.deck).toHaveLength(deckBefore + 1)
    expect(run.deck.at(-1)?.cardId).toBe(choice)
    run = leaveReward(run)
    expect(run.screen).toBe('map')
    expect(run.beaten).toContain(TUTORIAL_ENEMY)
  })

  it('rolls different offers at different nodes on the same floor (regression: per-floor seeding)', () => {
    let same = 0
    for (let seed = 1; seed <= 20; seed++) {
      const run = newRun('pragmatist', seed)
      const a = winFight(chooseNode(run, availableNodes(run)[0].id))
      const b = winFight({ ...a, screen: 'battle', reward: null, battle: chooseNode(run, availableNodes(run)[0].id).battle })
      if (JSON.stringify(a.reward?.cardChoices) === JSON.stringify(b.reward?.cardChoices)) same++
    }
    expect(same).toBeLessThan(5)
  })

  it('defeat ends the run with no battle left behind (regression)', () => {
    const run = newRun('absurdist', 9)
    const lost = loseFight(chooseNode(run, availableNodes(run)[0].id))
    expect(lost.screen).toBe('defeat')
    expect(lost.battle).toBeNull()
    expect(lost.defeatedBy).toBe(TUTORIAL_ENEMY)
  })

  it('a boss win completes the floor once and opens the next floor', () => {
    let run = newRun('empiricist', 21)
    const boss = nodeOfType(run, 'boss') as MapNode
    run = chooseNode(withPosition(run, boss.id), boss.id)
    expect(run.screen).toBe('battle')
    run = winFight(run)
    expect(run.reward?.source).toBe('boss')
    expect(run.reward?.relicChoices.length).toBeGreaterThan(0)
    run = takeRelic(run, run.reward?.relicChoices[0] as never)
    run = leaveReward(run)
    expect(run.floor).toBe(2)
    expect(run.position).toBeNull()
    expect(run.screen).toBe('map')
    expect(run.relics).toHaveLength(1)
  })

  it('finishing the floor 3 boss wins the run', () => {
    let run: RunState = { ...newRun('empiricist', 4), floor: 3 }
    run = { ...run, map: generateFloor(3, 4).nodes }
    const boss = nodeOfType(run, 'boss') as MapNode
    run = leaveReward(winFight(chooseNode(withPosition(run, boss.id), boss.id)))
    expect(run.screen).toBe('victory')
  })

  it('rest upgrades exactly one copy (regression: upgrade hit every copy)', () => {
    let run = newRun('empiricist', 2)
    run = { ...run, screen: 'rest' }
    run = { ...run, pick: 'upgrade' }
    const target = run.deck.find((c) => c.cardId === 'observation') as { uid: number }
    run = pickCard(run, target.uid)
    const observations = run.deck.filter((c) => c.cardId === 'observation')
    expect(observations.filter((c) => c.upgraded)).toHaveLength(1)
    expect(run.screen).toBe('map')
  })

  it('rest heals 40% of maximum Resolve, 30% in rigorous mode', () => {
    const run = restHeal({ ...newRun('empiricist', 2), screen: 'rest', resolve: 10 })
    expect(run.resolve).toBe(10 + 24)
    const rigorous = restHeal({ ...newRun('empiricist', 2, 'rigorous'), screen: 'rest', resolve: 10 })
    expect(rigorous.resolve).toBe(10 + 18)
    expect(run.screen).toBe('map')
  })

  it('shop removal removes exactly one copy and charges once (regression)', () => {
    let run = newRun('empiricist', 8)
    const shopNode = run.map.find((n) => n.type === 'shop') as MapNode
    run = chooseNode(withPosition(run, shopNode.id), shopNode.id)
    run = { ...run, gold: 500 }
    const price = run.shop?.removePrice as number
    run = startShopRemoval(run)
    const target = run.deck.find((c) => c.cardId === 'observation') as { uid: number }
    run = pickCard(run, target.uid)
    expect(run.deck.filter((c) => c.cardId === 'observation')).toHaveLength(3)
    expect(run.gold).toBe(500 - price)
    expect(run.shop?.removed).toBe(true)
    expect(startShopRemoval(run)).toBe(run)
  })

  it('shop sells a card once and refuses what you cannot afford', () => {
    let run = newRun('empiricist', 8)
    const shopNode = run.map.find((n) => n.type === 'shop') as MapNode
    run = chooseNode(withPosition(run, shopNode.id), shopNode.id)
    const poor = { ...run, gold: 0 }
    expect(buyCard(poor, 0)).toBe(poor)
    const rich = buyCard({ ...run, gold: 500 }, 0)
    expect(rich.deck).toHaveLength(run.deck.length + 1)
    expect(buyCard(rich, 0)).toBe(rich)
  })

  it('events resolve deterministically with no coin flips', () => {
    const base = newRun('empiricist', 6)
    const run: RunState = { ...base, screen: 'event', event: { eventId: 'old_friend', relicOffer: null, cardOffer: [], result: null } }
    const a = chooseEvent(run, 'talk')
    const b = chooseEvent(run, 'talk')
    expect(a).toEqual(b)
    expect(a.maxResolve).toBe(base.maxResolve + 5)
  })

  it('survives a save and reload byte for byte, mid-battle included', () => {
    const run = newRun('rationalist', 12)
    const inBattle = chooseNode(run, availableNodes(run)[0].id)
    expect(JSON.parse(JSON.stringify(inBattle))).toEqual(inBattle)
  })
})

describe('mercy and modes', () => {
  it('a gentle run can reconsider one lost fight: back to its start with the Resolve you had, freshly shuffled', () => {
    const run = newRun('empiricist', 9)
    const entered = chooseNode({ ...run, resolve: 40 }, availableNodes(run)[0].id)
    const lost = loseFight(entered)
    expect(lost.screen).toBe('defeat')
    expect(lost.reconsiders).toBe(1)
    const again = reconsider(lost)
    expect(again.screen).toBe('battle')
    expect(again.reconsiders).toBe(0)
    expect(again.defeatedBy).toBeNull()
    expect(again.battle?.player.resolve).toBe(40)
    expect(again.battle?.enemy.health).toBe(getEnemyDef(TUTORIAL_ENEMY).health)
    expect(again.battle?.turn).toBe(1)
    expect(again.battle?.rng).not.toBe(entered.battle?.rng)
    const lostAgain = loseFight(again)
    expect(lostAgain.screen).toBe('defeat')
    expect(reconsider(lostAgain)).toBe(lostAgain)
  })

  it('reconsider does nothing outside a defeat', () => {
    const run = newRun('empiricist', 9)
    expect(reconsider(run)).toBe(run)
  })

  it('rigorous mode: no reconsider, enemies have a quarter more Resolve and hit 2 harder', () => {
    const gentle = newRun('empiricist', 9)
    const rigorous = newRun('empiricist', 9, 'rigorous')
    expect(gentle.mode).toBe('gentle')
    expect(rigorous.reconsiders).toBe(0)
    const fight = chooseNode(rigorous, availableNodes(rigorous)[0].id).battle
    const base = getEnemyDef(TUTORIAL_ENEMY)
    expect(fight?.enemy.maxHealth).toBe(Math.round(base.health * 1.25))
    expect(fight?.enemy.strength).toBe(2)
    expect(reconsider(loseFight(chooseNode(rigorous, availableNodes(rigorous)[0].id))).screen).toBe('defeat')
  })

  it('a bias you understood in an earlier run starts every fight Unsettled', () => {
    const run = newRun('empiricist', 9, 'gentle', [TUTORIAL_ENEMY])
    const fight = chooseNode(run, availableNodes(run)[0].id).battle
    expect(fight?.enemy.unsettle).toBe(KNOWN_UNSETTLE)
    const stranger = newRun('empiricist', 9)
    expect(chooseNode(stranger, availableNodes(stranger)[0].id).battle?.enemy.unsettle).toBe(0)
  })

  it('heals fully between floors in gentle mode and by 20 in rigorous mode', () => {
    for (const mode of ['gentle', 'rigorous'] as const) {
      let run = { ...newRun('empiricist', 21, mode), resolve: 10 }
      const boss = nodeOfType(run, 'boss') as MapNode
      run = leaveReward(winFight(chooseNode(withPosition(run, boss.id), boss.id)))
      expect(run.floor).toBe(2)
      expect(run.resolve).toBe(mode === 'gentle' ? run.maxResolve : 30)
    }
  })
})
