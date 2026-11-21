import { createBattle } from '@/lib/games/thought-pockets/engine/battle'
import { BattleState, CardInstance, RelicId, School } from '@/types/thought-pockets'

export function card(cardId: string, uid: number, upgraded = false): CardInstance {
  return { uid, cardId, upgraded }
}

interface Setup {
  enemyId?: string
  hand?: string[]
  school?: School
  relics?: RelicId[]
  resolve?: number
}

/** A battle with a fixed hand and an empty draw pile, so tests control every card. */
export function battleWith({ enemyId = 'jumping_to_conclusions', hand = [], school = 'rationalist', relics = [], resolve = 50 }: Setup): BattleState {
  const base = createBattle({
    enemyId,
    deck: [],
    resolve,
    maxResolve: 50,
    relics,
    school,
    rng: 1,
  })
  const cards = hand.map((id, index) => card(id, 100 + index))
  return { ...base, hand: cards, drawPile: [], discardPile: [], nextUid: 200 }
}

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value)
    for (const key of Object.keys(value)) deepFreeze((value as Record<string, unknown>)[key])
  }
  return value
}
