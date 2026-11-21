export const KEYWORDS = {
  Weight: 'How heavy your argument is. Evidence adds it.',
  Multiplier: 'Starts at ×1. Logic raises it. Damage = Weight × Multiplier.',
  Conclusion: 'The last card you play. Its Weight or Multiplier counts twice.',
  Guard: 'Absorbs damage, then is used up. It wears off at the start of its owner’s next turn.',
  Focus: 'What you spend to play cards. You get 3 each turn.',
  Resolve: 'Your staying power, and the bias’s. At 0, the argument is over.',
  Unsettle: 'The enemy loses this much Resolve at the end of every round. It stacks and ignores Guard.',
  Pierce: 'Your argument this turn ignores the enemy’s Guard.',
  Postpone: 'The enemy does not act this round. Its plan waits until next round.',
  Doubt: 'Cannot be played. Doubts added during a fight leave when it ends.',
} as const

export type Keyword = keyof typeof KEYWORDS
