/**
 * Mind Architect - Damage Calculation Engine
 *
 * FORMULA:
 * Final Damage = (Total Weight) × (Combined Multiplier) × (Chain Bonus) + (Bonuses) - (Resistance)
 *
 * ANTI-META DESIGN:
 * - Chain bonus caps at 6 cards to prevent infinite scaling
 * - Multipliers cap at 4.0x to prevent one-shot builds
 * - Contradictions severely punish incoherent play
 * - Diverse card types encouraged through coherentism bonuses
 */

import {
  Card,
  Enemy,
  Boss,
  Relic,
  DamageBreakdown,
  StatusEffect,
  CardType,
} from '@/types/mind-architect'

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_MULTIPLIER = 4.0 // Hard cap to prevent cheese
const MAX_CHAIN_BONUS = 1.75 // Cap at 6+ cards

// Chain bonuses by card count
const CHAIN_BONUSES: Record<number, number> = {
  1: 1.0,
  2: 1.0,
  3: 1.1,  // 10% bonus at 3 cards
  4: 1.25, // 25% bonus at 4 cards
  5: 1.5,  // 50% bonus at 5 cards
  6: 1.75, // 75% bonus at 6+ cards (capped)
}

// Contradiction pairs that break coherence
const CONTRADICTION_PAIRS: [string, string][] = [
  ['thesis', 'antithesis'],
  ['absolute_truth', 'relativism'],
  ['determinism', 'free_will'],
  ['certainty', 'radical_skepticism'],
  ['materialism', 'idealism'],
]

// Cards that prevent contradiction penalty
const SYNTHESIS_CARDS = ['synthesis', 'dialectic', 'aufhebung', 'coherentism']

// =============================================================================
// MAIN DAMAGE CALCULATION
// =============================================================================

export function calculateDamage(
  playedCards: Card[],
  relics: Relic[],
  enemy: Enemy | Boss,
  playerStatusEffects: StatusEffect[] = []
): DamageBreakdown {
  // Initialize breakdown for tracking
  const breakdown: DamageBreakdown = {
    totalWeight: 0,
    totalMultiplier: 1.0,
    chainBonus: 1.0,
    relicBonuses: 0,
    resistanceReduction: 0,
    finalDamage: 0,
    weightSources: [],
    multiplierSources: [],
    bonusSources: [],
  }

  if (playedCards.length === 0) {
    return breakdown
  }

  // ==========================================================================
  // 1. CALCULATE BASE WEIGHT (from Evidence cards)
  // ==========================================================================

  for (const card of playedCards) {
    if (card.type === 'evidence' && card.weight) {
      breakdown.totalWeight += card.weight
      breakdown.weightSources.push({ card: card.name, value: card.weight })
    }

    // Flaw cards can have negative or special weight
    if (card.type === 'flaw' && card.weight) {
      breakdown.totalWeight += card.weight
      breakdown.weightSources.push({ card: card.name, value: card.weight })
    }
  }

  // ==========================================================================
  // 2. APPLY WEIGHT BONUSES (from card effects)
  // ==========================================================================

  for (const card of playedCards) {
    if (card.effect?.type === 'weight_bonus') {
      const bonus = calculateWeightBonus(card, playedCards)
      breakdown.totalWeight += bonus
      if (bonus > 0) {
        breakdown.bonusSources.push({ source: `${card.name} bonus`, value: bonus })
      }
    }
  }

  // Framework global bonuses (like Thesis)
  const thesisCard = playedCards.find(c => c.id === 'thesis')
  if (thesisCard) {
    const evidenceCount = playedCards.filter(c => c.type === 'evidence').length
    const bonus = 3 * evidenceCount // +3 weight per evidence
    breakdown.totalWeight += bonus
    breakdown.bonusSources.push({ source: 'Thesis bonus', value: bonus })
  }

  // ==========================================================================
  // 3. CALCULATE MULTIPLIER (from Logic cards)
  // ==========================================================================

  for (const card of playedCards) {
    if (card.type === 'logic' && card.multiplier) {
      breakdown.totalMultiplier *= card.multiplier
      breakdown.multiplierSources.push({ card: card.name, value: card.multiplier })
    }
  }

  // ==========================================================================
  // 4. APPLY MULTIPLIER BONUSES (from card effects and frameworks)
  // ==========================================================================

  for (const card of playedCards) {
    if (card.effect?.type === 'multiplier_bonus') {
      const bonus = calculateMultiplierBonus(card, playedCards)
      breakdown.totalMultiplier += bonus
      if (bonus > 0) {
        breakdown.bonusSources.push({ source: `${card.name} mult bonus`, value: bonus })
      }
    }
  }

  // Antithesis framework bonus
  const antithesisCard = playedCards.find(c => c.id === 'antithesis')
  if (antithesisCard) {
    const logicCount = playedCards.filter(c => c.type === 'logic').length
    const bonus = 0.2 * logicCount // +0.2 mult per logic card
    breakdown.totalMultiplier += bonus
    breakdown.bonusSources.push({ source: 'Antithesis bonus', value: bonus })
  }

  // Socratic "Why?" chain bonus
  const whyCards = playedCards.filter(c => c.id === 'socratic_question')
  if (whyCards.length > 1) {
    // Each additional "Why?" adds escalating bonus
    for (let i = 1; i < whyCards.length; i++) {
      const bonus = 0.3 * i // 0.3, 0.6, 0.9...
      breakdown.totalMultiplier += bonus
      breakdown.bonusSources.push({ source: `Why? chain ×${i + 1}`, value: bonus })
    }
  }

  // Apply multiplier cap
  if (breakdown.totalMultiplier > MAX_MULTIPLIER) {
    breakdown.totalMultiplier = MAX_MULTIPLIER
    breakdown.bonusSources.push({ source: 'Multiplier cap', value: 0 })
  }

  // ==========================================================================
  // 5. CALCULATE CHAIN BONUS
  // ==========================================================================

  const chainLength = Math.min(playedCards.length, 6)
  breakdown.chainBonus = CHAIN_BONUSES[chainLength] || MAX_CHAIN_BONUS

  // ==========================================================================
  // 6. CHECK FOR CONTRADICTIONS
  // ==========================================================================

  const hasContradiction = checkContradictions(playedCards)
  const hasSynthesis = playedCards.some(c => SYNTHESIS_CARDS.includes(c.id))

  if (hasContradiction && !hasSynthesis) {
    // Contradiction penalty: no chain bonus AND coherence damage
    breakdown.chainBonus = 1.0
    breakdown.bonusSources.push({ source: 'Contradiction penalty', value: 0 })
  }

  // ==========================================================================
  // 7. SYNTHESIS MEGA-BONUS
  // ==========================================================================

  // If Synthesis is played with both Thesis and Antithesis
  const hasSynthesisCard = playedCards.some(c => c.id === 'synthesis')
  const hasThesis = playedCards.some(c => c.id === 'thesis')
  const hasAntithesis = playedCards.some(c => c.id === 'antithesis')

  if (hasSynthesisCard && hasThesis && hasAntithesis) {
    breakdown.totalWeight += 5
    breakdown.totalMultiplier += 0.5
    breakdown.bonusSources.push({ source: 'Hegelian Synthesis', value: 5.5 })
  }

  // ==========================================================================
  // 8. APPLY RELIC BONUSES
  // ==========================================================================

  for (const relic of relics) {
    if (relic.effect.type === 'weight_bonus') {
      breakdown.relicBonuses += relic.effect.value || 0
    }
    if (relic.effect.type === 'multiplier_bonus') {
      breakdown.totalMultiplier += relic.effect.value || 0
    }
    if (relic.effect.type === 'chain_bonus') {
      breakdown.chainBonus += relic.effect.value || 0
    }
  }

  // ==========================================================================
  // 9. APPLY PLAYER STATUS EFFECTS
  // ==========================================================================

  const strengthBuff = playerStatusEffects.find(s => s.id === 'strength')
  if (strengthBuff) {
    breakdown.relicBonuses += strengthBuff.value
  }

  // ==========================================================================
  // 10. APPLY ENEMY RESISTANCE
  // ==========================================================================

  // Calculate resistance based on card types played
  if (enemy.resistances.evidence) {
    const evidenceWeight = playedCards
      .filter(c => c.type === 'evidence')
      .reduce((sum, c) => sum + (c.weight || 0), 0)
    breakdown.resistanceReduction += Math.min(enemy.resistances.evidence, evidenceWeight)
  }

  if (enemy.resistances.logic) {
    // Logic resistance reduces multiplier instead of flat damage
    const reduction = enemy.resistances.logic * 0.1
    breakdown.totalMultiplier = Math.max(1.0, breakdown.totalMultiplier - reduction)
  }

  if (enemy.resistances.framework) {
    // Framework resistance reduces bonus
    const frameworkBonus = breakdown.bonusSources
      .filter(b => b.source.includes('bonus'))
      .reduce((sum, b) => sum + b.value, 0)
    breakdown.resistanceReduction += Math.min(enemy.resistances.framework, frameworkBonus)
  }

  // Check for piercing effects
  const hasPiercing = playedCards.some(c => c.id === 'first_principles')
  if (hasPiercing) {
    breakdown.resistanceReduction = 0
    breakdown.bonusSources.push({ source: 'First Principles (pierce)', value: 0 })
  }

  // Enemy shield reduces damage
  if (enemy.shield > 0) {
    breakdown.resistanceReduction += enemy.shield
  }

  // ==========================================================================
  // 11. FINAL CALCULATION
  // ==========================================================================

  const rawDamage = breakdown.totalWeight * breakdown.totalMultiplier * breakdown.chainBonus
  const withBonuses = rawDamage + breakdown.relicBonuses
  const afterResistance = withBonuses - breakdown.resistanceReduction

  breakdown.finalDamage = Math.max(0, Math.round(afterResistance))

  // ==========================================================================
  // 12. SPECIAL CARD EFFECTS (post-calculation)
  // ==========================================================================

  // Nihilism zeroes all damage
  if (playedCards.some(c => c.id === 'nihilism')) {
    breakdown.finalDamage = 0
    breakdown.bonusSources.push({ source: 'Nihilism (zeroed)', value: -breakdown.finalDamage })
  }

  // Memento Mori triples damage at low HP (handled externally via condition)

  return breakdown
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateWeightBonus(card: Card, playedCards: Card[]): number {
  if (!card.effect || card.effect.type !== 'weight_bonus') return 0

  const baseValue = card.effect.value || 0

  // Check condition
  if (card.effect.condition) {
    const condition = card.effect.condition
    switch (condition.type) {
      case 'card_type': {
        const matchingCards = playedCards.filter(c => c.type === condition.value)
        return baseValue * matchingCards.length
      }
      case 'card_count': {
        if (evaluateCondition(playedCards.length, condition.operator, condition.value as number)) {
          return baseValue
        }
        return 0
      }
      default:
        return baseValue
    }
  }

  return baseValue
}

function calculateMultiplierBonus(card: Card, playedCards: Card[]): number {
  if (!card.effect || card.effect.type !== 'multiplier_bonus') return 0

  const baseValue = card.effect.value || 0

  if (card.effect.condition) {
    const condition = card.effect.condition
    switch (condition.type) {
      case 'card_type': {
        const matchingCards = playedCards.filter(c => c.type === condition.value)
        return baseValue * matchingCards.length
      }
      case 'card_count': {
        if (evaluateCondition(playedCards.length, condition.operator, condition.value as number)) {
          return baseValue
        }
        return 0
      }
      default:
        return baseValue
    }
  }

  return baseValue
}

function checkContradictions(cards: Card[]): boolean {
  const cardIds = cards.map(c => c.id)

  for (const [a, b] of CONTRADICTION_PAIRS) {
    if (cardIds.includes(a) && cardIds.includes(b)) {
      return true
    }
  }

  // Also check card-defined contradictions
  for (const card of cards) {
    if (card.contradicts) {
      for (const contradictId of card.contradicts) {
        if (cardIds.includes(contradictId)) {
          return true
        }
      }
    }
  }

  return false
}

function evaluateCondition(
  value: number,
  operator: string,
  target: number
): boolean {
  switch (operator) {
    case '>': return value > target
    case '<': return value < target
    case '>=': return value >= target
    case '<=': return value <= target
    case '=': return value === target
    default: return false
  }
}

// =============================================================================
// DAMAGE PREVIEW (for UI)
// =============================================================================

export function getDamagePreview(
  currentPlayArea: Card[],
  potentialCard: Card,
  relics: Relic[],
  enemy: Enemy | Boss
): DamageBreakdown {
  const preview = [...currentPlayArea, potentialCard]
  return calculateDamage(preview, relics, enemy)
}

// =============================================================================
// COHERENCE DAMAGE CALCULATION
// =============================================================================

export function calculateCoherenceDamage(
  playedCards: Card[],
  playerStatusEffects: StatusEffect[] = []
): number {
  let damage = 0

  // Contradiction penalty: 5 coherence damage
  const hasContradiction = checkContradictions(playedCards)
  const hasSynthesis = playedCards.some(c => SYNTHESIS_CARDS.includes(c.id))

  if (hasContradiction && !hasSynthesis) {
    damage += 5
  }

  // Self-damage from certain cards
  for (const card of playedCards) {
    if (card.effect?.type === 'damage' && card.effect.target === 'self') {
      damage += card.effect.value || 0
    }
  }

  // Vulnerable status increases damage taken
  const vulnerable = playerStatusEffects.find(s => s.id === 'vulnerable')
  if (vulnerable) {
    damage = Math.round(damage * 1.5)
  }

  return damage
}

// =============================================================================
// TYPE DIVERSITY BONUS
// =============================================================================

export function getTypeDiversityBonus(playedCards: Card[]): number {
  const types = new Set<CardType>()
  for (const card of playedCards) {
    types.add(card.type)
  }

  // Coherentism bonus: +1 weight per unique type (excluding flaws)
  const meaningfulTypes = Array.from(types).filter(t => t !== 'flaw')
  return meaningfulTypes.length
}
