import { CardDef, CardEffects, CardInstance, CardType } from '@/types/thought-pockets'
import { CONCLUSION_TIMES, timesWord } from './conclusion'

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
  { id: 'meta_analysis', name: 'Meta-Analysis', type: 'evidence', rarity: 'rare', school: 'empiricist', cost: 1, weight: 2, weightPerEarlierEvidence: 1, upgrade: { weight: 5 }, flavor: 'Every study you ever read, in one place.' },
  { id: 'replication', name: 'Replication', type: 'evidence', rarity: 'rare', school: 'empiricist', cost: 2, weight: 5, conclusionBonus: 1, upgrade: { weight: 8 }, flavor: 'Do it again. Same result? Now we are talking.' },
  { id: 'cash_value', name: 'Cash Value', type: 'evidence', rarity: 'rare', school: 'pragmatist', cost: 1, weightPerGuard: 0.5, upgrade: { cost: 0 }, flavor: 'What difference would it make if it were true?' },
  { id: 'radical_doubt', name: 'Radical Doubt', type: 'evidence', rarity: 'rare', school: 'skeptic', cost: 1, weightPerUnsettle: 1, upgrade: { cost: 0 }, flavor: 'Doubt everything, and see what is still standing.' },
  { id: 'absurd_freedom', name: 'Absurd Freedom', type: 'evidence', rarity: 'rare', school: 'absurdist', cost: 1, weightPerMissingResolve: 0.25, upgrade: { weight: 3 }, flavor: 'Nothing left to prove is a kind of freedom.' },
  { id: 'thesis', name: 'Thesis', type: 'evidence', rarity: 'uncommon', cost: 2, weight: 9, retain: true, upgrade: { weight: 12 }, flavor: 'Years in the making. It can wait one more day.' },

  { id: 'therefore', name: 'Therefore', type: 'logic', rarity: 'starter', cost: 1, multiplier: 0.5, upgrade: { multiplier: 1 }, flavor: 'The bridge from reasons to a point.' },
  { id: 'modus_ponens', name: 'Modus Ponens', type: 'logic', rarity: 'common', school: 'rationalist', cost: 1, multiplier: 1, upgrade: { multiplier: 1.5 }, flavor: 'If P then Q. P. So, Q.' },
  { id: 'induction', name: 'Induction', type: 'logic', rarity: 'common', school: 'empiricist', cost: 1, multiplier: 0, multiplierPerEvidence: 0.5, upgrade: { multiplier: 0.5 }, flavor: 'From many cases, a pattern.' },
  { id: 'deduction', name: 'Deduction', type: 'logic', rarity: 'uncommon', school: 'rationalist', cost: 1, multiplier: 0.5, multiplierPerOtherLogic: 0.5, upgrade: { multiplier: 1 }, flavor: 'From the general to the particular.' },
  { id: 'syllogism', name: 'Syllogism', type: 'logic', rarity: 'uncommon', school: 'rationalist', cost: 2, multiplier: 1.5, upgrade: { multiplier: 2 }, flavor: 'All people wonder. You are a person.' },
  { id: 'steelman', name: 'Steelman', type: 'logic', rarity: 'common', school: 'pragmatist', cost: 1, multiplier: 0.5, guard: 3, upgrade: { guard: 6 }, flavor: 'Answer the strongest version of their view.' },
  { id: 'first_principles', name: 'First Principles', type: 'logic', rarity: 'uncommon', school: 'skeptic', cost: 1, multiplier: 0.5, pierce: true, upgrade: { multiplier: 1 }, flavor: 'Start again from what you know.' },
  { id: 'working_hypothesis', name: 'Working Hypothesis', type: 'logic', rarity: 'common', cost: 1, multiplier: 0.5, retain: true, upgrade: { multiplier: 1 }, flavor: 'Hold it loosely, and keep it handy.' },
  { id: 'first_premise', name: 'First Premise', type: 'logic', rarity: 'uncommon', cost: 2, lastingMultiplier: 0.5, exhaust: true, upgrade: { cost: 1 }, flavor: 'Settle one thing, and everything after stands on it.' },
  { id: 'chain_of_reasoning', name: 'Chain of Reasoning', type: 'logic', rarity: 'rare', school: 'rationalist', cost: 1, multiplierPerEarlierCard: 0.5, upgrade: { multiplierPerEarlierCard: 0.75 }, flavor: 'Each link holds because the last one did.' },
  { id: 'reductio', name: 'Reductio', type: 'logic', rarity: 'rare', school: 'rationalist', cost: 1, multiplierPerDoubtInHand: 1, addDoubt: 1, upgrade: { cost: 0 }, flavor: 'Follow it all the way, until it falls over.' },
  { id: 'pragmatic_maxim', name: 'Pragmatic Maxim', type: 'logic', rarity: 'rare', school: 'pragmatist', cost: 1, multiplier: 0.5, multiplierPerGuardCard: 0.5, guard: 3, upgrade: { multiplierPerGuardCard: 1 }, flavor: 'An idea means what it lets you do.' },
  { id: 'qed', name: 'Q.E.D.', type: 'logic', rarity: 'rare', school: 'rationalist', cost: 2, multiplier: 1, conclusionTimes: 3, upgrade: { multiplier: 1.5 }, flavor: 'Which was to be shown.' },

  { id: 'caveat', name: 'Caveat', type: 'guard', rarity: 'starter', cost: 1, guard: 6, upgrade: { guard: 9 }, flavor: 'Admit what you do not know.' },
  { id: 'concede', name: 'Concede a Point', type: 'guard', rarity: 'common', cost: 0, guard: 4, upgrade: { guard: 6 }, flavor: 'Fair enough. Now, about the rest.' },
  { id: 'measured_reply', name: 'Measured Reply', type: 'guard', rarity: 'common', school: 'pragmatist', cost: 1, guard: 4, weight: 2, upgrade: { guard: 6, weight: 3 }, flavor: 'Calm is persuasive.' },
  { id: 'burden_of_proof', name: 'Burden of Proof', type: 'guard', rarity: 'common', school: 'pragmatist', cost: 2, guard: 12, upgrade: { guard: 17 }, flavor: 'Show me, then.' },
  { id: 'common_ground', name: 'Common Ground', type: 'guard', rarity: 'uncommon', cost: 1, guard: 5, draw: 1, upgrade: { guard: 8 }, flavor: 'Start where you agree.' },
  { id: 'patience', name: 'Patience', type: 'guard', rarity: 'common', cost: 1, guard: 6, retain: true, upgrade: { guard: 9 }, flavor: 'Not now. When it matters.' },
  { id: 'peer_review', name: 'Peer Review', type: 'guard', rarity: 'rare', school: 'empiricist', cost: 1, guardPerEvidence: 3, upgrade: { guardPerEvidence: 4 }, flavor: 'Others check your work, and you stand on firmer ground.' },
  { id: 'revolt', name: 'Revolt', type: 'guard', rarity: 'rare', school: 'absurdist', cost: 1, guard: 2, guardPerDoubtInHand: 4, upgrade: { guardPerDoubtInHand: 6 }, flavor: 'The answer to the absurd is to keep going anyway.' },
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
  { id: 'meliorism', name: 'Meliorism', type: 'rhetoric', rarity: 'rare', school: 'pragmatist', cost: 1, lastingRestore: 3, exhaust: true, upgrade: { lastingRestore: 4 }, flavor: 'Things can be made better. Not perfect: better.' },
  { id: 'epoche', name: 'Epoché', type: 'rhetoric', rarity: 'rare', school: 'skeptic', cost: 1, unsettle: 3, unsettleLasts: true, exhaust: true, upgrade: { unsettle: 5 }, flavor: 'Suspend judgement, and let the question stay open.' },
  { id: 'uphill_again', name: 'Uphill Again', type: 'rhetoric', rarity: 'rare', school: 'absurdist', cost: 1, draw: 1, addDoubt: 2, upgrade: { draw: 2 }, flavor: 'The stone rolls down. You walk back to it, lighter.' },
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

/** For a rate below 1, how many of a thing earn 1: 0.5 per Guard is 1 for every 2. */
function per(rate: number): number {
  return Math.round(1 / rate)
}

function everyOrEach(rate: number, thing: string): string {
  return rate >= 1 ? `+${rate} Weight for each ${thing}` : `+1 Weight for every ${per(rate)} ${thing}`
}

export function describeCard(card: CardDef): string[] {
  if (card.type === 'doubt') return ['Cannot be played.']
  const lines: string[] = []
  if (card.weight) lines.push(`+${card.weight} Weight.`)
  if (card.weightPerOtherEvidence) lines.push(`+${card.weightPerOtherEvidence} Weight for each other Evidence in this argument.`)
  if (card.weightIfLowResolve) lines.push(`+${card.weightIfLowResolve} more Weight if your Resolve is at half or less.`)
  if (card.weightPerDoubtInHand) lines.push(`+${card.weightPerDoubtInHand} Weight for each Doubt in your hand.`)
  if (card.weightPerEarlierEvidence) lines.push(`+${card.weightPerEarlierEvidence} Weight for each Evidence you played in earlier turns of this fight.`)
  if (card.weightPerUnsettle) lines.push(`+${card.weightPerUnsettle} Weight for each Unsettle on the enemy, this argument’s included.`)
  if (card.weightPerMissingResolve) lines.push(`${everyOrEach(card.weightPerMissingResolve, 'Resolve')} you are missing.`)
  if (card.weightPerGuard) lines.push(`${everyOrEach(card.weightPerGuard, 'Guard')} your cards give in this argument.`)
  if (card.multiplier) lines.push(`${formatMultiplier(card.multiplier)} Multiplier.`)
  if (card.multiplierPerEvidence) lines.push(`+${card.multiplierPerEvidence} Multiplier for each Evidence in this argument.`)
  if (card.multiplierPerOtherLogic) lines.push(`+${card.multiplierPerOtherLogic} Multiplier for each other Logic in this argument.`)
  if (card.multiplierPerEarlierCard) lines.push(`+${card.multiplierPerEarlierCard} Multiplier for each card played before it in this argument.`)
  if (card.multiplierPerDoubtInHand) lines.push(`+${card.multiplierPerDoubtInHand} Multiplier for each Doubt in your hand.`)
  if (card.multiplierPerGuardCard) lines.push(`+${card.multiplierPerGuardCard} Multiplier for each Guard card in this argument.`)
  if (card.guard) lines.push(`${card.guard} Guard.`)
  if (card.guardPerEvidence) lines.push(`+${card.guardPerEvidence} Guard for each Evidence in this argument.`)
  if (card.guardPerDoubtInHand) lines.push(`+${card.guardPerDoubtInHand} Guard for each Doubt in your hand.`)
  if (card.unsettle) lines.push(`Unsettle ${card.unsettle}.`)
  if (card.unsettlePerCard) lines.push(`Unsettle 1 for each card in this argument.`)
  if (card.pierce) lines.push('Pierce.')
  if (card.postpone) lines.push('Postpone.')
  if (card.draw) lines.push(card.draw === 1 ? 'Draw 1 card.' : `Draw ${card.draw} cards.`)
  if (card.focus) lines.push(`Gain ${card.focus} Focus.`)
  if (card.restore) lines.push(`Restore ${card.restore} Resolve.`)
  if (card.addDoubt) lines.push(card.addDoubt === 1 ? 'Add a Doubt to your hand for this fight.' : `Add ${card.addDoubt} Doubts to your hand for this fight.`)
  if (card.lastingMultiplier) lines.push(`For the rest of this fight, every argument gets +${card.lastingMultiplier} Multiplier.`)
  if (card.lastingRestore) lines.push(`For the rest of this fight, restore ${card.lastingRestore} Resolve after each round in which you lose none.`)
  if (card.unsettleLasts) lines.push('For the rest of this fight, the enemy’s Unsettle no longer halves.')
  if (card.nextTurnFocus) lines.push(`Next turn, gain ${card.nextTurnFocus} Focus.`)
  if (card.conclusionTimes) lines.push(`As your Conclusion it counts ${timesWord(card.conclusionTimes)}, not ${timesWord(CONCLUSION_TIMES)}.`)
  if (card.conclusionBonus)
    lines.push(`While this is in your argument, your Conclusion counts ${card.conclusionBonus === 1 ? 'one more time' : `${card.conclusionBonus} more times`}.`)
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
  if (card.weightPerEarlierEvidence) parts.push(`+${card.weightPerEarlierEvidence} per Evidence from earlier turns`)
  if (card.weightPerUnsettle) parts.push(`+${card.weightPerUnsettle} per Unsettle`)
  if (card.weightPerMissingResolve) parts.push(`+1 per ${per(card.weightPerMissingResolve)} Resolve missing`)
  if (card.weightPerGuard) parts.push(card.weightPerGuard >= 1 ? `+${card.weightPerGuard} per Guard` : `+1 per ${per(card.weightPerGuard)} Guard`)
  if (card.multiplier) parts.push(`+${card.multiplier} Mult`)
  if (card.multiplierPerEvidence) parts.push(`+${card.multiplierPerEvidence} Mult per Evidence`)
  if (card.multiplierPerOtherLogic) parts.push(`+${card.multiplierPerOtherLogic} Mult per other Logic`)
  if (card.multiplierPerEarlierCard) parts.push(`+${card.multiplierPerEarlierCard} Mult per earlier card`)
  if (card.multiplierPerDoubtInHand) parts.push(`+${card.multiplierPerDoubtInHand} Mult per Doubt`)
  if (card.multiplierPerGuardCard) parts.push(`+${card.multiplierPerGuardCard} Mult per Guard card`)
  if (card.lastingMultiplier) parts.push(`+${card.lastingMultiplier} Mult all fight`)
  if (card.guard) parts.push(`${card.guard} Guard`)
  if (card.guardPerEvidence) parts.push(`+${card.guardPerEvidence} Guard per Evidence`)
  if (card.guardPerDoubtInHand) parts.push(`+${card.guardPerDoubtInHand} Guard per Doubt`)
  if (card.lastingRestore) parts.push(`Restore ${card.lastingRestore} each unhurt round`)
  if (card.unsettleLasts) parts.push('Unsettle stops halving')
  if (card.unsettle) parts.push(`Unsettle ${card.unsettle}`)
  if (card.unsettlePerCard) parts.push('Unsettle per card')
  if (card.pierce) parts.push('Pierce')
  if (card.postpone) parts.push('Postpone')
  if (card.draw) parts.push(`Draw ${card.draw}`)
  if (card.focus) parts.push(`+${card.focus} Focus`)
  if (card.nextTurnFocus) parts.push(`+${card.nextTurnFocus} Focus next turn`)
  if (card.restore) parts.push(`Restore ${card.restore}`)
  if (card.addDoubt) parts.push(`+${card.addDoubt} Doubt${card.addDoubt === 1 ? '' : 's'}`)
  if (card.conclusionTimes) parts.push(`Conclusion ×${card.conclusionTimes}`)
  if (card.conclusionBonus) parts.push(`Conclusion counts +${card.conclusionBonus}`)
  if (card.retain) parts.push('Keep')
  if (card.exhaust) parts.push('Once')
  return parts
}
