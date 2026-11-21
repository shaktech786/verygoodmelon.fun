import { canPlay, endTurn, incomingDamage, playCard, previewArgument, undoPlay } from '@/lib/games/thought-pockets/engine/battle'
import {
  availableNodes,
  battleAction,
  buyCard,
  buyRelic,
  buyTea,
  chooseEvent,
  chooseNode,
  eventChoiceAvailable,
  leaveEvent,
  leaveReward,
  leaveShop,
  newRun,
  pickCard,
  reconsider,
  restHeal,
  skipCards,
  startRestRemoval,
  startRestUpgrade,
  startShopRemoval,
  takeCard,
  takeRelic,
} from '@/lib/games/thought-pockets/engine/run'
import { canUpgrade, getCardDef, isDoubt, resolveCard } from '@/lib/games/thought-pockets/data/cards'
import { getEnemyDef } from '@/lib/games/thought-pockets/data/enemies'
import { BattleState, CardDef, CardInstance, CardType, MapNode, Mode, RunLength, RunState, School } from '@/types/thought-pockets'

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
    (after.enemy.unsettle - before.enemy.unsettle) * w.unsettle +
    (after.enemy.shaken - before.enemy.shaken) -
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

function playFreeEngines(battle: BattleState): BattleState {
  let state = battle
  for (;;) {
    const free = state.hand.find((c) => isFreeEngine(c) && canPlay(state, c.uid))
    if (!free) return state
    state = playCard(state, free.uid)
  }
}

function replayWithLast(battle: BattleState, played: CardInstance[], last: CardInstance): BattleState {
  let state = battle
  for (let i = 0; i < played.length; i++) state = undoPlay(state)
  for (const c of [...played.filter((p) => p !== last), last]) state = playCard(state, c.uid)
  return state
}

/**
 * The previous screen-reading UI driver's habit, kept as a reference: covers a hit of 5 or more
 * with Guard, adds the cheapest and heaviest cards it can afford, then tries each as the Conclusion.
 */
export const uiDriver: TurnPolicy = (battle) => {
  let state = playFreeEngines(battle)
  for (;;) {
    if (previewArgument(state).incomingAfterGuard < 5) break
    const guard = state.hand.find((c) => resolveCard(c).type === 'guard' && canPlay(state, c.uid))
    if (!guard) break
    state = playCard(state, guard.uid)
  }
  const chosen: CardInstance[] = []
  for (;;) {
    const options = state.hand
      .filter((c) => canPlay(state, c.uid) && resolveCard(c).type !== 'guard')
      .sort((a, b) => resolveCard(a).cost - resolveCard(b).cost || (resolveCard(b).weight ?? 0) - (resolveCard(a).weight ?? 0))
    if (options.length === 0) break
    state = playCard(state, options[0].uid)
    chosen.push(options[0])
  }
  let best = state
  for (const last of chosen) {
    const attempt = replayWithLast(state, chosen, last)
    if (previewArgument(attempt).damage > previewArgument(best).damage) best = attempt
  }
  return endTurn(best)
}

/** What a careful player can read off the screen for the argument as it stands. */
function screenValue(state: BattleState): number {
  const p = previewArgument(state)
  if (p.enemyFalls) return 1e6 - p.selfLoss
  const usual = p.incomingAfterGuard + p.selfLoss
  if (usual >= state.player.resolve) return -1e6
  const risky = p.risk ? p.risk.afterGuard + p.selfLoss : usual
  if (risky >= state.player.resolve) return -1e5
  const loss = p.risk ? usual * (1 - p.risk.chance) + risky * p.risk.chance : usual
  const lasting = getEnemyDef(state.enemy.id).rule === 'status_quo' ? p.blocked : 0
  return p.damage - p.healedBack + lasting - 1.5 * loss + 2 * p.unsettle - 3 * p.growth
}

/**
 * A careful human who never sees the next draw: adds whichever card, or pair of cards, the preview
 * says helps most, stops when nothing helps (unspent Focus becomes Guard), then tries each card as the Conclusion.
 */
export const careful: TurnPolicy = (battle) => {
  let state = playFreeEngines(battle)
  const chosen: CardInstance[] = []
  for (;;) {
    let best: { cards: CardInstance[]; value: number } | null = null
    for (const c of state.hand) {
      if (!canPlay(state, c.uid)) continue
      const once = playCard(state, c.uid)
      const value = screenValue(once)
      if (!best || value > best.value) best = { cards: [c], value }
      for (const d of once.hand) {
        if (!canPlay(once, d.uid)) continue
        const twice = screenValue(playCard(once, d.uid))
        if (twice > best.value) best = { cards: [c, d], value: twice }
      }
    }
    if (!best || best.value <= screenValue(state)) break
    for (const c of best.cards) state = playCard(state, c.uid)
    chosen.push(...best.cards)
  }
  let best = state
  for (const last of chosen) {
    const attempt = replayWithLast(state, chosen, last)
    if (attempt.played.length === chosen.length && screenValue(attempt) > screenValue(best)) best = attempt
  }
  return endTurn(best)
}

/**
 * The reviewers' newcomer, played through the UI: Rhetoric first, then Logic, then the lightest
 * Evidence, with one Guard card when the screen says it will lose 6 or more. Slow, but honest.
 */
export const newcomer: TurnPolicy = (battle) => {
  let state = battle
  let guarded = false
  for (let k = 0; k < 7; k++) {
    const p = previewArgument(state)
    if (p.enemyFalls) break
    const playable = state.hand.filter((c) => canPlay(state, c.uid))
    const of = (type: CardType) => playable.filter((c) => resolveCard(c).type === type)
    const evidence = of('evidence').sort((a, b) => (resolveCard(a).weight ?? 0) - (resolveCard(b).weight ?? 0))
    const next = (p.incomingAfterGuard >= 6 && !guarded && of('guard')[0]) || of('rhetoric')[0] || of('logic')[0] || evidence[0] || of('guard')[0]
    if (!next) break
    if (resolveCard(next).type === 'guard') guarded = true
    state = playCard(state, next.uid)
  }
  return endTurn(state)
}

function faceValue(card: CardInstance): number {
  const def = resolveCard(card)
  return (def.weight ?? 0) + (def.multiplier ?? 0) * 8 + (def.unsettle ?? 0) * 2 + (def.restore ?? 0) / 2 + (def.draw ?? 0) * 3
}

/**
 * A sensible newcomer: blocks a big hit with one Guard card, then plays the cards that look
 * strongest and finishes on the strongest one. It never reads the enemy's rule or tries orders.
 */
export const firstTimer: TurnPolicy = (battle) => {
  let state = playFreeEngines(battle)
  const isGuard = (c: CardInstance) => resolveCard(c).type === 'guard'
  if (incomingDamage(state, 0).total >= 8) {
    const guard = state.hand.find((c) => isGuard(c) && canPlay(state, c.uid))
    if (guard) state = playCard(state, guard.uid)
  }
  const playable = (s: BattleState) => s.hand.filter((c) => canPlay(s, c.uid))
  const finisher = playable(state)
    .filter((c) => !isGuard(c))
    .sort((a, b) => faceValue(b) - faceValue(a))[0]
  if (!finisher) return endTurn(state)
  const keepsFinisher = (s: BattleState) => canPlay(s, finisher.uid)
  for (;;) {
    const next = playable(state)
      .filter((c) => c !== finisher && keepsFinisher(playCard(state, c.uid)))
      .sort((a, b) => Number(isGuard(a)) - Number(isGuard(b)) || faceValue(b) - faceValue(a))[0]
    if (!next) break
    state = playCard(state, next.uid)
  }
  return endTurn(playCard(state, finisher.uid))
}

interface Candidate {
  order: CardInstance[]
  damage: number
  covered: number
  repeats: number
  conclusionType: CardType
}

/**
 * Habits rank every affordable argument the same way. Blind, a habit judges arguments as if the
 * enemy had no rule; aware, it judges them by the real preview. The gap is what reading the rule is worth.
 */
function habit(rank: (c: Candidate, battle: BattleState) => number, aware: boolean): TurnPolicy {
  return (battle) => {
    const neutral = (state: BattleState): BattleState => ({ ...state, enemy: { ...state.enemy, id: 'jumping_to_conclusions', guard: 0 }, lastConclusionType: null })
    const incoming = incomingDamage(battle, 0).total
    const cards = battle.hand.filter((c) => !isDoubt(c))
    let best: CardInstance[] = []
    let bestRank = -Infinity
    for (let mask = 1; mask < 1 << cards.length; mask++) {
      const chosen = cards.filter((_, i) => mask & (1 << i))
      for (const conclusion of chosen) {
        const order = [...chosen.filter((c) => c !== conclusion), conclusion]
        const attempt = order.reduce((state, c) => playCard(state, c.uid), battle)
        if (attempt.played.length !== order.length) continue
        const names = order.map((c) => c.cardId)
        const real = previewArgument(attempt)
        const seen = aware ? real : previewArgument(neutral(attempt))
        const candidate: Candidate = {
          order,
          damage: aware ? real.damage - real.healedBack - real.selfLoss - 3 * real.growth : seen.raw,
          covered: aware ? (real.enemyFalls ? incoming : real.incoming - real.incomingAfterGuard) : Math.min(seen.guard, incoming),
          repeats: names.length - new Set(names).size,
          conclusionType: resolveCard(conclusion).type,
        }
        const r = rank(candidate, battle)
        if (r > bestRank) {
          bestRank = r
          best = order
        }
      }
    }
    return endTurn(best.reduce((state, c) => playCard(state, c.uid), battle))
  }
}

const HABIT_RANKS: [string, (c: Candidate, battle: BattleState) => number][] = [
  ['reckless', (c) => c.damage],
  ['cover-then-burst', (c) => c.covered * 3 + c.damage],
  ['cover-then-lean', (c) => c.covered * 3 + c.damage - 4 * c.order.length],
  ['cover-then-wide', (c) => c.covered * 3 + c.damage + 5 * c.order.length],
  ['cover-then-vary', (c, b) => c.covered * 3 + c.damage + (c.repeats === 0 && c.conclusionType !== b.lastConclusionType ? 12 : 0)],
]

export const HABITS: [string, TurnPolicy][] = HABIT_RANKS.map(([name, rank]) => [name, habit(rank, false)])
export const AWARE_HABITS: [string, TurnPolicy][] = HABIT_RANKS.map(([name, rank]) => [`${name}, rule read`, habit(rank, true)])

type DraftStyle = 'archetype' | 'first' | 'skip'

const TAKE_THRESHOLD = 1.1
const DUPLICATE_DISCOUNT = 0.7

/** Roughly how much a card adds per Focus compared with an Observation (1.0), given the deck it joins. */
function cardValue(def: CardDef, run: RunState): number {
  const defs = run.deck.map(resolveCard)
  const evidence = defs.filter((d) => d.type === 'evidence').length
  const logic = defs.filter((d) => d.type === 'logic').length
  const doubtShare = defs.filter((d) => d.type === 'doubt').length / Math.max(1, defs.length)
  const guardCards = defs.filter((d) => d.guard).length
  const unsettlers = defs.filter((d) => d.unsettle || d.unsettlePerCard).length
  const cost = Math.max(def.cost, 0.5)
  let value = 0
  const weight =
    (def.weight ?? 0) +
    (def.weightPerOtherEvidence ?? 0) * 2 +
    (def.weightIfLowResolve ?? 0) * 0.4 +
    (def.weightPerDoubtInHand ?? 0) * doubtShare * 5 +
    (def.weightPerEarlierEvidence ?? 0) * 4 +
    (def.weightPerUnsettle ?? 0) * Math.min(12, 2 + unsettlers * 3) +
    (def.weightPerMissingResolve ?? 0) * 16 +
    (def.weightPerGuard ?? 0) * Math.min(14, 2 + guardCards * 2)
  value += weight / cost / 4
  const multiplier =
    (def.multiplier ?? 0) +
    (def.multiplierPerEvidence ?? 0) * 2 +
    (def.multiplierPerOtherLogic ?? 0) * 0.7 +
    (def.multiplierPerEarlierCard ?? 0) * 1.5 +
    (def.multiplierPerDoubtInHand ?? 0) * (1 + doubtShare * 5)
  const logicNeed = Math.min(1.5, Math.max(0.4, evidence / (2 * (logic + 1))))
  value += (multiplier / cost / 0.5) * logicNeed
  const guard = (def.guard ?? 0) + (def.guardPerEvidence ?? 0) * 1.5 + (def.guardPerDoubtInHand ?? 0) * doubtShare * 5
  value += (guard / cost / 5) * 0.8
  value += (def.draw ?? 0) * (def.cost === 0 ? 0.8 : 0.35)
  value += (def.focus ?? 0) * 1.2
  value += (((def.unsettle ?? 0) + (def.unsettlePerCard ?? 0) * 3) * 1.5) / cost / 4
  value += (def.restore ?? 0) / cost / 8
  if (def.pierce) value += 0.3
  if (def.postpone) value += 1
  if (def.conclusionTimes) value += 0.5
  if (def.conclusionBonus) value += 0.8 * def.conclusionBonus
  value += ((def.lastingRestore ?? 0) * 0.3) / cost
  if (def.unsettleLasts) value += unsettlers > 2 || run.school === 'skeptic' ? 1 : 0.3
  value += ((def.lastingMultiplier ?? 0) * 2.5) / cost
  value += (def.nextTurnFocus ?? 0) * 0.9
  if (def.retain) value += 0.15
  if (def.exhaust) value *= 0.85
  if (def.school === run.school) value += 0.4
  if (def.addDoubt && run.school !== 'absurdist') value -= 0.4
  const copies = run.deck.filter((c) => c.cardId === def.id).length
  return value * DUPLICATE_DISCOUNT ** copies
}

/**
 * naive: first option everywhere. newcomer: the reviewers' newcomer, first option unless hurt, tea when low, the first card it can buy.
 * casual: like the UI driver, rests when low, avoids hard fights when hurt. careful: plans the route and the shop.
 */
export type RunHabits = 'naive' | 'newcomer' | 'casual' | 'careful'

export interface BotConfig {
  turn: TurnPolicy
  draft: DraftStyle
  habits: RunHabits
}

export interface FightRecord {
  enemyId: string
  floor: number
  tier: string
  turns: number
  won: boolean
  fullHealth: boolean
  lost: number
}

export interface RunRecord {
  won: boolean
  floor: number
  nodes: number
  defeatedBy: string | null
  fights: FightRecord[]
  deck: string[]
  relics: string[]
  /** The most turns any fight in the run took. */
  longestFight: number
  reconsidered: boolean
  goldLeft: number
  /** Every card offered as a reward, in a shop or at an encounter. */
  offered: string[]
  /** Turns across every fight, the measure of how long a run takes. */
  turns: number
  /** Resolve left when the run ended. */
  resolveLeft: number
}

function chooseNextNode(run: RunState, options: MapNode[], habits: RunHabits): MapNode {
  if (habits === 'naive') return options[0]
  const health = run.resolve / run.maxResolve
  if (habits === 'newcomer') return (health < 0.5 && options.find((n) => n.type === 'rest')) || options[0]
  if (habits === 'casual') {
    const rest = options.find((n) => n.type === 'rest')
    if (rest && health < 0.55) return rest
    return options.find((n) => n.type !== 'elite' || health > 0.75) ?? options[0]
  }
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
    cafe: run.resolve < run.maxResolve * 0.6 ? ['treat', 'journal'] : ['journal', 'treat'],
    archive: run.resolve > 25 ? ['dig', 'copy'] : ['copy', 'leave'],
    loud_certainty: run.resolve > 30 ? ['argue', 'let_go'] : ['let_go'],
    study_group: run.deck.some(isDoubt) || run.deck.length > 12 ? ['teach'] : ['learn', 'leave'],
    the_question: run.resolve < run.maxResolve * 0.5 ? ['admit'] : ['explain', 'admit'],
  }
  const choice = prefs[event.eventId].find((id) => eventChoiceAvailable(run, id)) ?? 'leave'
  const offer = [...event.cardOffer].sort((a, b) => cardValue(getCardDef(b), run) - cardValue(getCardDef(a), run))[0]
  let next = chooseEvent(run, choice, offer)
  if (next.pick === 'upgrade') next = pickCard(next, (upgradeTarget(next) as CardInstance).uid)
  if (next.pick === 'remove') next = pickCard(next, (removalTarget(next) as CardInstance).uid)
  if (next.pick === 'copy') next = pickCard(next, (copyTarget(next) as CardInstance).uid)
  if (!next.event?.result) next = chooseEvent(next, getEventChoices(next)[0])
  return leaveEvent(next)
}

function getEventChoices(run: RunState): string[] {
  return ['leave', 'nap', 'talk', 'loan', 'sell', 'let_go', 'admit'].filter((id) => eventChoiceAvailable(run, id))
}

function copyTarget(run: RunState): CardInstance | undefined {
  const playable = run.deck.filter((c) => !isDoubt(c))
  return [...playable].sort((a, b) => cardValue(resolveCard(b), run) - cardValue(resolveCard(a), run))[0]
}

function handleShop(run: RunState, habits: RunHabits): RunState {
  if (habits === 'naive') return leaveShop(run)
  let next = run
  if (habits === 'newcomer') {
    if (next.resolve < next.maxResolve * 0.6) next = buyTea(next)
    const first = (next.shop?.cards ?? []).findIndex((c) => !c.sold && c.price <= next.gold)
    return leaveShop(first >= 0 ? buyCard(next, first) : next)
  }
  if (habits === 'casual') {
    if (next.resolve < next.maxResolve * 0.5) next = buyTea(next)
    const started = startShopRemoval(next)
    if (started.pick) next = pickCard(started, (removalTarget(started) as CardInstance).uid)
    const best = (next.shop?.cards ?? []).map((c, i) => ({ i, value: cardValue(getCardDef(c.cardId), next) })).sort((a, b) => b.value - a.value)[0]
    if (best && best.value >= TAKE_THRESHOLD) next = buyCard(next, best.i)
    return leaveShop(next)
  }
  if (next.resolve < next.maxResolve * 0.6) next = buyTea(next)
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

/** Plays a whole run with the engine, reconsidering a lost fight whenever the run allows it. `observe` sees the run at the start of every battle turn. */
export function playRun(
  school: School,
  seed: number,
  config: BotConfig,
  observe?: (run: RunState) => void,
  mode: Mode = 'gentle',
  rigor?: number,
  length: RunLength = 'long',
): RunRecord {
  const habits = config.habits
  let run = newRun(school, seed, mode, [], rigor, length)
  const fights: FightRecord[] = []
  const offered: string[] = []
  let reconsidered = false
  for (let guard = 0; guard < 500; guard++) {
    if (run.screen === 'defeat' && run.reconsiders > 0) {
      run = reconsider(run)
      reconsidered = true
    }
    if (run.screen === 'victory' || run.screen === 'defeat') break
    switch (run.screen) {
      case 'map': {
        const node = chooseNextNode(run, availableNodes(run), habits)
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
        fights.push({
          enemyId,
          floor: run.floor,
          tier: getEnemyDef(enemyId).tier,
          turns: last.turn,
          won: run.screen !== 'defeat',
          fullHealth: run.screen !== 'defeat' && last.player.resolve >= startResolve,
          lost: startResolve - last.player.resolve,
        })
        break
      }
      case 'reward': {
        const reward = run.reward
        offered.push(...(reward?.cardChoices ?? []))
        if (reward && !reward.relicTaken) run = takeRelic(run, reward.relicChoices[0])
        run = leaveReward(draft(run, config.draft))
        break
      }
      case 'rest': {
        const healed = restHeal(run)
        if (healed !== run && (habits === 'naive' || habits === 'newcomer' || run.resolve < run.maxResolve * (habits === 'casual' ? 0.7 : 0.6))) run = healed
        else if (habits === 'careful' && run.deck.some(isDoubt)) {
          const started = startRestRemoval(run)
          run = pickCard(started, (removalTarget(started) as CardInstance).uid)
        } else {
          const started = startRestUpgrade(run)
          const target = upgradeTarget(started)
          run = started.pick && target ? pickCard(started, target.uid) : healed !== run ? healed : pickCard(startRestRemoval(run), (removalTarget(run) as CardInstance).uid)
        }
        break
      }
      case 'shop':
        offered.push(...(run.shop?.cards.map((c) => c.cardId) ?? []))
        run = handleShop(run, habits)
        break
      case 'event':
        offered.push(...(run.event?.cardOffer ?? []))
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
    longestFight: Math.max(0, ...fights.map((f) => f.turns)),
    reconsidered,
    goldLeft: run.gold,
    offered,
    turns: fights.reduce((sum, f) => sum + f.turns, 0),
    resolveLeft: run.resolve,
  }
}
