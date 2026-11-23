import {
  BattleState,
  CardDef,
  CardInstance,
  EventId,
  EventState,
  MapNode,
  Mode,
  RelicId,
  RewardState,
  RoundReport,
  RunLength,
  RunState,
  School,
  ShopState,
} from '@/types/thought-pockets'
import { CARDS, canUpgrade, getCardDef, isDoubt, usesKeyword } from '../data/cards'
import { getSchoolDef } from '../data/schools'
import { RELICS } from '../data/relics'
import { REST_HEAL_PERCENT, RIGOR, RIGOROUS_FLOOR_HEAL, TIRING } from '../data/pace'
import { OPENERS, SHORT_WALK_PROBLEMS, TUTORIAL_ENEMY, enemiesFor } from '../data/enemies'
import { fitsLabel } from '../data/synergy'
import {
  ARCHIVE_COST,
  ARGUE_COST,
  BOOKSELLER_PAY,
  BOOKSELLER_PRICE,
  CAFE_HEAL,
  CAFE_PRICE,
  COPY_PRICE,
  EVENTS,
  FRIEND_GOLD,
  FRIEND_MAX,
  JOURNAL_COST,
  LECTURE_COST,
  LET_GO_HEAL,
  LIBRARY_REST,
  MIRROR_MAX_LOSS,
  QUESTION_COST,
  QUESTION_MAX,
  TEACH_GOLD,
  getEventDef,
} from '../data/events'
import { createBattle, incomingDamage } from './battle'
import {
  CARD_PRICES,
  FIGHT_GOLD,
  FIGHT_GOLD_SPREAD,
  RELIC_PRICE,
  REMOVE_BASE_PRICE,
  REMOVE_PRICE_STEP,
  START_GOLD,
  TEA_FLASK_HEAL,
  TEA_HEAL,
  TEA_PRICE,
  shopPrice,
} from './economy'
import { generateFloor } from './map'
import { pick, roll, rollInt, seedRng, shuffle } from './rng'

export const RUN_VERSION = 10
export const START_RESOLVE = 60
export const RUN_FLOORS: Record<RunLength, number> = { short: 1, long: 3 }
/** Below this share of your Resolve, the map warns before any fight. */
const LOW_RESOLVE_SHARE = 0.25
const DEFAULT_RIGOR = RIGOR.harder
const CARD_CHOICES = 3
const RELIC_CHOICES = 2
export const RULE_BENDING_CHOICES = 2
const SHOP_CARDS = 4
const SHOP_RELICS = 2

type Rarity = 'common' | 'uncommon' | 'rare'

function instances(cardIds: string[], firstUid: number): CardInstance[] {
  return cardIds.map((cardId, i) => ({ uid: firstUid + i, cardId, upgraded: false }))
}

/**
 * `known` lists the opponents beaten in earlier runs. In Rigorous, `rigor` is the level from 1 to MAX_RIGOR;
 * left out, a Rigorous run plays at level 3, the old single Rigorous setting. A `teach`ing run opens with the
 * fight the first-fight hints are written for; otherwise the seed draws the opening fight.
 */
export function newRun(
  school: School,
  seed: number,
  mode: Mode = 'gentle',
  known: string[] = [],
  rigor?: number,
  length: RunLength = 'long',
  teach = true,
): RunState {
  const level = mode === 'gentle' ? 0 : rigor ?? DEFAULT_RIGOR
  const opener = teach ? { item: TUTORIAL_ENEMY, rng: seedRng(seed) } : pick([...OPENERS], seedRng(seed))
  const floor = generateFloor(1, opener.rng, mode === 'gentle', { opener: opener.item, problems: length === 'short' ? SHORT_WALK_PROBLEMS : undefined })
  const deck = instances([...getSchoolDef(school).deck, ...(level >= RIGOR.doubt ? ['doubt'] : [])], 1)
  return {
    version: RUN_VERSION,
    seed,
    rng: floor.rng,
    school,
    mode,
    length,
    rigor: level,
    reconsiders: level >= RIGOR.noMercy ? 0 : 1,
    known,
    floor: 1,
    map: floor.nodes,
    position: null,
    visited: [],
    resolve: START_RESOLVE,
    maxResolve: START_RESOLVE,
    gold: START_GOLD,
    deck,
    nextUid: deck.length + 1,
    relics: [],
    removals: 0,
    screen: 'map',
    battle: null,
    reward: null,
    shop: null,
    event: null,
    eventsSeen: [],
    pick: null,
    defeatedBy: null,
    defeatRound: null,
    beaten: [],
    stats: { turns: 0, fights: 0, nodes: 0, best: 0 },
    bestArgument: null,
  }
}

export function availableNodes(run: RunState): MapNode[] {
  if (run.screen !== 'map') return []
  if (run.position === null) return run.map.filter((n) => n.row === 0)
  const current = run.map.find((n) => n.id === run.position)
  return current ? run.map.filter((n) => current.next.includes(n.id)) : []
}

function addCard(run: RunState, cardId: string): RunState {
  const card: CardInstance = { uid: run.nextUid, cardId, upgraded: false }
  return { ...run, deck: [...run.deck, card], nextUid: run.nextUid + 1 }
}

function cardPool(run: RunState, rarity: Rarity): CardDef[] {
  return CARDS.filter(
    (card) =>
      card.rarity === rarity &&
      (run.floor > 1 || !usesKeyword(card) || card.school === run.school),
  )
}

function rollRarity(rng: number, source: RewardState['source'] | 'shop'): { rarity: Rarity; rng: number } {
  const r = roll(rng)
  const percent = r.value * 100
  const [common, uncommon] = source === 'boss' ? [0, 55] : source === 'elite' ? [40, 85] : [60, 92]
  const rarity: Rarity = percent < common ? 'common' : percent < uncommon ? 'uncommon' : 'rare'
  return { rarity, rng: r.rng }
}

/** A rare to build around: one of your school's you do not have yet, when there is one. */
function buildAroundRare(run: RunState, taken: string[], rng: number): { cardId: string; rng: number } {
  const open = CARDS.filter((c) => c.rarity === 'rare' && !taken.includes(c.id) && !run.deck.some((d) => d.cardId === c.id))
  const own = open.filter((c) => c.school === run.school)
  const choice = pick(own.length > 0 ? own : open.length > 0 ? open : CARDS.filter((c) => c.rarity === 'rare' && !taken.includes(c.id)), rng)
  return { cardId: choice.item.id, rng: choice.rng }
}

/** How many of a problem's card offers come from your school, or fit what you already own. */
export const BOSS_SCHOOL_SLOTS = 2

/** Your school's cards, or another card that fits what you own. */
export function inOrNearSchool(run: RunState, cardId: string): boolean {
  const card = getCardDef(cardId)
  return card.school === run.school || (card.school === undefined && fitsLabel(cardId, run) !== null)
}

/**
 * On the first floor the first offer leans toward your school so a build can start; a problem's first
 * offers come from your school or fit your build, and the first problem always offers one of your school's
 * rares you lack. Every other offer comes from everything.
 */
function rollCards(run: RunState, count: number, source: RewardState['source'] | 'shop'): { cards: string[]; rng: number } {
  let state = run.rng
  const cards: string[] = []
  for (let i = 0; i < count; i++) {
    const rarity = rollRarity(state, source)
    state = rarity.rng
    if (i === 0 && run.floor === 1 && source === 'boss') {
      const rare = buildAroundRare(run, cards, state)
      state = rare.rng
      cards.push(rare.cardId)
      continue
    }
    let pool = cardPool(run, rarity.rarity).filter((c) => !cards.includes(c.id))
    const ownSchool = pool.filter((c) => c.school === run.school)
    if (i === 0 && run.floor === 1 && ownSchool.length > 0) pool = ownSchool
    if (source === 'boss' && i >= count - BOSS_SCHOOL_SLOTS) {
      const near = CARDS.filter((c) => c.rarity !== 'starter' && c.rarity !== 'doubt' && !cards.includes(c.id) && inOrNearSchool(run, c.id))
      const sameRarity = near.filter((c) => c.rarity === rarity.rarity)
      pool = sameRarity.length > 0 ? sameRarity : near.length > 0 ? near : pool
    }
    if (pool.length === 0) pool = CARDS.filter((c) => c.rarity === 'common' && !cards.includes(c.id))
    const choice = pick(pool, state)
    state = choice.rng
    cards.push(choice.item.id)
  }
  return { cards, rng: state }
}

/** Every place still ahead of you on this floor: where your next steps lead, as far as the boss. */
export function nodesAhead(run: RunState): MapNode[] {
  const byId = new Map(run.map.map((n) => [n.id, n]))
  const start = run.position === null ? run.map.filter((n) => n.row === 0).map((n) => n.id) : (byId.get(run.position)?.next ?? [])
  const found = new Set<string>()
  const queue = [...start]
  while (queue.length > 0) {
    const id = queue.shift() as string
    if (found.has(id)) continue
    found.add(id)
    queue.push(...(byId.get(id)?.next ?? []))
  }
  return run.map.filter((n) => found.has(n.id))
}

/** Where a place stands from where you are: still ahead, behind you (you went there), not taken (a step you passed by), or on another path. */
export function standing(run: RunState, nodeId: string): 'ahead' | 'behind' | 'skipped' | 'elsewhere' {
  if (nodesAhead(run).some((n) => n.id === nodeId)) return 'ahead'
  const row = run.map.find((n) => n.id === run.position)?.row ?? -1
  if ((run.map.find((n) => n.id === nodeId)?.row ?? Infinity) > row) return 'elsewhere'
  return run.visited.includes(nodeId) ? 'behind' : 'skipped'
}

/** Whether a relic can still do anything on what is left of this walk: a later floor, or the places still ahead on this one. */
export function relicMatters(run: RunState, relicId: RelicId): boolean {
  if (!isLastFloor(run)) return true
  const ahead = nodesAhead(run)
  const fightBeforeTheEnd = ahead.some((n) => n.type === 'battle' || n.type === 'elite')
  switch (relicId) {
    case 'library_card':
      return ahead.some((n) => n.type === 'shop')
    case 'tea_flask':
    case 'pocket_notebook':
      return fightBeforeTheEnd
    default:
      return ahead.some((n) => n.type === 'battle' || n.type === 'elite' || n.type === 'boss')
  }
}

/**
 * Rule-bending relics come only from philosophical problems: a problem offers one familiar relic and
 * `RULE_BENDING_CHOICES` that bend a rule. Every other relic offer comes from the familiar ones.
 * Nothing is offered that could no longer do anything on this walk.
 */
function rollRelics(run: RunState, count: number, ruleBending = 0): { relics: RelicId[]; rng: number } {
  const unowned = RELICS.filter((r) => !run.relics.includes(r.id) && relicMatters(run, r.id))
  const bending = shuffle(unowned.filter((r) => r.ruleBending).map((r) => r.id), run.rng)
  const plain = shuffle(unowned.filter((r) => !r.ruleBending).map((r) => r.id), bending.rng)
  const bent = bending.items.slice(0, ruleBending)
  return { relics: [...plain.items.slice(0, count - bent.length), ...bent], rng: plain.rng }
}

function choiceCount(run: RunState): number {
  return CARD_CHOICES + (run.relics.includes('pocket_notebook') ? 1 : 0)
}

export function isLastFloor(run: RunState): boolean {
  return run.floor === RUN_FLOORS[run.length]
}

/** The last problem of a run gives nothing to choose: the run is over, so only the winning argument and what it taught remain. */
function makeReward(run: RunState, source: RewardState['source'], finalRound: RoundReport | null = null): RunState {
  if (source === 'boss' && isLastFloor(run)) {
    const reward: RewardState = { source, gold: 0, cardChoices: [], cardTaken: true, relicChoices: [], relicTaken: true, finalRound }
    return { ...run, reward, screen: 'reward' }
  }
  let next = run
  let gold = 0
  if (source !== 'treasure') {
    const g = rollInt(next.rng, 0, FIGHT_GOLD_SPREAD)
    gold = FIGHT_GOLD[source] + g.value
    next = { ...next, rng: g.rng }
  }
  let cardChoices: string[] = []
  if (source !== 'treasure') {
    const rolled = rollCards(next, choiceCount(next), source)
    cardChoices = rolled.cards
    next = { ...next, rng: rolled.rng }
  }
  let relicChoices: RelicId[] = []
  if (source !== 'battle') {
    const rolled = source === 'boss' ? rollRelics(next, 1 + RULE_BENDING_CHOICES, RULE_BENDING_CHOICES) : rollRelics(next, source === 'elite' ? 1 : RELIC_CHOICES)
    relicChoices = rolled.relics
    next = { ...next, rng: rolled.rng }
  }
  const reward: RewardState = {
    source,
    gold,
    cardChoices,
    cardTaken: cardChoices.length === 0,
    relicChoices,
    relicTaken: relicChoices.length === 0,
    finalRound,
  }
  return { ...next, gold: next.gold + gold, reward, screen: 'reward' }
}

function priced(run: RunState, base: number): number {
  return shopPrice(base, run.floor, run.relics)
}

/** Every shop keeps one rare on the shelf, so a build-around card can be bought, not only hoped for. */
function makeShop(run: RunState): RunState {
  const rolledCards = rollCards(run, SHOP_CARDS, 'shop')
  let next = { ...run, rng: rolledCards.rng }
  let stock = rolledCards.cards
  const rare = (id: string) => getCardDef(id).rarity === 'rare'
  const lacking = CARDS.some((c) => rare(c.id) && c.school === run.school && !run.deck.some((d) => d.cardId === c.id))
  if (!stock.some((id) => rare(id) && (!lacking || getCardDef(id).school === run.school))) {
    const extra = buildAroundRare(next, stock, next.rng)
    next = { ...next, rng: extra.rng }
    stock = [...stock.slice(0, -1), extra.cardId]
  }
  const cards = stock.map((cardId) => {
    const jitter = rollInt(next.rng, 0, 10)
    next = { ...next, rng: jitter.rng }
    const rarity = getCardDef(cardId).rarity as Rarity
    return { cardId, price: priced(next, CARD_PRICES[rarity] + jitter.value), sold: false }
  })
  const rolledRelics = rollRelics(next, SHOP_RELICS)
  next = { ...next, rng: rolledRelics.rng }
  const relics = rolledRelics.relics.map((relicId) => {
    const jitter = rollInt(next.rng, 0, 20)
    next = { ...next, rng: jitter.rng }
    return { relicId, price: priced(next, RELIC_PRICE + jitter.value), sold: false }
  })
  const shop: ShopState = {
    cards,
    relics,
    removePrice: priced(next, REMOVE_BASE_PRICE + REMOVE_PRICE_STEP * next.removals),
    removed: false,
    teaPrice: priced(next, TEA_PRICE),
    teaTaken: false,
  }
  return { ...next, shop, screen: 'shop' }
}

function relicsLeft(run: RunState): boolean {
  return RELICS.some((r) => !r.ruleBending && !run.relics.includes(r.id) && relicMatters(run, r.id))
}

const RELIC_EVENTS: EventId[] = ['mirror', 'loud_certainty']
const CARD_OFFERS: Partial<Record<EventId, { count: number; source: RewardState['source'] }>> = {
  lecture: { count: 2, source: 'elite' },
  archive: { count: 3, source: 'boss' },
  study_group: { count: 2, source: 'battle' },
}

/** An encounter you have not met yet this run, while there are any left. */
function makeEvent(run: RunState): RunState {
  const possible = EVENTS.filter((e) => !RELIC_EVENTS.includes(e.id) || relicsLeft(run))
  const unseen = possible.filter((e) => !run.eventsSeen.includes(e.id))
  const chosen = pick(unseen.length > 0 ? unseen : possible, run.rng)
  const eventId = chosen.item.id
  let next = { ...run, rng: chosen.rng, eventsSeen: [...run.eventsSeen, eventId] }
  let cardOffer: string[] = []
  let relicOffer: RelicId | null = null
  const offer = CARD_OFFERS[eventId]
  if (offer) {
    const rolled = rollCards(next, offer.count, offer.source)
    cardOffer = rolled.cards
    next = { ...next, rng: rolled.rng }
  }
  if (RELIC_EVENTS.includes(eventId)) {
    const rolled = rollRelics(next, 1)
    relicOffer = rolled.relics[0]
    next = { ...next, rng: rolled.rng }
  }
  const event: EventState = { eventId, cardOffer, relicOffer, result: null }
  return { ...next, event, screen: 'event' }
}

/** The Short walk ends at its problem, which holds nothing back. */
export function holdsNothingBack(run: RunState, enemyId: string): boolean {
  return run.length === 'short' && bossOptions(run).includes(enemyId)
}

function startFight(run: RunState, enemyId: string): RunState {
  const seed = rollInt(run.rng, 0, 2 ** 31)
  const battle = createBattle({
    enemyId,
    deck: run.deck,
    resolve: run.resolve,
    maxResolve: run.maxResolve,
    relics: run.relics,
    school: run.school,
    rng: seed.value,
    rigor: run.rigor,
    known: run.known.includes(enemyId),
    lastOfShortWalk: holdsNothingBack(run, enemyId),
  })
  return { ...run, rng: seed.rng, battle, screen: 'battle', stats: { ...run.stats, fights: run.stats.fights + 1 } }
}

/** The two philosophical problems that wait at the end of this floor; you choose one when you reach them. */
export function bossOptions(run: RunState): string[] {
  return run.map.find((n) => n.type === 'boss')?.options ?? []
}

/** Steps to a node; at the boss, `enemyId` picks which of the floor's two problems to face (the map's suggestion otherwise). */
export function chooseNode(run: RunState, nodeId: string, enemyId?: string): RunState {
  const node = availableNodes(run).find((n) => n.id === nodeId)
  if (!node) return run
  const foe = node.type === 'boss' && enemyId !== undefined && bossOptions(run).includes(enemyId) ? enemyId : node.enemyId
  const map = foe === node.enemyId ? run.map : run.map.map((n) => (n.id === node.id ? { ...n, enemyId: foe } : n))
  const moved: RunState = { ...run, map, position: node.id, visited: [...run.visited, node.id], stats: { ...run.stats, nodes: run.stats.nodes + 1 } }
  switch (node.type) {
    case 'battle':
    case 'elite':
    case 'boss':
      return startFight(moved, foe as string)
    case 'rest':
      return { ...moved, screen: 'rest' }
    case 'shop':
      return makeShop(moved)
    case 'event':
      return makeEvent(moved)
    case 'treasure':
      return makeReward(moved, 'treasure')
  }
}

function currentNode(run: RunState): MapNode | undefined {
  return run.map.find((n) => n.id === run.position)
}

function finishBattle(run: RunState, battle: BattleState): RunState {
  const stats = { ...run.stats, turns: run.stats.turns + battle.turn }
  if (battle.outcome === 'lost') return { ...run, battle: null, screen: 'defeat', defeatedBy: battle.enemy.id, defeatRound: battle.lastRound, stats }
  const tea = run.relics.includes('tea_flask') ? TEA_FLASK_HEAL : 0
  const won: RunState = {
    ...run,
    battle: null,
    resolve: Math.min(run.maxResolve, battle.player.resolve + tea),
    beaten: run.beaten.includes(battle.enemy.id) ? run.beaten : [...run.beaten, battle.enemy.id],
    stats,
  }
  const type = currentNode(run)?.type
  return makeReward(won, type === 'boss' ? 'boss' : type === 'elite' ? 'elite' : 'battle', battle.lastRound)
}

export function battleAction(run: RunState, action: (battle: BattleState) => BattleState): RunState {
  if (run.screen !== 'battle' || !run.battle) return run
  const battle = action(run.battle)
  if (battle === run.battle) return run
  const round = battle.lastRound && battle.lastRound !== run.battle.lastRound ? battle.lastRound : null
  const tracked =
    round && round.damage > run.stats.best
      ? { ...run, stats: { ...run.stats, best: round.damage }, bestArgument: { round, enemyId: battle.enemy.id } }
      : run
  if (battle.outcome !== 'ongoing') return finishBattle(tracked, battle)
  return { ...tracked, battle }
}

/** The Resolve Reconsider gives back: what you entered with, and never less than half. */
export function reconsiderResolve(run: RunState): number {
  return Math.max(run.resolve, Math.ceil(run.maxResolve / 2))
}

/** Once per gentle run: go back to the start of the fight you just lost, with at least half your Resolve and a fresh shuffle. */
export function reconsider(run: RunState): RunState {
  const enemyId = run.defeatedBy
  if (run.screen !== 'defeat' || run.reconsiders === 0 || !enemyId) return run
  return startFight({ ...run, resolve: reconsiderResolve(run), reconsiders: run.reconsiders - 1, defeatedBy: null, defeatRound: null }, enemyId)
}

/** Whether to warn before a fight: you would enter it with no more Resolve than its opening attack, or with a quarter or less. */
export function fightWarning(run: RunState, enemyId: string): { resolve: number; attack: number } | null {
  const battle = startFight(run, enemyId).battle as BattleState
  const attack = incomingDamage(battle, 0).total
  if (run.resolve > attack && run.resolve > run.maxResolve * LOW_RESOLVE_SHARE) return null
  return { resolve: run.resolve, attack }
}

export interface Recovery {
  kind: 'rest' | 'tea'
  /** Resolve it would restore now. */
  amount: number
  price: number
}

/** The ways to recover that your next step actually offers: a rest only if rests heal at this level, the shop's tea only if you can afford it. */
export function recoveryOptions(run: RunState): Recovery[] {
  const open = availableNodes(run)
  const missing = run.maxResolve - run.resolve
  const options: Recovery[] = []
  if (open.some((n) => n.type === 'rest') && restAmount(run) > 0) options.push({ kind: 'rest', amount: Math.min(restAmount(run), missing), price: 0 })
  const teaPrice = priced(run, TEA_PRICE)
  if (open.some((n) => n.type === 'shop') && run.gold >= teaPrice) options.push({ kind: 'tea', amount: Math.min(TEA_HEAL, missing), price: teaPrice })
  return options.filter((o) => o.amount > 0)
}

/** A Rigorous level is earned on the Long walk; a Short walk at that level is practice for it. */
export function opensNextLevel(run: RunState): boolean {
  return run.screen === 'victory' && run.mode === 'rigorous' && run.length === 'long'
}

export function takeCard(run: RunState, cardId: string): RunState {
  const reward = run.reward
  if (run.screen !== 'reward' || !reward || reward.cardTaken || !reward.cardChoices.includes(cardId)) return run
  return { ...addCard(run, cardId), reward: { ...reward, cardTaken: true } }
}

export function skipCards(run: RunState): RunState {
  if (run.screen !== 'reward' || !run.reward) return run
  return { ...run, reward: { ...run.reward, cardTaken: true } }
}

export function takeRelic(run: RunState, relicId: RelicId): RunState {
  const reward = run.reward
  if (run.screen !== 'reward' || !reward || reward.relicTaken || !reward.relicChoices.includes(relicId)) return run
  return { ...run, relics: [...run.relics, relicId], reward: { ...reward, relicTaken: true } }
}

function advanceFloor(run: RunState): RunState {
  if (isLastFloor(run)) return { ...run, reward: null, screen: 'victory' }
  const floor = (run.floor + 1) as 2 | 3
  const generated = generateFloor(floor, run.rng, run.mode === 'gentle')
  return {
    ...run,
    floor,
    map: generated.nodes,
    rng: generated.rng,
    position: null,
    visited: [],
    reward: null,
    resolve: run.rigor >= RIGOR.noMercy ? Math.min(run.maxResolve, run.resolve + RIGOROUS_FLOOR_HEAL) : run.maxResolve,
    screen: 'map',
  }
}

export function leaveReward(run: RunState): RunState {
  if (run.screen !== 'reward' || !run.reward) return run
  if (run.reward.source === 'boss') return advanceFloor(run)
  return { ...run, reward: null, screen: 'map' }
}

export function restAmount(run: RunState): number {
  if (run.rigor >= RIGOR.noRestHeal) return 0
  const percent = run.rigor >= RIGOR.noMercy ? REST_HEAL_PERCENT.rigorous : REST_HEAL_PERCENT.gentle
  return Math.floor((run.maxResolve * percent) / 100)
}

export function restHeal(run: RunState): RunState {
  if (run.screen !== 'rest' || run.pick || restAmount(run) === 0) return run
  const heal = restAmount(run)
  return { ...run, resolve: Math.min(run.maxResolve, run.resolve + heal), screen: 'map' }
}

export function startRestUpgrade(run: RunState): RunState {
  if (run.screen !== 'rest' || !run.deck.some(canUpgrade)) return run
  return { ...run, pick: 'upgrade' }
}

export function startRestRemoval(run: RunState): RunState {
  if (run.screen !== 'rest' || run.deck.length <= 1) return run
  return { ...run, pick: 'remove' }
}

export function cancelPick(run: RunState): RunState {
  return run.pick ? { ...run, pick: null } : run
}

function withEventResult(run: RunState, result: string): RunState {
  return run.event ? { ...run, event: { ...run.event, result } } : run
}

function eventKey(run: RunState): string {
  return run.event ? run.event.eventId : ''
}

function loseResolve(run: RunState, amount: number): RunState {
  return { ...run, resolve: Math.max(1, run.resolve - amount) }
}

/** Upgrading at an encounter may cost Resolve; it is only paid once a card is chosen, so backing out is free. */
const UPGRADE_COSTS: Partial<Record<EventId, number>> = { cafe: JOURNAL_COST, the_question: QUESTION_COST }

export function pickCard(run: RunState, uid: number): RunState {
  const card = run.deck.find((c) => c.uid === uid)
  if (!run.pick || !card) return run
  const name = getCardDef(card.cardId).name
  if (run.pick === 'upgrade') {
    if (!canUpgrade(card)) return run
    const upgraded = { ...run, pick: null, deck: run.deck.map((c) => (c.uid === uid ? { ...c, upgraded: true } : c)) }
    if (run.screen === 'rest') return { ...upgraded, screen: 'map' }
    const cost = run.event ? UPGRADE_COSTS[run.event.eventId] ?? 0 : 0
    return withEventResult(loseResolve(upgraded, cost), `You worked on ${name}. It is now ${name}+.`)
  }
  if (run.pick === 'copy') {
    if (run.screen !== 'event' || run.gold < COPY_PRICE) return run
    const copied = addCard({ ...run, pick: null, gold: run.gold - COPY_PRICE }, card.cardId)
    const deck = card.upgraded ? copied.deck.map((c) => (c.uid === copied.nextUid - 1 ? { ...c, upgraded: true } : c)) : copied.deck
    return withEventResult({ ...copied, deck }, `A clean copy of ${name}, ready to use.`)
  }
  const deck = run.deck.filter((c) => c.uid !== uid)
  if (run.screen === 'rest') return { ...run, deck, pick: null, screen: 'map' }
  if (run.screen === 'shop' && run.shop) {
    if (run.gold < run.shop.removePrice || run.shop.removed) return run
    return {
      ...run,
      deck,
      pick: null,
      gold: run.gold - run.shop.removePrice,
      removals: run.removals + 1,
      shop: { ...run.shop, removed: true },
    }
  }
  if (run.screen === 'event') {
    if (eventKey(run) === 'study_group') return withEventResult({ ...run, deck, pick: null, gold: run.gold + TEACH_GOLD }, `You taught ${name} so well you no longer need it.`)
    if (run.gold < BOOKSELLER_PRICE) return run
    return withEventResult({ ...run, deck, pick: null, gold: run.gold - BOOKSELLER_PRICE }, `You let go of ${name}.`)
  }
  return run
}

export function buyCard(run: RunState, index: number): RunState {
  const item = run.shop?.cards[index]
  if (run.screen !== 'shop' || !run.shop || !item || item.sold || run.gold < item.price) return run
  const cards = run.shop.cards.map((c, i) => (i === index ? { ...c, sold: true } : c))
  return { ...addCard(run, item.cardId), gold: run.gold - item.price, shop: { ...run.shop, cards } }
}

export function buyRelic(run: RunState, index: number): RunState {
  const item = run.shop?.relics[index]
  if (run.screen !== 'shop' || !run.shop || !item || item.sold || run.gold < item.price) return run
  const relics = run.shop.relics.map((r, i) => (i === index ? { ...r, sold: true } : r))
  return { ...run, relics: [...run.relics, item.relicId], gold: run.gold - item.price, shop: { ...run.shop, relics } }
}

export function buyTea(run: RunState): RunState {
  const shop = run.shop
  if (run.screen !== 'shop' || !shop || shop.teaTaken || run.gold < shop.teaPrice || run.resolve >= run.maxResolve) return run
  return { ...run, gold: run.gold - shop.teaPrice, resolve: Math.min(run.maxResolve, run.resolve + TEA_HEAL), shop: { ...shop, teaTaken: true } }
}

export function startShopRemoval(run: RunState): RunState {
  if (run.screen !== 'shop' || !run.shop || run.shop.removed || run.gold < run.shop.removePrice) return run
  return { ...run, pick: 'remove' }
}

export function leaveShop(run: RunState): RunState {
  if (run.screen !== 'shop') return run
  return { ...run, shop: null, pick: null, screen: 'map' }
}

export function eventChoiceAvailable(run: RunState, choiceId: string): boolean {
  if (!run.event || run.event.result) return false
  switch (`${run.event.eventId}.${choiceId}`) {
    case 'library.study':
      return run.deck.some(canUpgrade)
    case 'bookseller.remove':
      return run.gold >= BOOKSELLER_PRICE && run.deck.length > 1
    case 'mirror.clear':
      return run.deck.some(isDoubt) && run.maxResolve > MIRROR_MAX_LOSS
    case 'cafe.treat':
      return run.gold >= CAFE_PRICE
    case 'cafe.journal':
      return run.deck.some(canUpgrade) && run.resolve > JOURNAL_COST
    case 'archive.dig':
      return run.resolve > ARCHIVE_COST
    case 'archive.copy':
      return run.gold >= COPY_PRICE
    case 'loud_certainty.argue':
      return run.event.relicOffer !== null && run.resolve > ARGUE_COST
    case 'study_group.teach':
      return run.deck.length > 1
    case 'the_question.explain':
      return run.deck.some(canUpgrade) && run.resolve > QUESTION_COST
    default:
      return getEventDef(run.event.eventId).choices.some((c) => c.id === choiceId)
  }
}

function addDoubts(run: RunState, count: number): RunState {
  let next = run
  for (let i = 0; i < count; i++) next = addCard(next, 'doubt')
  return next
}

function growMaxResolve(run: RunState, amount: number): RunState {
  return { ...run, maxResolve: run.maxResolve + amount, resolve: Math.min(run.maxResolve + amount, run.resolve + amount) }
}

function heal(run: RunState, amount: number): RunState {
  return { ...run, resolve: Math.min(run.maxResolve, run.resolve + amount) }
}

export function chooseEvent(run: RunState, choiceId: string, cardId?: string): RunState {
  const event = run.event
  if (run.screen !== 'event' || !event || run.pick || !eventChoiceAvailable(run, choiceId)) return run
  const offered = cardId !== undefined && event.cardOffer.includes(cardId) ? cardId : null
  switch (`${event.eventId}.${choiceId}`) {
    case 'lecture.attend':
      if (!offered) return run
      return withEventResult(addCard(loseResolve(run, LECTURE_COST), offered), `You took ${getCardDef(offered).name}. Hard going, but worth it.`)
    case 'archive.dig':
      if (!offered) return run
      return withEventResult(addCard(loseResolve(run, ARCHIVE_COST), offered), `You carry ${getCardDef(offered).name} out into the light.`)
    case 'study_group.learn':
      if (!offered) return run
      return withEventResult(addDoubts(addCard(run, offered), 1), `You learned ${getCardDef(offered).name}, and picked up a small Doubt about whether you understood it.`)
    case 'library.study':
    case 'cafe.journal':
    case 'the_question.explain':
      return { ...run, pick: 'upgrade' }
    case 'bookseller.remove':
    case 'study_group.teach':
      return { ...run, pick: 'remove' }
    case 'archive.copy':
      return { ...run, pick: 'copy' }
    case 'library.nap':
      return withEventResult(heal(run, LIBRARY_REST), 'You wake up lighter.')
    case 'bookseller.sell':
      return withEventResult(addDoubts({ ...run, gold: run.gold + BOOKSELLER_PAY }, 1), 'Gold in your pocket, and a small Doubt about the notes.')
    case 'old_friend.talk':
      return withEventResult(growMaxResolve(run, FRIEND_MAX), 'It helps to say it out loud.')
    case 'old_friend.loan':
      return withEventResult({ ...run, gold: run.gold + FRIEND_GOLD }, 'They wave away your thanks.')
    case 'mirror.take':
      if (!event.relicOffer) return run
      return withEventResult(addDoubts({ ...run, relics: [...run.relics, event.relicOffer] }, 2), 'You keep it. Two old worries come with it.')
    case 'mirror.clear': {
      const maxResolve = run.maxResolve - MIRROR_MAX_LOSS
      return withEventResult(
        { ...run, deck: run.deck.filter((c) => !isDoubt(c)), maxResolve, resolve: Math.min(maxResolve, run.resolve) },
        'The worries fade. So does a little of your strength.',
      )
    }
    case 'cafe.treat':
      return withEventResult(heal({ ...run, gold: run.gold - CAFE_PRICE }, CAFE_HEAL), 'Warm hands, slower breath.')
    case 'loud_certainty.argue':
      if (!event.relicOffer) return run
      return withEventResult(loseResolve({ ...run, relics: [...run.relics, event.relicOffer] }, ARGUE_COST), 'He never admits it, but he lets you take it to end the conversation.')
    case 'loud_certainty.let_go':
      return withEventResult(heal(run, LET_GO_HEAL), 'You smile and walk on. It feels better than winning would have.')
    case 'the_question.admit':
      return withEventResult(growMaxResolve(run, QUESTION_MAX), '"Let\'s find out together," you say. Saying "I don\'t know" is a relief.')
    default:
      return withEventResult(run, 'You move on.')
  }
}

export function leaveEvent(run: RunState): RunState {
  if (run.screen !== 'event' || !run.event?.result) return run
  return { ...run, event: null, screen: 'map' }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

type Saved = Record<string, unknown>

/** Applies `change` to a saved battle and to every undo step inside it. */
function eachCore(battle: Saved, change: (core: Saved) => Saved): Saved {
  return { ...change(battle), undo: Array.isArray(battle.undo) ? battle.undo.map((core) => change(core as Saved)) : [] }
}

/** Version 4 added Once, lasting Multipliers and boss phases; the last-round summary is dropped because it lacks the new fields. */
function fromVersion3(saved: Saved): Saved {
  const stats = isRecord(saved.stats) ? saved.stats : {}
  const event = isRecord(saved.event) ? saved.event : null
  const battle = isRecord(saved.battle)
    ? eachCore(saved.battle, (core) => ({
        ...core,
        exhausted: [],
        lastingMultiplier: 0,
        lastRound: null,
        enemy: { ...(core.enemy as Saved), phase: 1, gambleHit: false, misses: 0 },
      }))
    : null
  return {
    ...saved,
    rigor: saved.mode === 'rigorous' ? DEFAULT_RIGOR : 0,
    eventsSeen: event ? [event.eventId] : [],
    stats: { turns: 0, fights: 0, nodes: 0, ...stats, best: 0 },
    shop: isRecord(saved.shop) ? { ...saved.shop, teaPrice: TEA_PRICE, teaTaken: false } : null,
    battle,
    reward: isRecord(saved.reward) ? { ...saved.reward, finalRound: null } : null,
  }
}

/** Version 5 added the build-around rares' lasting effects and second rules; round summaries are dropped because their steps lack a count. */
function fromVersion4(saved: Saved): Saved {
  const battle = isRecord(saved.battle)
    ? eachCore(saved.battle, (core) => ({
        ...core,
        evidencePlayed: 0,
        lastingRestore: 0,
        unsettleLasts: false,
        lastRound: null,
        enemy: { ...(core.enemy as Saved), secondRule: false },
      }))
    : null
  return { ...saved, battle, reward: isRecord(saved.reward) ? { ...saved.reward, finalRound: null } : null }
}

/** Version 6 added the tiring of long fights, the ordered damage steps and the lost round; round summaries are dropped because they lack the steps. */
function fromVersion5(saved: Saved): Saved {
  const tiresFrom = saved.mode === 'gentle' ? TIRING.gentle : TIRING.rigorous
  const battle = isRecord(saved.battle) ? eachCore(saved.battle, (core) => ({ ...core, tiresFrom, lastRound: null })) : null
  return { ...saved, battle, defeatRound: null, reward: isRecord(saved.reward) ? { ...saved.reward, finalRound: null } : null }
}

/** Version 7 added run lengths (every earlier run was the Long walk) and the pace inside each battle; damage steps gained a short form, so round summaries are dropped. */
function fromVersion6(saved: Saved): Saved {
  const rigor = typeof saved.rigor === 'number' ? saved.rigor : 0
  const battle = isRecord(saved.battle) ? eachCore(saved.battle, (core) => ({ ...core, rigor, lastRound: null })) : null
  return { ...saved, length: 'long', battle, defeatRound: null, reward: isRecord(saved.reward) ? { ...saved.reward, finalRound: null } : null }
}

/** Version 8 banks stopped damage as Shaken and keeps the best round for the end of the walk; round summaries are dropped because they lack the Shaken fields. */
function fromVersion7(saved: Saved): Saved {
  const battle = isRecord(saved.battle)
    ? eachCore(saved.battle, (core) => ({ ...core, lastRound: null, enemy: { ...(core.enemy as Saved), shaken: 0 } }))
    : null
  return { ...saved, battle, defeatRound: null, bestArgument: null, reward: isRecord(saved.reward) ? { ...saved.reward, finalRound: null } : null }
}

/** Applies `change` to every round summary a saved run keeps: the battle's last round, the lost round, the best argument and the final round. */
function eachRound(saved: Saved, change: (report: Saved) => Saved): Saved {
  const fix = (report: unknown) => (isRecord(report) ? change(report) : (report ?? null))
  return {
    ...saved,
    battle: isRecord(saved.battle) ? eachCore(saved.battle, (core) => ({ ...core, lastRound: fix(core.lastRound) })) : null,
    defeatRound: fix(saved.defeatRound),
    bestArgument: isRecord(saved.bestArgument) ? { ...saved.bestArgument, round: fix(saved.bestArgument.round) } : null,
    reward: isRecord(saved.reward) ? { ...saved.reward, finalRound: fix(saved.reward.finalRound) } : null,
  }
}

/** Version 9 lists the problems each boss offers on the map, and round summaries say how much a bias calmed. */
function fromVersion8(saved: Saved): Saved {
  const floor = typeof saved.floor === 'number' ? saved.floor : 1
  const map = Array.isArray(saved.map)
    ? saved.map.map((node: Saved) => (node.type === 'boss' ? { ...node, options: enemiesFor(floor, 'boss').map((e) => e.id) } : node))
    : saved.map
  return eachRound({ ...saved, map }, (report) => ({ ...report, eased: 0 }))
}

/** Version 10 keeps the Unsettle a stop line holds back, and a Gentle bias's halfway mark turns what it stops into Unsettle; round summaries say how much of each. */
function fromVersion9(saved: Saved): Saved {
  return eachRound(saved, (report) => ({ ...report, unsettleHeld: 0, unsettleGained: 0 }))
}

/** Loads a saved run from any earlier version this game shipped, or returns null if it cannot be read. */
export function migrateRun(saved: unknown, version: number): RunState | null {
  if (!isRecord(saved)) return null
  if (version === RUN_VERSION) return saved as unknown as RunState
  if (version < 3 || version > RUN_VERSION) return null
  const v4 = version === 3 ? fromVersion3(saved) : saved
  const v5 = version <= 4 ? fromVersion4(v4) : v4
  const v6 = version <= 5 ? fromVersion5(v5) : v5
  const v7 = version <= 6 ? fromVersion6(v6) : v6
  const v8 = version <= 7 ? fromVersion7(v7) : v7
  const v9 = version <= 8 ? fromVersion8(v8) : v8
  return { ...fromVersion9(v9), version: RUN_VERSION } as unknown as RunState
}
