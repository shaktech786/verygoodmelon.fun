/**
 * Mind Architect - Relic Database
 * 30 relics that modify gameplay in interesting ways
 *
 * DESIGN PHILOSOPHY:
 * - No relic should be "mandatory" - all are situationally good
 * - Relics encourage different playstyles, not power creep
 * - School-specific relics enhance school identity
 * - Boss relics are powerful but have drawbacks
 */

import { Relic, School } from '@/types/mind-architect'

// =============================================================================
// STARTER RELICS (One per school)
// =============================================================================

export const STARTER_RELICS: Relic[] = [
  {
    id: 'cogito_ergo_sum',
    name: 'Cogito Ergo Sum',
    description: 'Start each combat with 1 extra TP. "I think, therefore I am."',
    rarity: 'starter',
    effect: {
      type: 'starting_tp',
      value: 1,
      trigger: 'battle_start',
    },
    icon: '🧠',
    school: 'rationalist',
  },
  {
    id: 'empiricists_lens',
    name: 'Empiricist\'s Lens',
    description: 'Evidence cards deal +1 Weight. "All knowledge comes from experience."',
    rarity: 'starter',
    effect: {
      type: 'weight_bonus',
      value: 1,
      condition: { type: 'card_type', operator: '=', value: 'evidence' },
    },
    icon: '🔍',
    school: 'empiricist',
  },
  {
    id: 'pragmatists_toolbox',
    name: 'Pragmatist\'s Toolbox',
    description: 'At the start of each turn, if your hand has all different card types, draw 1. "Truth is what works."',
    rarity: 'starter',
    effect: {
      type: 'draw',
      value: 1,
      trigger: 'turn_start',
    },
    icon: '🧰',
    school: 'pragmatist',
  },
  {
    id: 'skeptics_doubt',
    name: 'Skeptic\'s Doubt',
    description: '"Why?" cards cost 0. Chain them freely. "Question everything."',
    rarity: 'starter',
    effect: {
      type: 'card_cost_reduction',
      value: 99,
    },
    icon: '❓',
    school: 'skeptic',
  },
  {
    id: 'sisyphus_boulder',
    name: 'Sisyphus\'s Boulder',
    description: 'Flaw cards in your deck each give +2 damage. "One must imagine Sisyphus happy."',
    rarity: 'starter',
    effect: {
      type: 'special',
      value: 2,
    },
    icon: '🪨',
    school: 'absurdist',
  },
]

// =============================================================================
// COMMON RELICS
// =============================================================================

export const COMMON_RELICS: Relic[] = [
  {
    id: 'philosophers_stone',
    name: 'Philosopher\'s Stone',
    description: 'At the start of each combat, gain 3 gold. "The alchemist\'s dream."',
    rarity: 'common',
    effect: {
      type: 'gold_bonus',
      value: 3,
      trigger: 'battle_start',
    },
    icon: '💎',
  },
  {
    id: 'thinking_cap',
    name: 'Thinking Cap',
    description: 'Draw 1 additional card at the start of each turn.',
    rarity: 'common',
    effect: {
      type: 'draw',
      value: 1,
      trigger: 'turn_start',
    },
    icon: '🎓',
  },
  {
    id: 'coffee_cup',
    name: 'Coffee Cup',
    description: 'Start each combat with 1 extra TP.',
    rarity: 'common',
    effect: {
      type: 'starting_tp',
      value: 1,
      trigger: 'battle_start',
    },
    icon: '☕',
  },
  {
    id: 'notebook',
    name: 'Well-Worn Notebook',
    description: '+5 Max Coherence.',
    rarity: 'common',
    effect: {
      type: 'max_coherence',
      value: 5,
      trigger: 'passive',
    },
    icon: '📓',
  },
  {
    id: 'quill_pen',
    name: 'Quill Pen',
    description: 'Upgraded cards deal +1 Weight.',
    rarity: 'common',
    effect: {
      type: 'weight_bonus',
      value: 1,
    },
    icon: '🪶',
  },
  {
    id: 'magnifying_glass',
    name: 'Magnifying Glass',
    description: 'See enemy intents 2 turns in advance.',
    rarity: 'common',
    effect: {
      type: 'special',
      value: 2,
    },
    icon: '🔎',
  },
  {
    id: 'hourglass',
    name: 'Hourglass',
    description: 'Every 3 turns, gain 1 TP.',
    rarity: 'common',
    effect: {
      type: 'special',
      value: 3,
      trigger: 'turn_end',
    },
    icon: '⏳',
  },
  {
    id: 'candle',
    name: 'Eternal Candle',
    description: 'Retain 1 card between turns.',
    rarity: 'common',
    effect: {
      type: 'special',
      value: 1,
    },
    icon: '🕯️',
  },
  {
    id: 'compass',
    name: 'Moral Compass',
    description: '+5% gold from battles.',
    rarity: 'common',
    effect: {
      type: 'gold_bonus',
      value: 5,
    },
    icon: '🧭',
  },
  {
    id: 'ancient_scroll',
    name: 'Ancient Scroll',
    description: 'Start with a random rare card in your hand.',
    rarity: 'common',
    effect: {
      type: 'special',
      trigger: 'battle_start',
    },
    icon: '📜',
  },
]

// =============================================================================
// UNCOMMON RELICS
// =============================================================================

export const UNCOMMON_RELICS: Relic[] = [
  {
    id: 'occams_razor_relic',
    name: 'Occam\'s Razor',
    description: 'If your deck has 15 or fewer cards, +0.2 multiplier.',
    rarity: 'uncommon',
    effect: {
      type: 'multiplier_bonus',
      value: 0.2,
      condition: { type: 'card_count', operator: '<=', value: 15 },
    },
    icon: '🪒',
  },
  {
    id: 'hegels_dialectic',
    name: 'Hegel\'s Dialectic',
    description: 'Playing Thesis and Antithesis together automatically adds Synthesis effect.',
    rarity: 'uncommon',
    effect: {
      type: 'special',
    },
    icon: '☯️',
  },
  {
    id: 'socrates_hemlock',
    name: 'Socrates\' Hemlock',
    description: 'Take 3 damage at the start of each combat. Draw 2 extra cards.',
    rarity: 'uncommon',
    effect: {
      type: 'special',
      value: 3,
      trigger: 'battle_start',
    },
    icon: '🍷',
  },
  {
    id: 'platos_cave',
    name: 'Plato\'s Cave',
    description: 'Card rewards show an additional card.',
    rarity: 'uncommon',
    effect: {
      type: 'special',
      value: 1,
    },
    icon: '🕳️',
  },
  {
    id: 'aristotles_golden_mean',
    name: 'Aristotle\'s Golden Mean',
    description: 'If you play exactly 3 cards, +0.3 multiplier.',
    rarity: 'uncommon',
    effect: {
      type: 'multiplier_bonus',
      value: 0.3,
      condition: { type: 'card_count', operator: '=', value: 3 },
    },
    icon: '⚖️',
  },
  {
    id: 'kants_categorical',
    name: 'Categorical Imperative',
    description: 'Framework cards give +1 TP when played.',
    rarity: 'uncommon',
    effect: {
      type: 'special',
      value: 1,
    },
    icon: '📋',
  },
  {
    id: 'mills_utility',
    name: 'Utilitarian Calculus',
    description: '+15% damage if you deal 20+ damage in a turn.',
    rarity: 'uncommon',
    effect: {
      type: 'special',
      value: 15,
    },
    icon: '🧮',
  },
  {
    id: 'nietzsches_hammer',
    name: 'Nietzsche\'s Hammer',
    description: 'All cards deal +2 damage against bosses.',
    rarity: 'uncommon',
    effect: {
      type: 'weight_bonus',
      value: 2,
    },
    icon: '🔨',
  },
  {
    id: 'spinozas_substance',
    name: 'Spinoza\'s Substance',
    description: 'Heal 2 when you rest instead of choosing.',
    rarity: 'uncommon',
    effect: {
      type: 'special',
      value: 2,
      trigger: 'rest',
    },
    icon: '♾️',
  },
  {
    id: 'descartes_method',
    name: 'Descartes\' Method',
    description: 'Once per combat, remove 1 card from your hand from the game.',
    rarity: 'uncommon',
    effect: {
      type: 'special',
      value: 1,
    },
    icon: '📐',
  },
]

// =============================================================================
// RARE RELICS
// =============================================================================

export const RARE_RELICS: Relic[] = [
  {
    id: 'wittgensteins_ladder',
    name: 'Wittgenstein\'s Ladder',
    description: 'Exhaust costs become 0 TP. After playing, discard it.',
    rarity: 'rare',
    effect: {
      type: 'card_cost_reduction',
      value: 99,
    },
    icon: '🪜',
  },
  {
    id: 'russells_paradox',
    name: 'Russell\'s Paradox',
    description: 'When you would take contradiction damage, heal that much instead.',
    rarity: 'rare',
    effect: {
      type: 'special',
    },
    icon: '🔄',
  },
  {
    id: 'godels_incompleteness',
    name: 'Gödel\'s Incompleteness',
    description: 'You cannot win or lose on turn 1. Gain double TP on turn 2.',
    rarity: 'rare',
    effect: {
      type: 'special',
    },
    icon: '∞',
  },
  {
    id: 'ship_of_theseus',
    name: 'Ship of Theseus',
    description: 'Each card removed from your deck permanently gains +1 Weight.',
    rarity: 'rare',
    effect: {
      type: 'special',
    },
    icon: '🚢',
  },
  {
    id: 'pascals_wager',
    name: 'Pascal\'s Wager',
    description: 'On entering a boss room, choose: 2x damage taken OR 2x damage dealt.',
    rarity: 'rare',
    effect: {
      type: 'special',
    },
    icon: '🎲',
  },
]

// =============================================================================
// BOSS RELICS (Powerful but have drawbacks)
// =============================================================================

export const BOSS_RELICS: Relic[] = [
  {
    id: 'induction_crystal',
    name: 'Crystal of Patterns',
    description: 'Evidence deals +3 Weight. But +1 flaw added to deck each floor.',
    rarity: 'boss',
    effect: {
      type: 'weight_bonus',
      value: 3,
    },
    icon: '💠',
    boss: 'problem_of_induction',
  },
  {
    id: 'trolley_lever',
    name: 'The Lever',
    description: 'Start each combat choosing: +3 TP OR +10 Max Coherence.',
    rarity: 'boss',
    effect: {
      type: 'special',
    },
    icon: '🎚️',
    boss: 'trolley_problem',
  },
  {
    id: 'meaning_shard',
    name: 'Shard of Meaning',
    description: 'When you would die, survive with 1 HP instead. Once per run.',
    rarity: 'boss',
    effect: {
      type: 'special',
    },
    icon: '✨',
    boss: 'meaning_of_life',
  },
]

// =============================================================================
// SHOP-ONLY RELICS
// =============================================================================

export const SHOP_RELICS: Relic[] = [
  {
    id: 'membership_card',
    name: 'Philosophy Club Card',
    description: '10% discount at shops.',
    rarity: 'shop',
    effect: {
      type: 'special',
      value: 10,
      trigger: 'shop_enter',
    },
    icon: '💳',
  },
  {
    id: 'lucky_coin',
    name: 'Lucky Drachma',
    description: 'Gain 1 gold whenever you play a card.',
    rarity: 'shop',
    effect: {
      type: 'gold_bonus',
      value: 1,
      trigger: 'play_card',
    },
    icon: '🪙',
  },
  {
    id: 'merchants_friendship',
    name: 'Merchant\'s Favor',
    description: 'One free card removal at each shop.',
    rarity: 'shop',
    effect: {
      type: 'special',
    },
    icon: '🤝',
  },
]

// =============================================================================
// COMBINED EXPORTS
// =============================================================================

export const ALL_RELICS: Relic[] = [
  ...STARTER_RELICS,
  ...COMMON_RELICS,
  ...UNCOMMON_RELICS,
  ...RARE_RELICS,
  ...BOSS_RELICS,
  ...SHOP_RELICS,
]

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getRelicById(id: string): Relic | undefined {
  return ALL_RELICS.find(r => r.id === id)
}

export function getRelicsByRarity(rarity: Relic['rarity']): Relic[] {
  return ALL_RELICS.filter(r => r.rarity === rarity)
}

export function getStarterRelic(school: School): Relic | undefined {
  return STARTER_RELICS.find(r => r.school === school)
}

export function getRandomRelic(rarity?: Relic['rarity']): Relic {
  const pool = rarity ? getRelicsByRarity(rarity) : [...COMMON_RELICS, ...UNCOMMON_RELICS, ...RARE_RELICS]
  return pool[Math.floor(Math.random() * pool.length)]
}

export function getRandomRelicReward(): Relic {
  // Weighted selection: 60% common, 30% uncommon, 10% rare
  const roll = Math.random()
  if (roll < 0.6) {
    return getRandomRelic('common')
  } else if (roll < 0.9) {
    return getRandomRelic('uncommon')
  } else {
    return getRandomRelic('rare')
  }
}

export function getBossRelic(bossId: string): Relic | undefined {
  return BOSS_RELICS.find(r => r.boss === bossId)
}
