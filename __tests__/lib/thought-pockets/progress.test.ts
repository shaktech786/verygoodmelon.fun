import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { generateFloor } from '@/lib/games/thought-pockets/engine/map'
import {
  START_RESOLVE,
  availableNodes,
  battleAction,
  buyTea,
  chooseEvent,
  chooseNode,
  eventChoiceAvailable,
  leaveReward,
  migrateRun,
  newRun,
  pickCard,
  RUN_VERSION,
  restAmount,
  restHeal,
  skipCards,
  startRestRemoval,
  startRestUpgrade,
} from '@/lib/games/thought-pockets/engine/run'
import { CARD_PRICES, FIGHT_GOLD, START_GOLD, TEA_HEAL, shopPrice } from '@/lib/games/thought-pockets/engine/economy'
import { endTurn, enemyRuleText, enemyRules, playCard, undoPlay } from '@/lib/games/thought-pockets/engine/battle'
import { EVENTS } from '@/lib/games/thought-pockets/data/events'
import { MAX_RIGOR, RIGOR_LEVELS, RIGOROUS_HEALTH } from '@/lib/games/thought-pockets/data/pace'
import { ENEMIES, TUTORIAL_ENEMY, getEnemyDef } from '@/lib/games/thought-pockets/data/enemies'
import { canUpgrade } from '@/lib/games/thought-pockets/data/cards'
import { BattleState, MapNode, RunState } from '@/types/thought-pockets'

function withPosition(run: RunState, nodeId: string): RunState {
  const node = run.map.find((n) => n.id === nodeId) as MapNode
  const before = run.map.find((n) => n.row === node.row - 1 && n.next.includes(node.id))
  return { ...run, position: before ? before.id : null }
}

function enterFirst(run: RunState, type: MapNode['type']): RunState {
  const node = run.map.find((n) => n.type === type) as MapNode
  return chooseNode(withPosition(run, node.id), node.id)
}

function paths(nodes: MapNode[]): MapNode[][] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const walk = (node: MapNode): MapNode[][] =>
    node.next.length === 0 ? [[node]] : node.next.flatMap((id) => walk(byId.get(id) as MapNode).map((rest) => [node, ...rest]))
  return nodes.filter((n) => n.row === 0).flatMap(walk)
}

describe('variety', () => {
  it('no path meets the same bias twice on a floor (regression: Bandwagon twice on floor 2)', () => {
    for (let seed = 1; seed < 80; seed++) {
      for (const floor of [1, 2, 3] as const) {
        for (const route of paths(generateFloor(floor, seed).nodes)) {
          const foes = route.filter((n) => n.enemyId).map((n) => n.enemyId)
          expect(new Set(foes).size, `seed ${seed} floor ${floor}`).toBe(foes.length)
        }
      }
    }
  })

  it('has at least ten encounters, and every choice resolves the same way every time', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(10)
    for (const def of EVENTS) {
      const base = { ...newRun('empiricist', 6), gold: 200, resolve: 40 }
      const deck = [...base.deck, { uid: 99, cardId: 'doubt', upgraded: false }]
      const run: RunState = { ...base, deck, screen: 'event', event: { eventId: def.id, relicOffer: 'lantern', cardOffer: ['statistic', 'insight', 'thesis'], result: null } }
      for (const choice of def.choices) {
        expect(eventChoiceAvailable(run, choice.id), `${def.id}.${choice.id}`).toBe(true)
        const a = chooseEvent(run, choice.id, 'statistic')
        expect(a, `${def.id}.${choice.id}`).toEqual(chooseEvent(run, choice.id, 'statistic'))
        expect(a.event?.result !== null || a.pick !== null, `${def.id}.${choice.id} does something`).toBe(true)
      }
    }
  })

  it('does not repeat an encounter in a run while there are unseen ones', () => {
    let run = newRun('empiricist', 3)
    const seen: string[] = []
    for (let i = 0; i < EVENTS.length; i++) {
      run = enterFirst({ ...run, screen: 'map', event: null }, 'event')
      seen.push(run.event?.eventId as string)
    }
    expect(new Set(seen).size).toBe(EVENTS.length)
  })
})

describe('the economy gives gold a use', () => {
  it('the first shop, after the opening fight, sells a card you can afford', () => {
    expect(START_GOLD + FIGHT_GOLD.battle).toBeGreaterThanOrEqual(shopPrice(CARD_PRICES.common, 1, []))
  })

  it('prices rise with each floor, and the Library Card lowers them', () => {
    expect(shopPrice(100, 2, [])).toBeGreaterThan(shopPrice(100, 1, []))
    expect(shopPrice(100, 3, [])).toBeGreaterThan(shopPrice(100, 2, []))
    expect(shopPrice(100, 1, ['library_card'])).toBeLessThan(shopPrice(100, 1, []))
  })

  it('the reading room sells one pot of tea per visit that restores Resolve', () => {
    const shop = enterFirst({ ...newRun('empiricist', 8), resolve: 20, gold: 100 }, 'shop')
    const price = shop.shop?.teaPrice as number
    const tea = buyTea(shop)
    expect(tea.resolve).toBe(20 + TEA_HEAL)
    expect(tea.gold).toBe(100 - price)
    expect(buyTea(tea)).toBe(tea)
    const full = { ...shop, resolve: shop.maxResolve }
    expect(buyTea(full)).toBe(full)
  })
})

describe('rest offers a third choice', () => {
  it('rest can remove one card instead of healing or upgrading, free', () => {
    const rest = { ...newRun('empiricist', 2), screen: 'rest' as const }
    const picking = startRestRemoval(rest)
    expect(picking.pick).toBe('remove')
    const done = pickCard(picking, rest.deck[0].uid)
    expect(done.deck).toHaveLength(rest.deck.length - 1)
    expect(done.gold).toBe(rest.gold)
    expect(done.screen).toBe('map')
  })
})

describe('the Rigorous ladder', () => {
  it('has seven levels, each adding exactly one constraint', () => {
    expect(RIGOR_LEVELS.map((l) => l.level)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(MAX_RIGOR).toBe(7)
    const fight = (level: number, tier: 'battle' | 'boss' = 'battle') => {
      const run = newRun('empiricist', 9, 'rigorous', [], level)
      return tier === 'battle' ? chooseNode(run, availableNodes(run)[0].id).battle : enterFirst(run, 'boss').battle
    }
    const base = getEnemyDef(TUTORIAL_ENEMY).health
    const l1 = newRun('empiricist', 9, 'rigorous', [], 1)
    expect(l1.reconsiders).toBe(0)
    expect(restAmount({ ...l1, screen: 'rest' })).toBe(Math.floor(START_RESOLVE * 0.3))
    expect(fight(1)?.enemy.maxHealth).toBe(base)
    expect(fight(2)?.enemy.maxHealth).toBe(Math.round(base * RIGOROUS_HEALTH))
    expect(fight(2)?.enemy.strength).toBe(0)
    expect(fight(3)?.enemy.strength).toBe(2)
    expect(newRun('empiricist', 9, 'rigorous', [], 3).deck.some((c) => c.cardId === 'doubt')).toBe(false)
    expect(newRun('empiricist', 9, 'rigorous', [], 4).deck.some((c) => c.cardId === 'doubt')).toBe(true)
    expect(fight(4, 'boss')?.enemy.strength).toBe(2)
    expect(fight(5, 'boss')?.enemy.strength).toBe(4)
    expect(fight(5)?.enemy.strength).toBe(2)
    expect(newRun('empiricist', 9).rigor).toBe(0)
    expect(newRun('empiricist', 9).reconsiders).toBe(1)
    expect(newRun('empiricist', 9, 'rigorous').rigor).toBe(3)
  })

  it('level 6: every stubborn bias plays by a second rule, shown with its first', () => {
    for (const elite of ENEMIES.filter((e) => e.tier === 'elite')) {
      const fight = (level: number) => {
        const run = newRun('empiricist', 9, 'rigorous', [], level)
        const node = { ...(run.map.find((n) => n.type === 'elite') as MapNode), enemyId: elite.id }
        const map = run.map.map((n) => (n.id === node.id ? node : n))
        return enterFirst({ ...run, map }, 'elite').battle as BattleState
      }
      const second = elite.secondRule
      expect(second, elite.id).toBeDefined()
      expect(enemyRules(fight(5))).toEqual([elite.rule])
      expect(enemyRules(fight(6))).toEqual([elite.rule, second?.rule])
      expect(enemyRuleText(fight(6))).toContain(second?.ruleText)
      expect(enemyRuleText(fight(5))).not.toContain(second?.ruleText)
    }
  })

  it('level 6: Confirmation Bias also grows each time it acts', () => {
    const run = newRun('empiricist', 9, 'rigorous', [], 6)
    const elite = enterFirst(run, 'elite').battle as BattleState
    expect(elite.enemy.id).toBe('confirmation_bias')
    const after = endTurn({ ...elite, hand: [], focus: 0 })
    expect(after.enemy.strength).toBeGreaterThan(elite.enemy.strength)
  })

  it('level 7: rests no longer restore Resolve, but you can still study or let go', () => {
    const rest = (level: number) => ({ ...newRun('empiricist', 9, 'rigorous', [], level), screen: 'rest' as const, resolve: 20 })
    expect(restAmount(rest(6))).toBeGreaterThan(0)
    expect(restAmount(rest(7))).toBe(0)
    const tired = rest(7)
    expect(restHeal(tired)).toBe(tired)
    expect(startRestUpgrade(rest(7)).pick).toBe('upgrade')
    expect(startRestRemoval(rest(7)).pick).toBe('remove')
  })
})

describe('the run remembers its best argument', () => {
  it('keeps the most damage one argument dealt', () => {
    let run = newRun('empiricist', 5)
    run = chooseNode(run, availableNodes(run)[0].id)
    run = battleAction(run, (b) => playCard(b, b.hand[0].uid))
    const damage = run.battle ? run.battle.enemy.health : 0
    run = battleAction(run, endTurn)
    expect(run.stats.best).toBe(run.battle?.lastRound?.damage)
    expect(run.stats.best).toBeGreaterThan(0)
    expect(damage).toBeGreaterThan(0)
  })
})

describe('saved runs from earlier versions keep loading', () => {
  it('a version 4 save, mid-battle with a played card and a last round, is migrated and plays on', () => {
    const saved = JSON.parse(readFileSync(path.join(__dirname, 'fixtures/run-v4.json'), 'utf8'))
    expect(saved.version).toBe(4)
    const run = migrateRun(saved.state.run, saved.version) as RunState
    expect(run.version).toBe(RUN_VERSION)
    expect(run.rigor).toBe(saved.state.run.rigor)
    expect(run.battle?.hand).toEqual(saved.state.run.battle.hand)
    expect(run.battle?.played).toEqual(saved.state.run.battle.played)
    expect(run.battle?.evidencePlayed).toBe(0)
    expect(run.battle?.lastingRestore).toBe(0)
    expect(run.battle?.unsettleLasts).toBe(false)
    expect(run.battle?.enemy.secondRule).toBe(false)
    expect(run.battle?.lastRound).toBeNull()
    expect(run.battle?.undo).toHaveLength(1)
    const undone = battleAction(run, undoPlay)
    expect(undone.battle?.played).toHaveLength(0)
    expect(undone.battle?.evidencePlayed).toBe(0)
    let next = battleAction(run, endTurn)
    expect(next.battle?.lastRound?.steps.every((s) => s.times >= 1)).toBe(true)
    for (let i = 0; i < 30 && next.screen === 'battle'; i++) next = battleAction(next, endTurn)
    expect(['reward', 'defeat']).toContain(next.screen)
  })

  it('a version 3 save, mid-battle in Rigorous, is migrated and plays on', () => {
    const saved = JSON.parse(readFileSync(path.join(__dirname, 'fixtures/run-v3.json'), 'utf8'))
    const run = migrateRun(saved.state.run, saved.version) as RunState
    expect(run.version).toBe(RUN_VERSION)
    expect(run.rigor).toBe(3)
    expect(run.stats.best).toBe(0)
    expect(run.battle?.enemy.phase).toBe(1)
    expect(run.battle?.exhausted).toEqual([])
    expect(run.battle?.played).toHaveLength(saved.state.run.battle.played.length)
    expect(run.battle?.hand).toEqual(saved.state.run.battle.hand)
    let next = battleAction(run, endTurn)
    expect(next.battle?.turn ?? 99).toBeGreaterThan(run.battle?.turn as number)
    for (let i = 0; i < 30 && next.screen === 'battle'; i++) next = battleAction(next, endTurn)
    expect(['reward', 'defeat']).toContain(next.screen)
    if (next.screen === 'reward') expect(leaveReward(skipCards(next)).screen).toBe('map')
  })

  it('a version 3 save at a shop gets the reading room; anything unreadable starts fresh', () => {
    const { rigor: _rigor, eventsSeen: _seen, ...v3 } = { ...newRun('empiricist', 8), version: 3 }
    const shop = { cards: [], relics: [], removePrice: 50, removed: false }
    const run = migrateRun({ ...v3, screen: 'shop', shop }, 3) as RunState
    expect(run.shop?.teaTaken).toBe(false)
    expect(run.eventsSeen).toEqual([])
    expect(migrateRun('nonsense', 3)).toBeNull()
    expect(migrateRun({}, 2)).toBeNull()
  })

  it('upgrading at an encounter costs nothing until a card is chosen', () => {
    const run: RunState = { ...newRun('empiricist', 6), resolve: 30, screen: 'event', event: { eventId: 'cafe', relicOffer: null, cardOffer: [], result: null } }
    const picking = chooseEvent(run, 'journal')
    expect(picking.resolve).toBe(30)
    const target = picking.deck.find(canUpgrade) as { uid: number }
    expect(pickCard(picking, target.uid).resolve).toBe(25)
  })
})
