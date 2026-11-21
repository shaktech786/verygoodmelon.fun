import { RelicId } from '@/types/thought-pockets'

export const START_GOLD = 40
export const TEA_FLASK_HEAL = 5
export const FIGHT_GOLD = { battle: 12, elite: 25, boss: 40 } as const
export const FIGHT_GOLD_SPREAD = 6
export const CARD_PRICES = { common: 40, uncommon: 60, rare: 90 } as const
export const RELIC_PRICE = 110
/** Each floor after the first, shop prices rise by this share of the base price. */
export const FLOOR_PRICE_STEP = 0.2
export const REMOVE_BASE_PRICE = 50
export const REMOVE_PRICE_STEP = 25
/** The shop's reading room: a pot of tea that restores Resolve, once per visit. */
export const TEA_PRICE = 20
export const TEA_HEAL = 15
export const LIBRARY_DISCOUNT = 0.75

export function shopPrice(base: number, floor: number, relics: RelicId[]): number {
  const scaled = Math.round(base * (1 + FLOOR_PRICE_STEP * (floor - 1)))
  return relics.includes('library_card') ? Math.floor(scaled * LIBRARY_DISCOUNT) : scaled
}
