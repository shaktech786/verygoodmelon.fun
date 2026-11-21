import { MAX_TURNS, canPlay, endTurn, incomingDamage, playCard, previewArgument } from '@/lib/games/thought-pockets/engine/battle'
import {
  availableNodes,
  battleAction,
  buyCard,
  buyRelic,
  chooseEvent,
  chooseNode,
  eventChoiceAvailable,
  leaveEvent,
  leaveReward,
  leaveShop,
  newRun,
  pickCard,
  restHeal,
  skipCards,
  startRestUpgrade,
  startShopRemoval,
  takeCard,
  takeRelic,
} from '@/lib/games/thought-pockets/engine/run'
import { canUpgrade, getCardDef, isDoubt, resolveCard } from '@/lib/games/thought-pockets/data/cards'
import { getEnemyDef } from '@/lib/games/thought-pockets/data/enemies'
import { BattleState, CardDef, CardInstance, CardType, MapNode, RunState, School } from '@/types/thought-pockets'

export type TurnPolicy = (battle: BattleState) => BattleState

/** Plays every affordable card from left to right, then ends the turn. Reads nothing. */
export const leftToRight: TurnPolicy = (battle) => {
  let state = battle
  for (;;) {
    const next = state.hand.find((c) => canPlay(state, c.uid))
    if (!next) break
    state = playCard(state, next.uid)
  }
  return endTurn(state)
}

interface Weights {
  defence: number
  unsettle: number
}

function score(before: BattleState, after: BattleState, w: Weights): number {
  if (after.outcome === 'won') return 1e6 + after.player.resolve * 10
  if (after.outcome === 'lost') return -1e6
  const enemyLoss = before.enemy.health - after.enemy.health
  const playerLoss = before.player.resolve - after.player.resolve
  const growth = after.enemy.strength - before.enemy.strength
  return (
    enemyLoss -
    playerLoss * w.defence +
    (after.enemy.unsettle - before.enemy.unsettle) * w.unsettle -
    growth * 3 * w.defence +
    after.carriedWeight * 0.7 -
    (after.enemy.guard - before.enemy.guard) * 0.3
  )
}

function isFreeEngine(card: CardInstance): boolean {
  const def = resolveCard(card)
  return def.cost === 0 && Boolean(def.draw || def.focus) && !def.addDoubt
}

/**
 * Reads the intent and tries every set of cards it can afford, with each card as the Conclusion,
 * and keeps whichever turn the engine says ends best. It peeks at the next draw through endTurn,
 * which flatters it slightly.
 */
export function planner(weights: Weights = { defence: 2.5, unsettle: 3 }): TurnPolicy {
  return (battle) => {
    let state = battle
    for (;;) {
      const free = state.hand.find((c) => isFreeEngine(c) && canPlay(state, c.uid))
      if (!free) break
      state = playCard(state, free.uid)
    }
    const candidates = state.hand.filter((c) => !isDoubt(c))
    const anchoring = getEnemyDef(state.enemy.id).rule === 'anchoring'
    let best = endTurn(state)
    let bestScore = score(battle, best, weights)
    const n = candidates.length
    for (let mask = 1; mask < 1 << n; mask++) {
      const chosen = candidates.filter((_, i) => mask & (1 << i))
      if (chosen.reduce((sum, c) => sum + resolveCard(c).cost, 0) > state.focus + 1) continue
      for (const conclusion of chosen) {
        const rest = chosen.filter((c) => c !== conclusion)
        const order = anchoring ? [conclusion, ...rest] : [...rest, conclusion]
        let attempt = state
        let legal = true
        for (const c of order) {
          const next = playCard(attempt, c.uid)
          if (next === attempt) {
            legal = false
            break
          }
          attempt = next
        }
        if (!legal) continue
        const result = endTurn(attempt)
        const s = score(battle, result, weights)
        if (s > bestScore) {
          bestScore = s
          best = result
        }
      }
    }
    return best
  }
}

export const planning = planner()

interface Candidate {
  order: CardInstance[]
  damage: number
  guard: number
  repeats: number
  conclusionType: CardType
}

/**
 * Rule-blind habits: each judges an argument as if the enemy had no special rule,
 * so the enemy's rule decides which habit works best against it.
 */
function habit(name: string, rank: (c: Candidate, battle: BattleState, incoming: number) => number): [string, TurnPolicy] {
  return [
    name,
    (battle) => {
      const neutral = (state: BattleState): BattleState => ({ ...state, enemy: { ...state.enemy, id: 'jumping_to_conclusions', guard: 0 }, lastConclusionType: null })
      const incoming = incomingDamage(battle, 0).total
      const cards = battle.hand.filter((c) => !isDoubt(c))
      let best: CardInstance[] = []
      let bestRank = -Infinity
      for (let mask = 1; mask < 1 << cards.length; mask++) {
        const chosen = cards.filter((_, i) => mask & (1 << i))
        for (const conclusion of chosen) {
          const order = [...chosen.filter((c) => c !== conclusion), conclusion]
          let attempt = battle
          let legal = true
          for (const c of order) {
            const next = playCard(attempt, c.uid)
            if (next === attempt) {
              legal = false
              break
            }
            attempt = next
          }
          if (!legal) continue
          const preview = previewArgument(neutral(attempt))
          const names = order.map((c) => c.cardId)
          const candidate: Candidate = {
            order,
            damage: preview.raw,
            guard: preview.guard,
            repeats: names.length - new Set(names).size,
            conclusionType: resolveCard(conclusion).type,
          }
          const r = rank(candidate, battle, incoming)
          if (r > bestRank) {
            bestRank = r
            best = order
          }
        }
      }
      return endTurn(best.reduce((state, c) => playCard(state, c.uid), battle))
    },
  ]
}

export const HABITS: [string, TurnPolicy][] = [
  habit('reckless', (c) => c.damage),
  habit('cover-then-burst', (c, _b, incoming) => Math.min(c.guard, incoming) * 3 + c.damage),
  habit('cover-then-lean', (c, _b, incoming) => Math.min(c.guard, incoming) * 3 + c.damage - 4 * c.order.length),
  habit('cover-then-wide', (c, _b, incoming) => Math.min(c.guard, incoming) * 3 + c.damage + 5 * c.order.length),
  habit('cover-then-vary', (c, b, incoming) =>
    Math.min(c.guard, incoming) * 3 + c.damage + (c.repeats === 0 && c.conclusionType !== b.lastConclusionType ? 12 : 0),
  ),
]

type DraftStyle = 'archetype' | 'first' | 'skip'

const TAKE_THRESHOLD = 1.1

/** Roughly how much a card adds per Focus compared with an Observation (1.0), given the deck it joins. */
function cardValue(def: CardDef, run: RunState): number {
  const defs = run.deck.map(resolveCard)
  const evidence = defs.filter((d) => d.type === 'evidence').length
  const logic = defs.filter((d) => d.type === 'logic').length
  const doubtShare = defs.filter((d) => d.type === 'doubt').length / Math.max(1, defs.length)
  const cost = Math.max(def.cost, 0.5)
  let value = 0
  const weight =
    (def.weight ?? 0) +
    (def.weightPerOtherEvidence ?? 0) * 2 +
    (def.weightIfLowResolve ?? 0) * 0.4 +
    (def.weightPerDoubtInHand ?? 0) * doubtShare * 5
  value += weight / cost / 4
  const multiplier = (def.multiplier ?? 0) + (def.multiplierPerEvidence ?? 0) * 2 + (def.multiplierPerOtherLogic ?? 0) * 0.7
  const logicNeed = Math.min(1.5, Math.max(0.4, evidence / (2 * (logic + 1))))
  value += (multiplier / cost / 0.5) * logicNeed
  value += ((def.guard ?? 0) / cost / 5) * 0.8
  value += (def.draw ?? 0) * (def.cost === 0 ? 0.8 : 0.35)
  value += (def.focus ?? 0) * 1.2
  value += (((def.unsettle ?? 0) + (def.unsettlePerCard ?? 0) * 3) * 2.5) / cost / 4
  value += (def.restore ?? 0) / cost / 8
  if (def.pierce) value += 0.3
  if (def.postpone) value += 1
  if (def.conclusionTimes) value += 0.5
  if (def.school === run.school) value += 0.4
  if (def.addDoubt && run.school !== 'absurdist') value -= 0.4
  return value
}

export interface BotConfig {
  turn: TurnPolicy
  draft: DraftStyle
  careful: boolean
}

export interface FightRecord {
  enemyId: string
  tier: string
  turns: number
  won: boolean
  fullHealth: boolean
}

export interface RunRecord {
  won: boolean
  floor: number
  nodes: number
  defeatedBy: string | null
  fights: FightRecord[]
  deck: string[]
  relics: string[]
  hitTurnCap: boolean
}

function chooseNextNode(run: RunState, options: MapNode[], careful: boolean): MapNode {
  if (!careful) return options[0]
  const health = run.resolve / run.maxResolve
  const rank = (node: MapNode): number => {
    switch (node.type) {
      case 'rest':
        return health < 0.5 ? 10 : 2
      case 'elite':
        return health > 0.7 ? 7 : -5
      case 'battle':
        return 5
      case 'treasure':
        return 8
      case 'shop':
        return run.gold >= 70 ? 6 : 1
      case 'event':
        return 4
      case 'boss':
        return 0
    }
  }
  return [...options].sort((a, b) => rank(b) - rank(a))[0]
}

function upgradeTarget(run: RunState): CardInstance | undefined {
  const upgradable = run.deck.filter(canUpgrade)
  const gain = (c: CardInstance) => cardValue(resolveCard({ ...c, upgraded: true }), run) - cardValue(resolveCard(c), run)
  return [...upgradable].sort((a, b) => gain(b) - gain(a))[0]
}

function removalTarget(run: RunState): CardInstance | undefined {
  return run.deck.find(isDoubt) ?? run.deck.find((c) => c.cardId === 'observation') ?? run.deck.find((c) => c.cardId === 'caveat')
}

function draft(run: RunState, style: DraftStyle): RunState {
  const reward = run.reward
  if (!reward || reward.cardTaken) return run
  if (style === 'skip') return skipCards(run)
  if (style === 'first') return takeCard(run, reward.cardChoices[0])
  const ranked = [...reward.cardChoices].sort((a, b) => cardValue(getCardDef(b), run) - cardValue(getCardDef(a), run))
  if (cardValue(getCardDef(ranked[0]), run) < TAKE_THRESHOLD) return skipCards(run)
  return takeCard(run, ranked[0])
}

function handleEvent(run: RunState): RunState {
  const event = run.event
  if (!event) return run
  const prefs: Record<string, string[]> = {
    lecture: run.resolve > 20 ? ['attend'] : ['leave'],
    library: run.resolve < run.maxResolve * 0.6 ? ['nap'] : ['study', 'nap'],
    bookseller: run.deck.some(isDoubt) ? ['remove', 'leave'] : ['leave'],
    old_friend: ['talk'],
    mirror: run.school === 'absurdist' ? ['take'] : run.deck.some(isDoubt) ? ['clear', 'leave'] : ['leave'],
  }
  const choice = prefs[event.eventId].find((id) => eventChoiceAvailable(run, id)) ?? 'leave'
  let next = chooseEvent(run, choice, event.cardOffer[0])
  if (next.pick === 'upgrade') next = pickCard(next, (upgradeTarget(next) as CardInstance).uid)
  if (next.pick === 'remove') next = pickCard(next, (removalTarget(next) as CardInstance).uid)
  if (!next.event?.result) next = chooseEvent(next, getEventChoices(next)[0])
  return leaveEvent(next)
}

function getEventChoices(run: RunState): string[] {
  return ['leave', 'nap', 'talk', 'loan', 'sell'].filter((id) => eventChoiceAvailable(run, id))
}

function handleShop(run: RunState, careful: boolean): RunState {
  if (!careful) return leaveShop(run)
  let next = run
  const shop = next.shop
  if (!shop) return run
  if (next.deck.some(isDoubt) || next.deck.length > 12) {
    const target = removalTarget(next)
    const started = startShopRemoval(next)
    if (target && started.pick) next = pickCard(started, target.uid)
  }
  shop.relics.forEach((_, i) => {
    next = buyRelic(next, i)
  })
  const cards = (next.shop?.cards ?? [])
    .map((c, i) => ({ i, value: cardValue(getCardDef(c.cardId), next) }))
    .sort((a, b) => b.value - a.value)
  for (const { i, value } of cards) if (value >= TAKE_THRESHOLD + 0.2) next = buyCard(next, i)
  return leaveShop(next)
}

/** Plays a whole run with the engine. `observe` sees the run at the start of every battle turn. */
export function playRun(school: School, seed: number, config: BotConfig, observe?: (run: RunState) => void): RunRecord {
  const careful = config.careful
  let run = newRun(school, seed)
  const fights: FightRecord[] = []
  let hitTurnCap = false
  for (let guard = 0; guard < 500; guard++) {
    if (run.screen === 'victory' || run.screen === 'defeat') break
    switch (run.screen) {
      case 'map': {
        const node = chooseNextNode(run, availableNodes(run), careful)
        run = chooseNode(run, node.id)
        break
      }
      case 'battle': {
        const battle = run.battle as BattleState
        const enemyId = battle.enemy.id
        const startResolve = battle.player.resolve
        let last = battle
        while (last.outcome === 'ongoing') {
          observe?.({ ...run, battle: last })
          last = config.turn(last)
        }
        const finished = last
        run = battleAction(run, () => finished)
        if (last.turn >= MAX_TURNS) hitTurnCap = true
        fights.push({
          enemyId,
          tier: getEnemyDef(enemyId).tier,
          turns: last.turn,
          won: run.screen !== 'defeat',
          fullHealth: run.screen !== 'defeat' && last.player.resolve >= startResolve,
        })
        break
      }
      case 'reward': {
        const reward = run.reward
        if (reward && !reward.relicTaken) run = takeRelic(run, reward.relicChoices[0])
        run = leaveReward(draft(run, config.draft))
        break
      }
      case 'rest': {
        if (run.resolve < run.maxResolve * 0.6 || !careful) run = restHeal(run)
        else {
          const started = startRestUpgrade(run)
          const target = upgradeTarget(started)
          run = started.pick && target ? pickCard(started, target.uid) : restHeal(run)
        }
        break
      }
      case 'shop':
        run = handleShop(run, careful)
        break
      case 'event':
        run = handleEvent(run)
        break
    }
  }
  return {
    won: run.screen === 'victory',
    floor: run.floor,
    nodes: run.stats.nodes,
    defeatedBy: run.defeatedBy,
    fights,
    deck: run.deck.map((c) => c.cardId),
    relics: run.relics,
    hitTurnCap,
  }
}
