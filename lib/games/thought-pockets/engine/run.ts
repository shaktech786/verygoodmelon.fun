import {
  BattleState,
  CardDef,
  CardInstance,
  EventState,
  MapNode,
  RelicId,
  RewardState,
  RunState,
  School,
  ShopState,
} from '@/types/thought-pockets'
import { CARDS, canUpgrade, getCardDef, isDoubt, usesKeyword } from '../data/cards'
import { getSchoolDef } from '../data/schools'
import { RELICS } from '../data/relics'
import {
  BOOKSELLER_PAY,
  BOOKSELLER_PRICE,
  EVENTS,
  FRIEND_GOLD,
  FRIEND_MAX,
  LECTURE_COST,
  LIBRARY_REST,
  MIRROR_MAX_LOSS,
  getEventDef,
} from '../data/events'
import { createBattle } from './battle'
import { generateFloor } from './map'
import { pick, roll, rollInt, seedRng, shuffle } from './rng'

export const START_RESOLVE = 50
export const START_GOLD = 20
export const REST_HEAL_PERCENT = 30
export const FLOOR_HEAL = 20
export const TEA_FLASK_HEAL = 5
const CARD_CHOICES = 3
const RELIC_CHOICES = 2
const REMOVE_BASE_PRICE = 50
const REMOVE_PRICE_STEP = 25
const CARD_PRICES = { common: 45, uncommon: 70, rare: 110 }
const RELIC_PRICE = 120
const SHOP_CARDS = 4
const SHOP_RELICS = 2
const LIBRARY_DISCOUNT = 0.75

type Rarity = 'common' | 'uncommon' | 'rare'

function instances(cardIds: string[], firstUid: number): CardInstance[] {
  return cardIds.map((cardId, i) => ({ uid: firstUid + i, cardId, upgraded: false }))
}

export function newRun(school: School, seed: number): RunState {
  const rng = seedRng(seed)
  const floor = generateFloor(1, rng)
  const deck = instances(getSchoolDef(school).deck, 1)
  return {
    version: 2,
    seed,
    rng: floor.rng,
    school,
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
    pick: null,
    defeatedBy: null,
    beaten: [],
    stats: { turns: 0, fights: 0, nodes: 0 },
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

/** The first offer leans toward your school so a build can form; the rest come from everything. */
function rollCards(run: RunState, count: number, source: RewardState['source'] | 'shop'): { cards: string[]; rng: number } {
  let state = run.rng
  const cards: string[] = []
  for (let i = 0; i < count; i++) {
    const rarity = rollRarity(state, source)
    state = rarity.rng
    let pool = cardPool(run, rarity.rarity).filter((c) => !cards.includes(c.id))
    const ownSchool = pool.filter((c) => c.school === run.school)
    if (i === 0 && ownSchool.length > 0) pool = ownSchool
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

function makeReward(run: RunState, source: RewardState['source']): RunState {
  let next = run
  let gold = 0
  if (source !== 'treasure') {
    const base = source === 'boss' ? 50 : source === 'elite' ? 30 : 12
    const g = rollInt(next.rng, 0, 6)
    gold = base + g.value
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
  }
  return { ...next, gold: next.gold + gold, reward, screen: 'reward' }
}

function priced(run: RunState, price: number): number {
  return run.relics.includes('library_card') ? Math.floor(price * LIBRARY_DISCOUNT) : price
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
  }
  return { ...next, shop, screen: 'shop' }
}

function makeEvent(run: RunState): RunState {
  const hasRelicsLeft = RELICS.some((r) => !run.relics.includes(r.id))
  const options = EVENTS.filter((e) => e.id !== 'mirror' || hasRelicsLeft)
  const chosen = pick(options, run.rng)
  let next = { ...run, rng: chosen.rng }
  let cardOffer: string[] = []
  let relicOffer: RelicId | null = null
  if (chosen.item.id === 'lecture') {
    const rolled = rollCards(next, 2, 'elite')
    cardOffer = rolled.cards
    next = { ...next, rng: rolled.rng }
  }
  if (chosen.item.id === 'mirror') {
    const rolled = rollRelics(next, 1)
    relicOffer = rolled.relics[0]
    next = { ...next, rng: rolled.rng }
  }
  const event: EventState = { eventId: chosen.item.id, cardOffer, relicOffer, result: null }
  return { ...next, event, screen: 'event' }
}

export function chooseNode(run: RunState, nodeId: string): RunState {
  const node = availableNodes(run).find((n) => n.id === nodeId)
  if (!node) return run
  const moved: RunState = { ...run, position: node.id, visited: [...run.visited, node.id], stats: { ...run.stats, nodes: run.stats.nodes + 1 } }
  switch (node.type) {
    case 'battle':
    case 'elite':
    case 'boss': {
      const seed = rollInt(moved.rng, 0, 2 ** 31)
      const battle = createBattle({
        enemyId: node.enemyId as string,
        deck: moved.deck,
        resolve: moved.resolve,
        maxResolve: moved.maxResolve,
        relics: moved.relics,
        school: moved.school,
        rng: seed.value,
      })
      return { ...moved, rng: seed.rng, battle, screen: 'battle', stats: { ...moved.stats, fights: moved.stats.fights + 1 } }
    }
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
  if (battle.outcome === 'lost') {
    return { ...run, battle: null, resolve: 0, screen: 'defeat', defeatedBy: battle.enemy.id, stats }
  }
  const tea = run.relics.includes('tea_flask') ? TEA_FLASK_HEAL : 0
  const won: RunState = {
    ...run,
    battle: null,
    resolve: Math.min(run.maxResolve, battle.player.resolve + tea),
    beaten: run.beaten.includes(battle.enemy.id) ? run.beaten : [...run.beaten, battle.enemy.id],
    stats,
  }
  const type = currentNode(run)?.type
  return makeReward(won, type === 'boss' ? 'boss' : type === 'elite' ? 'elite' : 'battle')
}

export function battleAction(run: RunState, action: (battle: BattleState) => BattleState): RunState {
  if (run.screen !== 'battle' || !run.battle) return run
  const battle = action(run.battle)
  if (battle === run.battle) return run
  if (battle.outcome !== 'ongoing') return finishBattle(run, battle)
  return { ...run, battle }
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
  if (run.floor === 3) return { ...run, reward: null, screen: 'victory' }
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
    resolve: Math.min(run.maxResolve, run.resolve + FLOOR_HEAL),
    screen: 'map',
  }
}

export function leaveReward(run: RunState): RunState {
  if (run.screen !== 'reward' || !run.reward) return run
  if (run.reward.source === 'boss') return advanceFloor(run)
  return { ...run, reward: null, screen: 'map' }
}

export function restHeal(run: RunState): RunState {
  if (run.screen !== 'rest' || run.pick) return run
  const heal = Math.floor((run.maxResolve * REST_HEAL_PERCENT) / 100)
  return { ...run, resolve: Math.min(run.maxResolve, run.resolve + heal), screen: 'map' }
}

export function startRestUpgrade(run: RunState): RunState {
  if (run.screen !== 'rest' || !run.deck.some(canUpgrade)) return run
  return { ...run, pick: 'upgrade' }
}

export function cancelPick(run: RunState): RunState {
  return run.pick ? { ...run, pick: null } : run
}

function withEventResult(run: RunState, result: string): RunState {
  return run.event ? { ...run, event: { ...run.event, result } } : run
}

export function pickCard(run: RunState, uid: number): RunState {
  const card = run.deck.find((c) => c.uid === uid)
  if (!run.pick || !card) return run
  const name = getCardDef(card.cardId).name
  if (run.pick === 'upgrade') {
    if (!canUpgrade(card)) return run
    const upgraded = { ...run, pick: null, deck: run.deck.map((c) => (c.uid === uid ? { ...c, upgraded: true } : c)) }
    if (run.screen === 'rest') return { ...upgraded, screen: 'map' }
    return withEventResult(upgraded, `You studied ${name}. It is now ${name}+.`)
  }
  const deck = run.deck.filter((c) => c.uid !== uid)
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
    default:
      return getEventDef(run.event.eventId).choices.some((c) => c.id === choiceId)
  }
}

function addDoubts(run: RunState, count: number): RunState {
  let next = run
  for (let i = 0; i < count; i++) next = addCard(next, 'doubt')
  return next
}

export function chooseEvent(run: RunState, choiceId: string, cardId?: string): RunState {
  const event = run.event
  if (run.screen !== 'event' || !event || run.pick || !eventChoiceAvailable(run, choiceId)) return run
  switch (`${event.eventId}.${choiceId}`) {
    case 'lecture.attend': {
      if (!cardId || !event.cardOffer.includes(cardId)) return run
      const paid = { ...run, resolve: Math.max(1, run.resolve - LECTURE_COST) }
      return withEventResult(addCard(paid, cardId), `You took ${getCardDef(cardId).name}. Hard going, but worth it.`)
    }
    case 'library.study':
    case 'bookseller.remove':
      return { ...run, pick: choiceId === 'study' ? 'upgrade' : 'remove' }
    case 'library.nap':
      return withEventResult({ ...run, resolve: Math.min(run.maxResolve, run.resolve + LIBRARY_REST) }, 'You wake up lighter.')
    case 'bookseller.sell':
      return withEventResult(addDoubts({ ...run, gold: run.gold + BOOKSELLER_PAY }, 1), 'Gold in your pocket, and a small Doubt about the notes.')
    case 'old_friend.talk':
      return withEventResult(
        { ...run, maxResolve: run.maxResolve + FRIEND_MAX, resolve: Math.min(run.maxResolve + FRIEND_MAX, run.resolve + FRIEND_MAX) },
        'It helps to say it out loud.',
      )
    case 'old_friend.loan':
      return withEventResult({ ...run, gold: run.gold + FRIEND_GOLD }, 'They wave away your thanks.')
    case 'mirror.take': {
      if (!event.relicOffer) return run
      return withEventResult(addDoubts({ ...run, relics: [...run.relics, event.relicOffer] }, 2), 'You keep it. Two old worries come with it.')
    }
    case 'mirror.clear': {
      const maxResolve = run.maxResolve - MIRROR_MAX_LOSS
      return withEventResult(
        { ...run, deck: run.deck.filter((c) => !isDoubt(c)), maxResolve, resolve: Math.min(maxResolve, run.resolve) },
        'The worries fade. So does a little of your strength.',
      )
    }
    default:
      return withEventResult(run, 'You move on.')
  }
}

export function leaveEvent(run: RunState): RunState {
  if (run.screen !== 'event' || !run.event?.result) return run
  return { ...run, event: null, screen: 'map' }
}
