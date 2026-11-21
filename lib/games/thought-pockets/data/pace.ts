export const REST_HEAL_PERCENT = { gentle: 40, rigorous: 30 } as const
export const RIGOROUS_FLOOR_HEAL = 20
export const RIGOROUS_HEALTH = 1.25
export const RIGOROUS_ATTACK = 2
export const MAX_RIGOR = 7
/** A fight has no turn limit. From this turn the bias tires instead, Unsettled `step` more each turn, so a long fight always ends. */
export const TIRING = { gentle: 10, rigorous: 16, step: 2 } as const

/** The level at which each Rigorous constraint begins. Every level adds exactly one. */
export const RIGOR = {
  noMercy: 1,
  tougher: 2,
  harder: 3,
  doubt: 4,
  bossesHarder: 5,
  secondRule: 6,
  noRestHeal: 7,
} as const

export const RIGOR_LEVELS: { level: number; text: string }[] = [
  {
    level: RIGOR.noMercy,
    text: `No second chances. Rests heal ${REST_HEAL_PERCENT.rigorous}% instead of ${REST_HEAL_PERCENT.gentle}%, and each new floor restores ${RIGOROUS_FLOOR_HEAL} Resolve instead of all of it.`,
  },
  { level: RIGOR.tougher, text: `Biases have ${Math.round((RIGOROUS_HEALTH - 1) * 100)}% more Resolve.` },
  { level: RIGOR.harder, text: `Biases hit ${RIGOROUS_ATTACK} harder.` },
  { level: RIGOR.doubt, text: 'You start with a Doubt in your deck.' },
  { level: RIGOR.bossesHarder, text: `Hard fights and philosophical problems hit ${RIGOROUS_ATTACK} harder again.` },
  { level: RIGOR.secondRule, text: 'Every stubborn bias plays by a second rule as well as its first. Both are shown before you play.' },
  { level: RIGOR.noRestHeal, text: 'Rests no longer restore Resolve: you can only study or let a card go. Tea, encounters and each new floor are how you recover.' },
]

/** Every constraint in force at this level, in the order they were added. */
export function rigorRules(level: number): string[] {
  return RIGOR_LEVELS.filter((l) => l.level <= level).map((l) => l.text)
}
