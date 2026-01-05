/**
 * Mind Architect - Shop Data
 * Generates shop inventory based on floor and seed
 */

import { Card, Relic } from '@/types/mind-architect'
import { ALL_CARDS } from './cards'
import { SHOP_RELICS, COMMON_RELICS, UNCOMMON_RELICS } from './relics'

// =============================================================================
// SEEDED RANDOM
// =============================================================================

class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff
    return this.seed / 0x7fffffff
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array]
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }

  pick<T>(array: T[], count: number): T[] {
    const shuffled = this.shuffle(array)
    return shuffled.slice(0, count)
  }
}

// =============================================================================
// SHOP CARD GENERATION
// =============================================================================

export function getShopCards(floor: number, seed: number): Card[] {
  const rng = new SeededRandom(seed + floor * 1000 + 777) // Different seed for shop

  // Filter cards by availability
  const availableCards = ALL_CARDS.filter((card) => {
    // Exclude starter cards
    if (card.rarity === 'starter') return false
    // Exclude cards above floor tier
    if (card.rarity === 'rare' && floor < 2) return false
    return true
  })

  // Select cards
  const cardCounts = {
    common: floor === 1 ? 4 : 3,
    uncommon: floor === 1 ? 2 : 3,
    rare: floor >= 2 ? 1 : 0,
  }

  const commonCards = rng.pick(
    availableCards.filter((c) => c.rarity === 'common'),
    cardCounts.common
  )

  const uncommonCards = rng.pick(
    availableCards.filter((c) => c.rarity === 'uncommon'),
    cardCounts.uncommon
  )

  const rareCards = rng.pick(
    availableCards.filter((c) => c.rarity === 'rare'),
    cardCounts.rare
  )

  // Ensure type diversity - at least one of each main type if possible
  const allSelected = [...commonCards, ...uncommonCards, ...rareCards]
  const types = new Set(allSelected.map((c) => c.type))

  // Add cards to fill type gaps
  const missingTypes = ['evidence', 'logic', 'framework'].filter(
    (t) => !types.has(t as any)
  )

  const additionalCards: Card[] = []
  for (const type of missingTypes) {
    const typeCards = availableCards.filter((c) => c.type === type)
    if (typeCards.length > 0) {
      additionalCards.push(rng.pick(typeCards, 1)[0])
    }
  }

  return [...allSelected, ...additionalCards]
}

// =============================================================================
// SHOP RELIC GENERATION
// =============================================================================

export function getShopRelics(floor: number, seed: number): Relic[] {
  const rng = new SeededRandom(seed + floor * 2000 + 888)

  // Shop-specific relics always available
  const shopSpecific = rng.pick(SHOP_RELICS, 1)

  // Additional relics from common/uncommon pool
  const commonRelics = rng.pick(COMMON_RELICS, floor >= 2 ? 2 : 1)
  const uncommonRelics = floor >= 2 ? rng.pick(UNCOMMON_RELICS, 1) : []

  return [...shopSpecific, ...commonRelics, ...uncommonRelics]
}

// =============================================================================
// CARD REWARDS
// =============================================================================

export function getCardRewards(
  floor: number,
  seed: number,
  isElite: boolean = false,
  isBoss: boolean = false
): Card[] {
  const rng = new SeededRandom(seed + 999)

  // Filter available cards
  const availableCards = ALL_CARDS.filter((card) => {
    if (card.rarity === 'starter') return false
    return true
  })

  // Reward pools based on encounter type
  if (isBoss) {
    // Boss rewards - rare cards
    const rareCards = availableCards.filter((c) => c.rarity === 'rare')
    const uncommonCards = availableCards.filter((c) => c.rarity === 'uncommon')
    return [
      ...rng.pick(rareCards, 1),
      ...rng.pick(uncommonCards, 2),
    ]
  }

  if (isElite) {
    // Elite rewards - better pool
    const uncommonCards = availableCards.filter((c) => c.rarity === 'uncommon')
    const commonCards = availableCards.filter((c) => c.rarity === 'common')
    return [
      ...rng.pick(uncommonCards, 2),
      ...rng.pick(commonCards, 1),
    ]
  }

  // Normal battle rewards
  const commonCards = availableCards.filter((c) => c.rarity === 'common')
  const uncommonCards = availableCards.filter((c) => c.rarity === 'uncommon')

  // 70% common, 30% uncommon
  if (rng.next() < 0.7) {
    return rng.pick(commonCards, 3)
  } else {
    return [
      ...rng.pick(commonCards, 2),
      ...rng.pick(uncommonCards, 1),
    ]
  }
}

// =============================================================================
// GOLD REWARDS
// =============================================================================

export function getGoldReward(
  floor: number,
  isElite: boolean = false,
  isBoss: boolean = false
): number {
  const base = 10 + floor * 5

  if (isBoss) return base * 3 + Math.floor(Math.random() * 20)
  if (isElite) return base * 2 + Math.floor(Math.random() * 15)
  return base + Math.floor(Math.random() * 10)
}
