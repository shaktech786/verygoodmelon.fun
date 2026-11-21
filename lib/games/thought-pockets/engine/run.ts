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
  RunState,
  School,
  ShopState,
} from '@/types/thought-pockets'
import { CARDS, canUpgrade, getCardDef, isDoubt, usesKeyword } from '../data/cards'
import { getSchoolDef } from '../data/schools'
import { RELICS } from '../data/relics'
import { REST_HEAL_PERCENT, RIGOR, RIGOROUS_FLOOR_HEAL, TIRING } from '../data/pace'
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
import { createBattle } from './battle'
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

export const RUN_VERSION = 6
export const START_RESOLVE = 60
export const FLOORS = 3
const DEFAULT_RIGOR = RIGOR.harder
const CARD_CHOICES = 3
const RELIC_CHOICES = 2
const SHOP_CARDS = 4
const SHOP_RELICS = 2

type Rarity = 'common' | 'uncommon' | 'rare'

function instances(cardIds: string[], firstUid: number): CardInstance[] {
  return cardIds.map((cardId, i) => ({ uid: firstUid + i, cardId, upgraded: false }))
}

/**
 * `known` lists the opponents beaten in earlier runs. In Rigorous, `rigor` is the level from 1 to 5;
 * left out, a Rigorous run plays at level 3, the old single Rigorous setting.
 */
export function newRun(school: School, seed: number, mode: Mode = 'gentle', known: string[] = [], rigor?: number): RunState {
  const level = mode === 'gentle' ? 0 : rigor ?? DEFAULT_RIGOR
  const rng = seedRng(seed)
  const floor = generateFloor(1, rng)
  const deck = instances([...getSchoolDef(school).deck, ...(level >= RIGOR.doubt ? ['doubt'] : [])], 1)
  return {
    version: RUN_VERSION,
    seed,
    rng: floor.rng,
    school,
    mode,
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

/**
 * On the first floor the first offer leans toward your school so a build can start, and the first
 * problem always offers one of your school's rares; after that every offer comes from everything.
 */
function rollCards(run: RunState, count: number, source: RewardState['source'] | 'shop'): { cards: string[]; rng: number } {
  let state = run.rng
  const cards: string[] = []
  for (let i = 0; i < count; i++) {
    const rarity = rollRarity(state, source)
    state = rarity.rng
    const wanted = i === 0 && run.floor === 1 && source === 'boss' ? 'rare' : rarity.rarity
    let pool = cardPool(run, wanted).filter((c) => !cards.includes(c.id))
    const ownSchool = pool.filter((c) => c.school === run.school)
    if (i === 0 && run.floor === 1 && ownSchool.length > 0) pool = ownSchool
    if (pool.length === 0) pool = CARDS.filter((c) => c.rarity === 'common' && !cards.includes(c.id))
    const choice = pick(pool, state)
    state = choice.rng
    cards.push(choice.item.id)
  }
  return { cards, rng: state }
}

function rollRelics(run: RunState, count: number): { relics: RelicId[]; rng: number } {
  const unowned = RELICS.filter((r) => !run.relics.includes(r.id)).map((r) => r.id)
  const shuffled = shuffle(unowned, run.rng)
  return { relics: shuffled.items.slice(0, count), rng: shuffled.rng }
}

function choiceCount(run: RunState): number {
  return CARD_CHOICES + (run.relics.includes('pocket_notebook') ? 1 : 0)
}

function makeReward(run: RunState, source: RewardState['source'], finalRound: RoundReport | null = null): RunState {
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
    const rolled = rollRelics(next, source === 'elite' ? 1 : RELIC_CHOICES)
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

function makeShop(run: RunState): RunState {
  const rolledCards = rollCards(run, SHOP_CARDS, 'shop')
  let next = { ...run, rng: rolledCards.rng }
  const cards = rolledCards.cards.map((cardId) => {
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
  return RELICS.some((r) => !run.relics.includes(r.id))
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
  })
  return { ...run, rng: seed.rng, battle, screen: 'battle', stats: { ...run.stats, fights: run.stats.fights + 1 } }
}

export function chooseNode(run: RunState, nodeId: string): RunState {
  const node = availableNodes(run).find((n) => n.id === nodeId)
  if (!node) return run
  const moved: RunState = { ...run, position: node.id, visited: [...run.visited, node.id], stats: { ...run.stats, nodes: run.stats.nodes + 1 } }
  switch (node.type) {
    case 'battle':
    case 'elite':
    case 'boss':
      return startFight(moved, node.enemyId as string)
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
  const landed = battle.lastRound && battle.lastRound !== run.battle.lastRound ? battle.lastRound.damage : 0
  const tracked = landed > run.stats.best ? { ...run, stats: { ...run.stats, best: landed } } : run
  if (battle.outcome !== 'ongoing') return finishBattle(tracked, battle)
  return { ...tracked, battle }
}

/** Once per gentle run: go back to the start of the fight you just lost, with the Resolve you had then and a fresh shuffle. */
export function reconsider(run: RunState): RunState {
  const enemyId = run.defeatedBy
  if (run.screen !== 'defeat' || run.reconsiders === 0 || !enemyId) return run
  return startFight({ ...run, reconsiders: run.reconsiders - 1, defeatedBy: null, defeatRound: null }, enemyId)
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
  if (run.floor === FLOORS) return { ...run, reward: null, screen: 'victory' }
  const floor = (run.floor + 1) as 2 | 3
  const generated = generateFloor(floor, run.rng)
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

/** Loads a saved run from any earlier version this game shipped, or returns null if it cannot be read. */
export function migrateRun(saved: unknown, version: number): RunState | null {
  if (!isRecord(saved)) return null
  if (version === RUN_VERSION) return saved as unknown as RunState
  if (version < 3 || version > RUN_VERSION) return null
  const v4 = version === 3 ? fromVersion3(saved) : saved
  const v5 = version <= 4 ? fromVersion4(v4) : v4
  return { ...fromVersion5(v5), version: RUN_VERSION } as unknown as RunState
}
