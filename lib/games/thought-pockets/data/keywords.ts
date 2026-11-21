import { COMPOSURE_GUARD, FOCUS_PER_TURN } from '../engine/battle'

export const KEYWORDS = {
  Weight: 'How heavy your argument is. Evidence adds it.',
  Multiplier: 'Starts at ×1. Logic raises it. Damage = Weight × Multiplier.',
  Conclusion: 'The last card you play. Its Weight or Multiplier counts twice. A Guard card has neither, so it is a poor Conclusion.',
  Guard: 'Absorbs damage, then is used up. It wears off at the start of its owner’s next turn.',
  Focus: `What you spend to play cards. You get ${FOCUS_PER_TURN} each turn. Each Focus you leave unspent becomes ${COMPOSURE_GUARD} Guard when you end your turn.`,
  Resolve: 'Your staying power, and the bias’s. At 0, the argument is over.',
  Unsettle: 'After your argument lands, before it acts, the enemy loses this much Resolve, whatever its Guard. Then its Unsettle halves.',
  Pierce: 'Your argument this turn ignores the enemy’s Guard.',
  Postpone: 'The enemy does not act this round: its plan waits for next round, and its Guard stays.',
  Keep: 'If you do not play it, it stays in your hand when your turn ends.',
  Once: 'After you play it, it is gone for the rest of this fight.',
  Doubt: 'Cannot be played. Doubts added during a fight leave when it ends.',
} as const

export type Keyword = keyof typeof KEYWORDS
