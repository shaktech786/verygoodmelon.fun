import { CardDef, CardEffects, CardInstance, CardType } from '@/types/thought-pockets'

export const CARDS: CardDef[] = [
  { id: 'observation', name: 'Observation', type: 'evidence', rarity: 'starter', cost: 1, weight: 4, upgrade: { weight: 6 }, flavor: 'Look carefully before you speak.' },
  { id: 'anecdote', name: 'Anecdote', type: 'evidence', rarity: 'common', cost: 0, weight: 2, upgrade: { weight: 4 }, flavor: 'One story is not data, but it is a start.' },
  { id: 'statistic', name: 'Statistic', type: 'evidence', rarity: 'common', school: 'empiricist', cost: 1, weight: 6, upgrade: { weight: 9 }, flavor: 'Count before you conclude.' },
  { id: 'first_hand', name: 'First-Hand Account', type: 'evidence', rarity: 'common', cost: 1, weight: 4, draw: 1, upgrade: { weight: 6 }, flavor: 'I was there.' },
  { id: 'field_study', name: 'Field Study', type: 'evidence', rarity: 'common', school: 'empiricist', cost: 2, weight: 11, upgrade: { weight: 15 }, flavor: 'Slow, patient, and hard to argue with.' },
  { id: 'corroboration', name: 'Corroboration', type: 'evidence', rarity: 'uncommon', school: 'empiricist', cost: 1, weight: 2, weightPerOtherEvidence: 2, upgrade: { weightPerOtherEvidence: 3 }, flavor: 'Two witnesses who never met.' },
  { id: 'smoking_gun', name: 'Smoking Gun', type: 'evidence', rarity: 'rare', cost: 3, weight: 12, upgrade: { weight: 16 }, flavor: 'Some evidence leaves no room.' },
  { id: 'counterexample', name: 'Counterexample', type: 'evidence', rarity: 'uncommon', school: 'skeptic', cost: 1, weight: 3, pierce: true, upgrade: { weight: 6 }, flavor: 'One black swan is enough.' },
  { id: 'lived_experience', name: 'Lived Experience', type: 'evidence', rarity: 'uncommon', school: 'absurdist', cost: 1, weight: 3, weightIfLowResolve: 6, upgrade: { weight: 5 }, flavor: 'Hard days teach what books cannot.' },
  { id: 'amor_fati', name: 'Amor Fati', type: 'evidence', rarity: 'uncommon', school: 'absurdist', cost: 1, weight: 2, weightPerDoubtInHand: 4, upgrade: { weightPerDoubtInHand: 5 }, flavor: 'Love your fate, including the messy parts.' },
  { id: 'thesis', name: 'Thesis', type: 'evidence', rarity: 'uncommon', cost: 2, weight: 9, retain: true, upgrade: { weight: 12 }, flavor: 'Years in the making. It can wait one more day.' },

  { id: 'therefore', name: 'Therefore', type: 'logic', rarity: 'starter', cost: 1, multiplier: 0.5, upgrade: { multiplier: 1 }, flavor: 'The bridge from reasons to a point.' },
  { id: 'modus_ponens', name: 'Modus Ponens', type: 'logic', rarity: 'common', school: 'rationalist', cost: 1, multiplier: 1, upgrade: { multiplier: 1.5 }, flavor: 'If P then Q. P. So, Q.' },
  { id: 'induction', name: 'Induction', type: 'logic', rarity: 'common', school: 'empiricist', cost: 1, multiplier: 0, multiplierPerEvidence: 0.5, upgrade: { multiplier: 0.5 }, flavor: 'From many cases, a pattern.' },
  { id: 'deduction', name: 'Deduction', type: 'logic', rarity: 'uncommon', school: 'rationalist', cost: 1, multiplier: 0.5, multiplierPerOtherLogic: 0.5, upgrade: { multiplier: 1 }, flavor: 'From the general to the particular.' },
  { id: 'syllogism', name: 'Syllogism', type: 'logic', rarity: 'uncommon', school: 'rationalist', cost: 2, multiplier: 2, upgrade: { multiplier: 2.5 }, flavor: 'All people wonder. You are a person.' },
  { id: 'steelman', name: 'Steelman', type: 'logic', rarity: 'common', school: 'pragmatist', cost: 1, multiplier: 0.5, guard: 3, upgrade: { guard: 6 }, flavor: 'Answer the strongest version of their view.' },
  { id: 'first_principles', name: 'First Principles', type: 'logic', rarity: 'uncommon', school: 'skeptic', cost: 1, multiplier: 0.5, pierce: true, upgrade: { multiplier: 1 }, flavor: 'Start again from what you know.' },
  { id: 'working_hypothesis', name: 'Working Hypothesis', type: 'logic', rarity: 'common', cost: 1, multiplier: 0.5, retain: true, upgrade: { multiplier: 1 }, flavor: 'Hold it loosely, and keep it handy.' },
  { id: 'first_premise', name: 'First Premise', type: 'logic', rarity: 'uncommon', cost: 2, lastingMultiplier: 0.5, exhaust: true, upgrade: { cost: 1 }, flavor: 'Settle one thing, and everything after stands on it.' },
  { id: 'qed', name: 'Q.E.D.', type: 'logic', rarity: 'rare', school: 'rationalist', cost: 2, multiplier: 1, conclusionTimes: 3, upgrade: { multiplier: 1.5 }, flavor: 'Which was to be shown.' },

  { id: 'caveat', name: 'Caveat', type: 'guard', rarity: 'starter', cost: 1, guard: 6, upgrade: { guard: 9 }, flavor: 'Admit what you do not know.' },
  { id: 'concede', name: 'Concede a Point', type: 'guard', rarity: 'common', cost: 0, guard: 4, upgrade: { guard: 6 }, flavor: 'Fair enough. Now, about the rest.' },
  { id: 'measured_reply', name: 'Measured Reply', type: 'guard', rarity: 'common', school: 'pragmatist', cost: 1, guard: 4, weight: 2, upgrade: { guard: 6, weight: 3 }, flavor: 'Calm is persuasive.' },
  { id: 'burden_of_proof', name: 'Burden of Proof', type: 'guard', rarity: 'common', school: 'pragmatist', cost: 2, guard: 12, upgrade: { guard: 17 }, flavor: 'Show me, then.' },
  { id: 'common_ground', name: 'Common Ground', type: 'guard', rarity: 'uncommon', cost: 1, guard: 5, draw: 1, upgrade: { guard: 8 }, flavor: 'Start where you agree.' },
  { id: 'patience', name: 'Patience', type: 'guard', rarity: 'common', cost: 1, guard: 6, retain: true, upgrade: { guard: 9 }, flavor: 'Not now. When it matters.' },
  { id: 'pause', name: 'Pause', type: 'guard', rarity: 'uncommon', school: 'skeptic', cost: 2, postpone: true, upgrade: { cost: 1 }, flavor: 'Let me think about that.' },

  { id: 'insight', name: 'Insight', type: 'rhetoric', rarity: 'uncommon', cost: 0, draw: 2, upgrade: { draw: 3 }, flavor: 'A small light comes on.' },
  { id: 'clarity', name: 'Clarity', type: 'rhetoric', rarity: 'uncommon', cost: 0, focus: 1, upgrade: { focus: 1, draw: 1 }, flavor: 'The fog lifts for a moment.' },
  { id: 'eureka', name: 'Eureka', type: 'rhetoric', rarity: 'uncommon', cost: 0, focus: 2, exhaust: true, upgrade: { focus: 3 }, flavor: 'It arrives in the bath, as always.' },
  { id: 'sleep_on_it', name: 'Sleep On It', type: 'rhetoric', rarity: 'common', cost: 1, nextTurnFocus: 2, draw: 1, upgrade: { nextTurnFocus: 3 }, flavor: 'Tomorrow you will know more.' },
  { id: 'breathe', name: 'Breathe', type: 'rhetoric', rarity: 'common', school: 'pragmatist', cost: 1, restore: 7, upgrade: { restore: 10 }, flavor: 'In for four, out for six.' },
  { id: 'why', name: 'Why?', type: 'rhetoric', rarity: 'starter', school: 'skeptic', cost: 0, unsettle: 1, upgrade: { unsettle: 2 }, flavor: 'The smallest question, asked again.' },
  { id: 'socratic_method', name: 'Socratic Method', type: 'rhetoric', rarity: 'uncommon', school: 'skeptic', cost: 1, unsettle: 4, upgrade: { unsettle: 6 }, flavor: 'Let them find the hole themselves.' },
  { id: 'probing_question', name: 'Probing Question', type: 'rhetoric', rarity: 'common', school: 'skeptic', cost: 1, unsettle: 3, draw: 1, upgrade: { unsettle: 4 }, flavor: 'And how would you know that?' },
  { id: 'question_everything', name: 'Question Everything', type: 'rhetoric', rarity: 'rare', school: 'skeptic', cost: 2, unsettlePerCard: 1, upgrade: { cost: 1 }, flavor: 'Nothing gets a free pass.' },
  { id: 'embrace_absurd', name: 'Embrace the Absurd', type: 'rhetoric', rarity: 'uncommon', school: 'absurdist', cost: 1, draw: 2, addDoubt: 1, upgrade: { draw: 3 }, flavor: 'One must imagine the boulder light.' },

  { id: 'doubt', name: 'Doubt', type: 'doubt', rarity: 'doubt', cost: 0, flavor: 'A nagging little voice.' },
]

const CARD_INDEX = new Map(CARDS.map((card) => [card.id, card]))

export const TYPE_LABELS: Record<CardType, string> = {
  evidence: 'Evidence',
  logic: 'Logic',
  guard: 'Guard',
  rhetoric: 'Rhetoric',
  doubt: 'Doubt',
}

export function getCardDef(cardId: string): CardDef {
  const card = CARD_INDEX.get(cardId)
  if (!card) throw new Error(`Unknown card: ${cardId}`)
  return card
}

export function resolveCard(instance: Pick<CardInstance, 'cardId' | 'upgraded'>): CardDef {
  const base = getCardDef(instance.cardId)
  if (!instance.upgraded || !base.upgrade) return base
  return { ...base, ...base.upgrade, name: `${base.name}+` }
}

export function canUpgrade(instance: CardInstance): boolean {
  return !instance.upgraded && getCardDef(instance.cardId).upgrade !== undefined
}

export function isDoubt(instance: Pick<CardInstance, 'cardId'>): boolean {
  return getCardDef(instance.cardId).type === 'doubt'
}

/** Cards using a keyword beyond the basic vocabulary. They are offered from floor 2 unless they belong to your school. */
export function usesKeyword(card: CardEffects): boolean {
  return Boolean(card.pierce || card.postpone || card.unsettle || card.unsettlePerCard || card.retain || card.exhaust || card.lastingMultiplier)
}

function formatMultiplier(value: number): string {
  return `+${value}`
}

export function describeCard(card: CardDef): string[] {
  if (card.type === 'doubt') return ['Cannot be played.']
  const lines: string[] = []
  if (card.weight) lines.push(`+${card.weight} Weight.`)
  if (card.weightPerOtherEvidence) lines.push(`+${card.weightPerOtherEvidence} Weight for each other Evidence in this argument.`)
  if (card.weightIfLowResolve) lines.push(`+${card.weightIfLowResolve} more Weight if your Resolve is at half or less.`)
  if (card.weightPerDoubtInHand) lines.push(`+${card.weightPerDoubtInHand} Weight for each Doubt in your hand.`)
  if (card.multiplier) lines.push(`${formatMultiplier(card.multiplier)} Multiplier.`)
  if (card.multiplierPerEvidence) lines.push(`+${card.multiplierPerEvidence} Multiplier for each Evidence in this argument.`)
  if (card.multiplierPerOtherLogic) lines.push(`+${card.multiplierPerOtherLogic} Multiplier for each other Logic in this argument.`)
  if (card.guard) lines.push(`${card.guard} Guard.`)
  if (card.unsettle) lines.push(`Unsettle ${card.unsettle}.`)
  if (card.unsettlePerCard) lines.push(`Unsettle 1 for each card in this argument.`)
  if (card.pierce) lines.push('Pierce.')
  if (card.postpone) lines.push('Postpone.')
  if (card.draw) lines.push(card.draw === 1 ? 'Draw 1 card.' : `Draw ${card.draw} cards.`)
  if (card.focus) lines.push(`Gain ${card.focus} Focus.`)
  if (card.restore) lines.push(`Restore ${card.restore} Resolve.`)
  if (card.addDoubt) lines.push('Add a Doubt to your hand for this fight.')
  if (card.lastingMultiplier) lines.push(`For the rest of this fight, every argument gets +${card.lastingMultiplier} Multiplier.`)
  if (card.nextTurnFocus) lines.push(`Next turn, gain ${card.nextTurnFocus} Focus.`)
  if (card.conclusionTimes) lines.push(`As your Conclusion it counts ${card.conclusionTimes} times, not twice.`)
  if (card.retain) lines.push('Keep.')
  if (card.exhaust) lines.push('Once.')
  return lines
}

/** The same effects in a few words each, for small cards on a phone. The full text is in the card's label. */
export function summarizeCard(card: CardDef): string[] {
  if (card.type === 'doubt') return ['Unplayable']
  const parts: string[] = []
  if (card.weight) parts.push(`+${card.weight} Weight`)
  if (card.weightPerOtherEvidence) parts.push(`+${card.weightPerOtherEvidence} per other Evidence`)
  if (card.weightIfLowResolve) parts.push(`+${card.weightIfLowResolve} at half Resolve`)
  if (card.weightPerDoubtInHand) parts.push(`+${card.weightPerDoubtInHand} per Doubt in hand`)
  if (card.multiplier) parts.push(`+${card.multiplier} Mult`)
  if (card.multiplierPerEvidence) parts.push(`+${card.multiplierPerEvidence} Mult per Evidence`)
  if (card.multiplierPerOtherLogic) parts.push(`+${card.multiplierPerOtherLogic} Mult per other Logic`)
  if (card.lastingMultiplier) parts.push(`+${card.lastingMultiplier} Mult all fight`)
  if (card.guard) parts.push(`${card.guard} Guard`)
  if (card.unsettle) parts.push(`Unsettle ${card.unsettle}`)
  if (card.unsettlePerCard) parts.push('Unsettle per card')
  if (card.pierce) parts.push('Pierce')
  if (card.postpone) parts.push('Postpone')
  if (card.draw) parts.push(`Draw ${card.draw}`)
  if (card.focus) parts.push(`+${card.focus} Focus`)
  if (card.nextTurnFocus) parts.push(`+${card.nextTurnFocus} Focus next turn`)
  if (card.restore) parts.push(`Restore ${card.restore}`)
  if (card.addDoubt) parts.push('+1 Doubt')
  if (card.conclusionTimes) parts.push(`Conclusion ×${card.conclusionTimes}`)
  if (card.retain) parts.push('Keep')
  if (card.exhaust) parts.push('Once')
  return parts
}
