/**
 * Mind Architect - Boss Database
 * Three philosophical bosses representing fundamental questions
 *
 * DESIGN PHILOSOPHY:
 * - Each boss is a QUESTION, not a villain
 * - Multi-phase fights that change mechanics
 * - Teach philosophy through gameplay
 * - Multiple victory conditions (damage, philosophy score, special)
 */

import { Boss, BossPhase, BossReward, AttackPattern } from '@/types/mind-architect'

// =============================================================================
// FLOOR 1 BOSS: THE PROBLEM OF INDUCTION
// =============================================================================

export const PROBLEM_OF_INDUCTION: Boss = {
  id: 'problem_of_induction',
  name: 'The Problem of Induction',
  tier: 'boss',
  floor: 1,
  maxHP: 150,
  currentHP: 150,
  resistances: { evidence: 5 }, // Induction questions evidence itself

  pattern: [], // Overridden by phases

  phases: [
    {
      name: 'Pattern Recognition',
      hpThreshold: 100, // Phase 1: 100% to 66%
      pattern: [
        {
          intent: 'attack',
          damage: 8,
          description: 'The sun rose yesterday...',
        },
        {
          intent: 'attack',
          damage: 8,
          description: '...and the day before...',
        },
        {
          intent: 'attack',
          damage: 12,
          description: '...but will it rise tomorrow?',
        },
        {
          intent: 'buff',
          effect: { type: 'resistance', value: 2 },
          description: 'Accumulated Evidence',
        },
      ],
      dialogue: 'You rely on patterns. Understandable.',
    },
    {
      name: 'Breaking Patterns',
      hpThreshold: 66, // Phase 2: 66% to 33%
      pattern: [
        {
          intent: 'special',
          effect: { type: 'add_flaw' },
          description: 'Black Swan Event',
        },
        {
          intent: 'attack',
          damage: 14,
          description: 'Unexpected Outcome',
        },
        {
          intent: 'debuff',
          effect: { type: 'vulnerable', value: 1, duration: 2, target: 'player' },
          description: 'Shattered Expectations',
        },
        {
          intent: 'attack',
          damage: 10,
          description: 'The Exception',
        },
      ],
      dialogue: 'Now watch as I break them.',
      newEffects: [
        { id: 'chaos', name: 'Chaos', type: 'buff', value: 1, duration: -1, icon: '🌀' },
      ],
    },
    {
      name: 'Faith in Reason',
      hpThreshold: 33, // Phase 3: 33% to 0%
      pattern: [
        {
          intent: 'attack',
          damage: 18,
          description: 'Why Trust Experience?',
        },
        {
          intent: 'defend',
          effect: { type: 'shield', value: 20 },
          description: 'Circular Justification',
        },
        {
          intent: 'attack',
          damage: 12,
          effect: { type: 'drain_tp', value: 1 },
          description: 'Exhausting Skepticism',
        },
      ],
      dialogue: 'And yet you continue. Why?',
    },
  ],

  currentPhase: 0,
  currentPatternIndex: 0,
  statusEffects: [],
  shield: 0,

  specialMechanic: {
    name: 'Humean Doubt',
    description: 'Every 3 turns, all your Evidence cards lose 1 Weight until end of combat.',
    trigger: 'turn_end',
    effect: { type: 'special' },
  },

  description: 'The fundamental question of empiricism: Can we trust our experience?',

  dialogue: {
    intro: [
      'I have been here since the first creature noticed a pattern.',
      '"The sun rose yesterday, it will rise tomorrow." But why?',
      'I am not your enemy. I am the question you must face.',
    ],
    attack: [
      'Past performance does not guarantee future results.',
      'Every induction is a leap of faith.',
    ],
    hurt: [
      'You argue well, but does it PROVE anything?',
      'Experience tells you nothing about tomorrow.',
    ],
    lowHP: [
      'You\'ve understood something important.',
      'The pattern cannot prove itself...',
    ],
    victory: [
      'You trusted patterns that betrayed you.',
      'Without induction, you have nothing.',
    ],
    defeat: [
      'You\'ve understood. The pattern cannot prove itself.',
      'But we act on it anyway. That is faith in experience.',
      'Go. Use your patterns wisely.',
    ],
  },

  rewards: {
    gold: 100,
    cards: 3,
    relic: true,
    insight: 50,
  },
}

// =============================================================================
// FLOOR 2 BOSS: THE TROLLEY PROBLEM
// =============================================================================

export const TROLLEY_PROBLEM: Boss = {
  id: 'trolley_problem',
  name: 'The Trolley Problem',
  tier: 'boss',
  floor: 2,
  maxHP: 200,
  currentHP: 200,
  resistances: { logic: 4 }, // Logic alone can't solve ethics

  pattern: [],

  phases: [
    {
      name: 'Numbers Game',
      hpThreshold: 100, // Phase 1
      pattern: [
        {
          intent: 'attack',
          damage: 10,
          description: 'Five lives vs one',
        },
        {
          intent: 'attack',
          damage: 10,
          description: 'Simple math',
        },
        {
          intent: 'debuff',
          effect: { type: 'vulnerable', value: 1, duration: 1, target: 'player' },
          description: 'Utilitarian Pressure',
        },
        {
          intent: 'attack',
          damage: 15,
          description: 'Greater Good',
        },
      ],
      dialogue: 'Numbers are easy. Five is more than one.',
    },
    {
      name: 'The Personal Touch',
      hpThreshold: 60, // Phase 2
      pattern: [
        {
          intent: 'special',
          effect: { type: 'lock_card', value: 2, target: 'player' },
          description: 'Push the Fat Man?',
        },
        {
          intent: 'attack',
          damage: 14,
          description: 'Your Hands, Your Choice',
        },
        {
          intent: 'debuff',
          effect: { type: 'weak', value: 1, duration: 2, target: 'player' },
          description: 'Moral Weight',
        },
        {
          intent: 'attack',
          damage: 12,
          description: 'Direct Action',
        },
      ],
      dialogue: 'But is a life just a number?',
      newEffects: [
        { id: 'moral_weight', name: 'Moral Weight', type: 'debuff', value: 2, duration: -1, icon: '⚖️' },
      ],
    },
    {
      name: 'Your Answer',
      hpThreshold: 30, // Phase 3
      pattern: [
        {
          intent: 'special',
          damage: 0,
          description: 'What Do YOU Believe?',
        },
        {
          intent: 'attack',
          damage: 20,
          description: 'Defend Your Choice',
        },
        {
          intent: 'attack',
          damage: 16,
          description: 'Live With Consequences',
        },
      ],
      dialogue: 'Who do you want to be? Answer with your actions.',
    },
  ],

  currentPhase: 0,
  currentPatternIndex: 0,
  statusEffects: [],
  shield: 0,

  specialMechanic: {
    name: 'Branching Tracks',
    description: 'At phase 2, you must choose: Utilitarian (deal double damage, take double damage) or Deontological (normal damage, but heal 2 per turn).',
    trigger: 'turn_start',
    effect: { type: 'special' },
  },

  description: 'The classic moral dilemma. There is no right answer—only YOUR answer.',

  dialogue: {
    intro: [
      'I am not a puzzle to be solved. I am a mirror.',
      'What you choose reveals who you are.',
      'There is no right answer—only your answer.',
    ],
    attack: [
      'Can you justify inaction?',
      'What if it were someone you loved?',
    ],
    hurt: [
      'Clever argument. But does it sit right?',
      'Your logic is sound. Is your conscience?',
    ],
    lowHP: [
      'You\'ve chosen. Now defend it.',
      'Every ethicist has an answer. What\'s yours?',
    ],
    victory: [
      'Paralysis is also a choice.',
      'You chose nothing, and something chose you.',
    ],
    defeat: [
      'You\'ve chosen. Not solved—chosen.',
      'That\'s what ethics is.',
      'The trolley problem has no answer. It has a thousand answers.',
      'Yours is now part of the conversation.',
    ],
  },

  rewards: {
    gold: 150,
    cards: 3,
    relic: true,
    insight: 75,
  },
}

// =============================================================================
// FLOOR 3 BOSS: THE MEANING OF LIFE
// =============================================================================

export const MEANING_OF_LIFE: Boss = {
  id: 'meaning_of_life',
  name: 'The Meaning of Life',
  tier: 'boss',
  floor: 3,
  maxHP: 300,
  currentHP: 300,
  resistances: { evidence: 3, logic: 3, framework: 3 }, // Resists everything equally

  pattern: [],

  phases: [
    {
      name: 'Nihilistic Void',
      hpThreshold: 100, // Phase 1
      pattern: [
        {
          intent: 'attack',
          damage: 12,
          description: 'Nothing Matters',
        },
        {
          intent: 'debuff',
          effect: { type: 'add_flaw' },
          description: 'Existential Doubt',
        },
        {
          intent: 'attack',
          damage: 15,
          description: 'Empty Universe',
        },
        {
          intent: 'defend',
          effect: { type: 'shield', value: 25 },
          description: 'Infinite Indifference',
        },
      ],
      dialogue: 'Nothing matters. Can you prove otherwise?',
    },
    {
      name: 'Hedonistic Temptation',
      hpThreshold: 70, // Phase 2
      pattern: [
        {
          intent: 'buff',
          effect: { type: 'regenerate', value: 8 },
          description: 'Pleasure Principle',
        },
        {
          intent: 'attack',
          damage: 14,
          effect: { type: 'weak', value: 1, duration: 1, target: 'player' },
          description: 'Why Struggle?',
        },
        {
          intent: 'attack',
          damage: 10,
          description: 'Comfort Over Truth',
        },
        {
          intent: 'special',
          effect: { type: 'drain_tp', value: 1 },
          description: 'Path of Least Resistance',
        },
      ],
      dialogue: 'Pleasure is enough. Isn\'t it?',
    },
    {
      name: 'Creative Fire',
      hpThreshold: 45, // Phase 3
      pattern: [
        {
          intent: 'special',
          description: 'Demand Your Meaning',
        },
        {
          intent: 'attack',
          damage: 18,
          description: 'Create or Perish',
        },
        {
          intent: 'debuff',
          effect: { type: 'vulnerable', value: 2, duration: 1, target: 'player' },
          description: 'Face the Absurd',
        },
        {
          intent: 'attack',
          damage: 22,
          description: 'Sisyphean Struggle',
        },
      ],
      dialogue: 'Then create your meaning. Show me what you\'ve built.',
    },
    {
      name: 'Final Synthesis',
      hpThreshold: 20, // Phase 4
      pattern: [
        {
          intent: 'attack',
          damage: 25,
          description: 'Your Entire Journey',
        },
        {
          intent: 'special',
          description: 'What Do You Believe? SHOW ME.',
        },
        {
          intent: 'attack',
          damage: 30,
          description: 'Ultimate Challenge',
        },
      ],
      dialogue: 'Your entire journey has been building toward this. What do you believe? SHOW ME.',
    },
  ],

  currentPhase: 0,
  currentPatternIndex: 0,
  statusEffects: [],
  shield: 0,

  specialMechanic: {
    name: 'Philosophy Score',
    description: 'Building coherent arguments (3+ card combos without contradiction) adds to your Philosophy Score. At 100 Philosophy, unlock Transcendent Victory.',
    trigger: 'turn_end',
    effect: { type: 'special' },
  },

  description: 'The question behind all questions. The answer is not found—it is made.',

  dialogue: {
    intro: [
      'I am the question behind all questions.',
      'Why does anything matter?',
      'Some say I have no answer. They are wrong.',
      'The answer is not found. It is made.',
      'What will you make of me?',
    ],
    attack: [
      'Meaning dissolves under scrutiny.',
      'Every purpose you create, I unmake.',
    ],
    hurt: [
      'Interesting. You believe in something.',
      'Your conviction has weight.',
    ],
    lowHP: [
      'You\'ve built something real.',
      'A coherent worldview. Impressive.',
    ],
    victory: [
      'The void claims another seeker.',
      'Without meaning, you are nothing.',
    ],
    defeat: [
      'You\'ve built something real. A coherent worldview.',
      'Not perfect—nothing is. But livable. Defensible. Yours.',
      'Go now. The Abstract Realm releases you.',
      'But you\'ll be back. They always come back.',
    ],
  },

  rewards: {
    gold: 250,
    cards: 0, // Game is over
    relic: false,
    insight: 200,
  },
}

// =============================================================================
// ALTERNATIVE VICTORY DIALOGUES
// =============================================================================

export const BOSS_VICTORY_DIALOGUES = {
  problem_of_induction: {
    philosophical: [
      'You\'ve understood. The pattern cannot prove itself.',
      'But we act on it anyway. That is faith in experience.',
    ],
    combat: [
      'You\'ve overpowered doubt through sheer will.',
      'Sometimes action is the only argument.',
    ],
  },
  trolley_problem: {
    philosophical: [
      'You\'ve chosen with conviction.',
      'That\'s what ethics demands—not certainty, but commitment.',
    ],
    combat: [
      'You bulldozed the dilemma entirely.',
      'Perhaps that IS an answer—refuse the question.',
    ],
  },
  meaning_of_life: {
    philosophical: [
      'You\'ve built something real. A coherent worldview.',
      'Not perfect—nothing is. But livable. Defensible. Yours.',
    ],
    combat: [
      'You\'ve overpowered me through sheer will.',
      'Meaning isn\'t found or made—it\'s FOUGHT FOR.',
      'Perhaps that IS the meaning. The struggle itself.',
    ],
    transcendent: [
      'Amor fati. Love of fate. You accept everything.',
      'Not despite the suffering, but including it.',
      'This is the deepest wisdom: to love the question as much as any answer.',
      'You are free. Truly free.',
    ],
  },
}

// =============================================================================
// COMBINED EXPORTS
// =============================================================================

export const ALL_BOSSES: Boss[] = [
  PROBLEM_OF_INDUCTION,
  TROLLEY_PROBLEM,
  MEANING_OF_LIFE,
]

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getBossById(id: string): Boss | undefined {
  return ALL_BOSSES.find(b => b.id === id)
}

export function getBossByFloor(floor: number): Boss | undefined {
  return ALL_BOSSES.find(b => b.floor === floor)
}

export function createBossInstance(boss: Boss): Boss {
  return {
    ...boss,
    currentHP: boss.maxHP,
    currentPhase: 0,
    currentPatternIndex: 0,
    statusEffects: [],
    shield: 0,
    pattern: boss.phases[0].pattern, // Start with phase 1 pattern
  }
}

export function checkPhaseTransition(boss: Boss): boolean {
  const hpPercent = (boss.currentHP / boss.maxHP) * 100
  const nextPhaseIndex = boss.currentPhase + 1

  if (nextPhaseIndex >= boss.phases.length) return false

  const nextPhase = boss.phases[nextPhaseIndex]
  if (hpPercent <= nextPhase.hpThreshold) {
    return true
  }

  return false
}

export function transitionToNextPhase(boss: Boss): void {
  boss.currentPhase++
  const newPhase = boss.phases[boss.currentPhase]
  boss.pattern = newPhase.pattern
  boss.currentPatternIndex = 0

  // Apply new effects
  if (newPhase.newEffects) {
    boss.statusEffects.push(...newPhase.newEffects)
  }
}

export function getBossPattern(boss: Boss): AttackPattern {
  return boss.pattern[boss.currentPatternIndex]
}

export function advanceBossPattern(boss: Boss): void {
  boss.currentPatternIndex = (boss.currentPatternIndex + 1) % boss.pattern.length
}
