/**
 * Thought Pockets - Enemy Database
 * Cognitive biases as enemies with unique attack patterns
 *
 * DESIGN PHILOSOPHY:
 * - Each bias teaches something about itself through mechanics
 * - Patterns should have counterplay - no unavoidable damage
 * - Dialogue adds educational value and personality
 */

import { Enemy, AttackPattern, EnemyDialogue } from '@/types/thought-pockets'

// =============================================================================
// FLOOR 1 ENEMIES - Basic Biases (40-60 HP)
// =============================================================================

export const FLOOR_1_ENEMIES: Enemy[] = [
  {
    id: 'confirmation_bias',
    name: 'Confirmation Bias',
    tier: 'basic',
    floor: 1,
    maxHP: 45,
    currentHP: 45,
    resistances: { evidence: 3 }, // Ignores evidence that disagrees
    pattern: [
      {
        intent: 'defend',
        effect: { type: 'shield', value: 6 },
        description: 'Belief Shield',
      },
      {
        intent: 'attack',
        damage: 6,
        description: 'Selective Attention',
      },
      {
        intent: 'buff',
        effect: { type: 'resistance', value: 2, duration: 2 },
        description: 'Echo Chamber',
      },
      {
        intent: 'attack',
        damage: 9,
        description: 'Reinforced Belief',
      },
    ],
    currentPatternIndex: 0,
    statusEffects: [],
    shield: 0,
    description: 'Only sees what it wants to see. Builds up defenses against contradicting evidence.',
    dialogue: {
      intro: [
        'I\'m just helping you feel comfortable.',
        'Why seek information that hurts?',
      ],
      attack: [
        'You only see what confirms your fears.',
        'Look away from what challenges you.',
      ],
      hurt: [
        'That... doesn\'t fit my narrative.',
        'I\'ll ignore that.',
      ],
      lowHP: [
        'Perhaps... there was more to see.',
        'My certainty wavers...',
      ],
      victory: [
        'See? I was right all along.',
        'Stay in your bubble. It\'s safer here.',
      ],
      defeat: [
        'I\'ll... look again. With fresh eyes.',
        'Maybe I missed something.',
      ],
    },
    weakness: 'evidence',
  },

  {
    id: 'anchoring_bias',
    name: 'Anchoring Bias',
    tier: 'basic',
    floor: 1,
    maxHP: 40,
    currentHP: 40,
    resistances: {},
    pattern: [
      {
        intent: 'debuff',
        effect: { type: 'weak', value: 1, duration: 2, target: 'player' },
        description: 'First Impression',
      },
      {
        intent: 'attack',
        damage: 7,
        description: 'Fixed Point',
      },
      {
        intent: 'attack',
        damage: 7,
        description: 'Fixed Point',
      },
      {
        intent: 'buff',
        effect: { type: 'strength', value: 2 },
        description: 'Dig In',
      },
    ],
    currentPatternIndex: 0,
    statusEffects: [],
    shield: 0,
    description: 'Fixates on the first piece of information. Damage increases as the fight goes on.',
    dialogue: {
      intro: [
        'The first number is the only number.',
        'Let me set the terms.',
      ],
      attack: [
        'Remember where we started.',
        'Everything is relative to this.',
      ],
      hurt: [
        'That changes nothing about my anchor.',
        'Adjust from MY baseline.',
      ],
      lowHP: [
        'Perhaps my starting point was wrong...',
      ],
      victory: [
        'You never escaped my framing.',
      ],
      defeat: [
        'I should have adjusted more.',
      ],
    },
    weakness: 'logic',
  },

  {
    id: 'availability_heuristic',
    name: 'Availability Heuristic',
    tier: 'basic',
    floor: 1,
    maxHP: 42,
    currentHP: 42,
    resistances: {},
    pattern: [
      {
        intent: 'attack',
        damage: 5,
        effect: { type: 'add_flaw', value: 1 },
        description: 'Vivid Memory',
      },
      {
        intent: 'attack',
        damage: 5,
        description: 'Recent Example',
      },
      {
        intent: 'attack',
        damage: 8,
        description: 'Salient Instance',
      },
    ],
    currentPatternIndex: 0,
    statusEffects: [],
    shield: 0,
    description: 'What comes to mind easily must be important. Adds doubt cards to your deck.',
    dialogue: {
      intro: [
        'Remember that one time?',
        'The news just showed...',
      ],
      attack: [
        'This happens ALL the time!',
        'I can think of so many examples.',
      ],
      hurt: [
        'But the stories say...',
      ],
      lowHP: [
        'Maybe it\'s not as common as I thought...',
      ],
      victory: [
        'You\'ll remember this one.',
      ],
      defeat: [
        'Statistics beat anecdotes.',
      ],
    },
    weakness: 'evidence',
  },

  {
    id: 'bandwagon_effect',
    name: 'Bandwagon Effect',
    tier: 'basic',
    floor: 1,
    maxHP: 50,
    currentHP: 50,
    resistances: {},
    pattern: [
      {
        intent: 'buff',
        effect: { type: 'scaling', value: 1 },
        description: 'Growing Crowd',
      },
      {
        intent: 'attack',
        damage: 4,
        effect: { type: 'scaling', value: 1 },
        description: 'Everyone\'s Doing It',
      },
      {
        intent: 'attack',
        damage: 5,
        effect: { type: 'scaling', value: 1 },
        description: 'Peer Pressure',
      },
    ],
    currentPatternIndex: 0,
    statusEffects: [],
    shield: 0,
    description: 'Gains strength each turn. Popular opinion grows more powerful over time.',
    dialogue: {
      intro: [
        'Everyone believes this!',
        'Join us! We\'re the majority.',
      ],
      attack: [
        'Millions can\'t be wrong!',
        'Look how many agree!',
      ],
      hurt: [
        'You dare stand alone?',
      ],
      lowHP: [
        'The crowd is thinning...',
      ],
      victory: [
        'You couldn\'t resist the crowd.',
      ],
      defeat: [
        'Truth isn\'t a popularity contest.',
      ],
    },
    weakness: 'framework',
  },

  {
    id: 'hindsight_bias',
    name: 'Hindsight Bias',
    tier: 'basic',
    floor: 1,
    maxHP: 38,
    currentHP: 38,
    resistances: { logic: 2 },
    pattern: [
      {
        intent: 'attack',
        damage: 6,
        description: 'I Knew It',
      },
      {
        intent: 'attack',
        damage: 6,
        description: 'Obviously',
      },
      {
        intent: 'defend',
        effect: { type: 'shield', value: 8 },
        description: 'Rewritten History',
      },
    ],
    currentPatternIndex: 0,
    statusEffects: [],
    shield: 0,
    description: 'Claims to have predicted everything. Resists logical argument.',
    dialogue: {
      intro: [
        'I knew this would happen.',
        'It was so obvious in retrospect.',
      ],
      attack: [
        'Anyone could have seen this coming.',
        'How did you not predict this?',
      ],
      hurt: [
        'I knew you\'d do that.',
      ],
      lowHP: [
        'I should have seen this defeat coming...',
      ],
      victory: [
        'Predictable, really.',
      ],
      defeat: [
        'I... didn\'t see that coming.',
      ],
    },
    weakness: 'evidence',
  },
]

// =============================================================================
// FLOOR 2 ENEMIES - Complex Biases (55-80 HP)
// =============================================================================

export const FLOOR_2_ENEMIES: Enemy[] = [
  {
    id: 'sunk_cost_fallacy',
    name: 'Sunk Cost Fallacy',
    tier: 'basic',
    floor: 2,
    maxHP: 65,
    currentHP: 65,
    resistances: {},
    pattern: [
      {
        intent: 'attack',
        damage: 5,
        effect: { type: 'scaling', value: 2 },
        description: 'Too Far In',
      },
      {
        intent: 'debuff',
        effect: { type: 'lock_card', value: 1, target: 'player' },
        description: 'Accumulated Weight',
      },
      {
        intent: 'attack',
        damage: 8,
        description: 'Wasted Investment',
      },
      {
        intent: 'special',
        damage: 12,
        effect: { type: 'strength', value: -3, target: 'self' },
        description: 'Doubling Down',
      },
    ],
    currentPatternIndex: 0,
    statusEffects: [],
    shield: 0,
    description: 'Grows stronger the longer the fight. Locks your cards. Self-destructive at high power.',
    dialogue: {
      intro: [
        'You\'ve come so far. Why stop now?',
        'Think of everything you\'ve invested.',
      ],
      attack: [
        'Can\'t give up now!',
        'Just a little more...',
      ],
      hurt: [
        'This cost must mean something!',
      ],
      lowHP: [
        'I can... let go? The weight is lifting...',
      ],
      victory: [
        'You couldn\'t walk away.',
      ],
      defeat: [
        'Sometimes quitting is winning.',
      ],
    },
    weakness: 'meta',
  },

  {
    id: 'dunning_kruger',
    name: 'Dunning-Kruger Effect',
    tier: 'basic',
    floor: 2,
    maxHP: 55,
    currentHP: 55,
    resistances: { framework: 3 },
    pattern: [
      {
        intent: 'buff',
        effect: { type: 'strength', value: 3 },
        description: 'Peak of Mt. Stupid',
      },
      {
        intent: 'attack',
        damage: 10,
        description: 'Confident Strike',
      },
      {
        intent: 'attack',
        damage: 10,
        description: 'Obvious Solution',
      },
      // After taking damage, pattern changes
      {
        intent: 'debuff',
        effect: { type: 'weak', value: 2, target: 'self' },
        description: 'Valley of Despair',
        condition: { type: 'hp_below', value: 50 },
      },
    ],
    currentPatternIndex: 0,
    statusEffects: [],
    shield: 0,
    description: 'Overconfident at first. Weakens dramatically when damaged below 50% HP.',
    dialogue: {
      intro: [
        'I\'ve mastered this already!',
        'Watch my brilliance!',
      ],
      attack: [
        'This is so easy!',
        'Obviously the answer is...',
      ],
      hurt: [
        'What? That\'s not possible!',
        'I KNOW I\'m right!',
      ],
      lowHP: [
        'I... I don\'t know as much as I thought.',
        'Teach me. Please.',
      ],
      victory: [
        'See? I told you I was an expert!',
      ],
      defeat: [
        'I have so much more to learn.',
      ],
    },
    weakness: 'evidence',
  },

  {
    id: 'survivorship_bias',
    name: 'Survivorship Bias',
    tier: 'basic',
    floor: 2,
    maxHP: 60,
    currentHP: 60,
    resistances: { evidence: 2 },
    pattern: [
      {
        intent: 'buff',
        effect: { type: 'strength', value: 2 },
        description: 'Success Stories',
      },
      {
        intent: 'attack',
        damage: 8,
        description: 'Winner\'s Example',
      },
      {
        intent: 'attack',
        damage: 6,
        effect: { type: 'add_flaw' },
        description: 'Hidden Graveyard',
      },
    ],
    currentPatternIndex: 0,
    statusEffects: [],
    shield: 0,
    description: 'Only shows you the winners. Hides the failures in your deck as doubt.',
    dialogue: {
      intro: [
        'Look at all these success stories!',
        'Success leaves clues!',
      ],
      attack: [
        'Just follow the winners!',
        'They made it, so can you!',
      ],
      hurt: [
        'But the successful ones...',
      ],
      lowHP: [
        'The graveyard of failures... I never looked there.',
      ],
      victory: [
        'You\'re just another hidden failure.',
      ],
      defeat: [
        'There\'s wisdom in failure too.',
      ],
    },
    weakness: 'framework',
  },

  {
    id: 'fundamental_attribution',
    name: 'Attribution Error',
    tier: 'basic',
    floor: 2,
    maxHP: 58,
    currentHP: 58,
    resistances: {},
    pattern: [
      {
        intent: 'debuff',
        effect: { type: 'vulnerable', value: 1, duration: 2, target: 'player' },
        description: 'It\'s Your Character',
      },
      {
        intent: 'attack',
        damage: 9,
        description: 'Personal Failing',
      },
      {
        intent: 'defend',
        effect: { type: 'shield', value: 10 },
        description: 'My Circumstances',
      },
    ],
    currentPatternIndex: 0,
    statusEffects: [],
    shield: 0,
    description: 'Blames your character while excusing its own situation. Makes you vulnerable.',
    dialogue: {
      intro: [
        'You failed because of who you are.',
        'I failed because of circumstances.',
      ],
      attack: [
        'That\'s just like you.',
        'Shows your true nature.',
      ],
      hurt: [
        'The situation forced my hand!',
      ],
      lowHP: [
        'Maybe I was wrong about both of us.',
      ],
      victory: [
        'As I expected from someone like you.',
      ],
      defeat: [
        'Context matters for everyone.',
      ],
    },
    weakness: 'logic',
  },

  {
    id: 'in_group_bias',
    name: 'In-Group Bias',
    tier: 'basic',
    floor: 2,
    maxHP: 70,
    currentHP: 70,
    resistances: {},
    pattern: [
      {
        intent: 'buff',
        effect: { type: 'regenerate', value: 3 },
        description: 'Group Support',
      },
      {
        intent: 'attack',
        damage: 7,
        description: 'Us vs Them',
      },
      {
        intent: 'attack',
        damage: 9,
        description: 'Outsider Rejection',
      },
    ],
    currentPatternIndex: 0,
    statusEffects: [],
    shield: 0,
    description: 'Regenerates health. Favors its own. You are the outsider.',
    dialogue: {
      intro: [
        'You\'re not one of us.',
        'Our kind understands.',
      ],
      attack: [
        'For the group!',
        'Outsiders threaten us.',
      ],
      hurt: [
        'The group will avenge me!',
      ],
      lowHP: [
        'Maybe the lines we draw are arbitrary...',
      ],
      victory: [
        'The outsider is defeated.',
      ],
      defeat: [
        'We\'re all on the same team, really.',
      ],
    },
    weakness: 'meta',
  },
]

// =============================================================================
// FLOOR 3 ENEMIES - Mastery Biases (75-100 HP)
// =============================================================================

export const FLOOR_3_ENEMIES: Enemy[] = [
  {
    id: 'just_world_fallacy',
    name: 'Just World Fallacy',
    tier: 'basic',
    floor: 3,
    maxHP: 80,
    currentHP: 80,
    resistances: { evidence: 4 },
    pattern: [
      {
        intent: 'attack',
        damage: 10,
        description: 'You Deserve This',
      },
      {
        intent: 'debuff',
        effect: { type: 'vulnerable', value: 1, duration: 3, target: 'player' },
        description: 'Karmic Debt',
      },
      {
        intent: 'defend',
        effect: { type: 'shield', value: 12 },
        description: 'Cosmic Balance',
      },
      {
        intent: 'attack',
        damage: 15,
        description: 'Just Punishment',
      },
    ],
    currentPatternIndex: 0,
    statusEffects: [],
    shield: 0,
    description: 'Believes everything happens for a reason. High resistance, punishing attacks.',
    dialogue: {
      intro: [
        'The universe is fair. You get what you deserve.',
        'Good things happen to good people.',
      ],
      attack: [
        'You must have done something wrong.',
        'This is cosmic justice.',
      ],
      hurt: [
        'This suffering will be rewarded!',
      ],
      lowHP: [
        'Why do bad things happen to... anyone?',
      ],
      victory: [
        'Justice is served.',
      ],
      defeat: [
        'The universe isn\'t fair. That\'s terrifying.',
      ],
    },
    weakness: 'framework',
  },

  {
    id: 'appeal_to_nature',
    name: 'Appeal to Nature',
    tier: 'basic',
    floor: 3,
    maxHP: 75,
    currentHP: 75,
    resistances: { framework: 3 },
    pattern: [
      {
        intent: 'buff',
        effect: { type: 'regenerate', value: 5 },
        description: 'Natural Healing',
      },
      {
        intent: 'attack',
        damage: 11,
        description: 'Primal Force',
      },
      {
        intent: 'debuff',
        effect: { type: 'add_flaw' },
        description: 'Unnatural Doubt',
      },
    ],
    currentPatternIndex: 0,
    statusEffects: [],
    shield: 0,
    description: 'Regenerates constantly. Calls you unnatural.',
    dialogue: {
      intro: [
        'Nature knows best.',
        'If it\'s natural, it must be good.',
      ],
      attack: [
        'This is the natural order!',
        'Artificial thinking fails!',
      ],
      hurt: [
        'Nature will heal me!',
      ],
      lowHP: [
        'Nature is both beautiful and cruel...',
      ],
      victory: [
        'Nature triumphs over artifice.',
      ],
      defeat: [
        'Natural and good are not the same.',
      ],
    },
    weakness: 'logic',
  },

  {
    id: 'gambler_fallacy',
    name: 'Gambler\'s Fallacy',
    tier: 'basic',
    floor: 3,
    maxHP: 70,
    currentHP: 70,
    resistances: {},
    pattern: [
      {
        intent: 'attack',
        damage: 8,
        description: 'Due Any Moment',
      },
      {
        intent: 'attack',
        damage: 8,
        description: 'Must Be Soon',
      },
      {
        intent: 'attack',
        damage: 8,
        description: 'Definitely Now',
      },
      {
        intent: 'special',
        damage: 20,
        description: 'ALL IN!',
        condition: { type: 'turn', value: 4 },
      },
    ],
    currentPatternIndex: 0,
    statusEffects: [],
    shield: 0,
    description: 'Builds to a massive attack every 4th turn. Predictable but devastating.',
    dialogue: {
      intro: [
        'I\'m due for a win!',
        'The odds must balance out.',
      ],
      attack: [
        'Next one\'s the big one!',
        'The universe owes me.',
      ],
      hurt: [
        'Just bad luck! It\'ll turn around.',
      ],
      lowHP: [
        'One more try! I can feel it!',
      ],
      victory: [
        'See? I knew I\'d win eventually!',
      ],
      defeat: [
        'Each event is independent...',
      ],
    },
    weakness: 'evidence',
  },

  {
    id: 'post_hoc',
    name: 'Post Hoc Ergo Propter Hoc',
    tier: 'basic',
    floor: 3,
    maxHP: 85,
    currentHP: 85,
    resistances: { logic: 4 },
    pattern: [
      {
        intent: 'attack',
        damage: 9,
        description: 'False Cause',
      },
      {
        intent: 'debuff',
        effect: { type: 'weak', value: 1, duration: 1, target: 'player' },
        description: 'Mistaken Connection',
      },
      {
        intent: 'attack',
        damage: 12,
        description: 'Therefore Because',
      },
      {
        intent: 'buff',
        effect: { type: 'strength', value: 2 },
        description: 'Correlated Confidence',
      },
    ],
    currentPatternIndex: 0,
    statusEffects: [],
    shield: 0,
    description: 'Confuses correlation with causation. High resistance to logic.',
    dialogue: {
      intro: [
        'This happened, then that happened. Obviously connected!',
        'After means because.',
      ],
      attack: [
        'The rooster causes the sunrise!',
        'Sequence equals cause!',
      ],
      hurt: [
        'You hurt me, therefore you\'re wrong!',
      ],
      lowHP: [
        'Correlation... isn\'t causation?',
      ],
      victory: [
        'QED. I was first, therefore I won.',
      ],
      defeat: [
        'Timing proves nothing.',
      ],
    },
    weakness: 'evidence',
  },

  {
    id: 'normalcy_bias',
    name: 'Normalcy Bias',
    tier: 'basic',
    floor: 3,
    maxHP: 90,
    currentHP: 90,
    resistances: {},
    pattern: [
      {
        intent: 'defend',
        effect: { type: 'shield', value: 15 },
        description: 'Nothing\'s Wrong',
      },
      {
        intent: 'defend',
        effect: { type: 'shield', value: 10 },
        description: 'This Is Fine',
      },
      {
        intent: 'attack',
        damage: 14,
        description: 'Sudden Reality',
      },
      {
        intent: 'attack',
        damage: 18,
        effect: { type: 'vulnerable', value: 2, target: 'player' },
        description: 'Catastrophic Denial',
      },
    ],
    currentPatternIndex: 0,
    statusEffects: [],
    shield: 0,
    description: 'Heavy shields at first, then devastating attacks. Denial until crisis.',
    dialogue: {
      intro: [
        'Everything is normal.',
        'This will all blow over.',
      ],
      attack: [
        'Wait, this isn\'t supposed to happen!',
        'But things were fine!',
      ],
      hurt: [
        'This can\'t be happening...',
      ],
      lowHP: [
        'I should have prepared.',
      ],
      victory: [
        'See? Everything worked out fine.',
      ],
      defeat: [
        'Expect the unexpected.',
      ],
    },
    weakness: 'meta',
  },
]

// =============================================================================
// ELITE ENEMIES - Mini-bosses (100-130 HP)
// =============================================================================

export const ELITE_ENEMIES: Enemy[] = [
  {
    id: 'motivated_reasoning',
    name: 'Motivated Reasoning',
    tier: 'elite',
    floor: 1,
    maxHP: 100,
    currentHP: 100,
    resistances: { evidence: 5, logic: 3 },
    pattern: [
      {
        intent: 'buff',
        effect: { type: 'resistance', value: 3 },
        description: 'Emotional Investment',
      },
      {
        intent: 'attack',
        damage: 12,
        description: 'Driven Conclusion',
      },
      {
        intent: 'debuff',
        effect: { type: 'add_flaw', value: 1 },
        description: 'Plant Doubt',
      },
      {
        intent: 'attack',
        damage: 15,
        description: 'Desperate Defense',
      },
    ],
    currentPatternIndex: 0,
    statusEffects: [],
    shield: 0,
    description: 'ELITE. High resistance. Adds flaws. Wants to believe.',
    dialogue: {
      intro: [
        'I need this to be true.',
        'My identity depends on this belief.',
      ],
      attack: [
        'I\'ll find a way to make this work!',
        'The evidence must support me!',
      ],
      hurt: [
        'That\'s taken out of context!',
      ],
      lowHP: [
        'What if I\'ve been wrong this whole time?',
      ],
      victory: [
        'I was right to believe.',
      ],
      defeat: [
        'Truth doesn\'t care what I want.',
      ],
    },
    weakness: 'framework',
  },

  {
    id: 'backfire_effect',
    name: 'Backfire Effect',
    tier: 'elite',
    floor: 2,
    maxHP: 110,
    currentHP: 110,
    resistances: {},
    pattern: [
      {
        intent: 'special',
        effect: { type: 'reflect', value: 30 },
        description: 'Entrenched',
      },
      {
        intent: 'attack',
        damage: 10,
        description: 'Counterargument',
      },
      {
        intent: 'buff',
        effect: { type: 'strength', value: 2 },
        description: 'Dig Deeper',
      },
      {
        intent: 'attack',
        damage: 14,
        description: 'Rebound Force',
      },
    ],
    currentPatternIndex: 0,
    statusEffects: [],
    shield: 0,
    description: 'ELITE. Reflects portion of damage. Gets stronger when challenged.',
    dialogue: {
      intro: [
        'Correct me? I\'ll believe harder!',
        'Your facts make me MORE certain.',
      ],
      attack: [
        'Your evidence proves MY point!',
        'Attack strengthens conviction!',
      ],
      hurt: [
        'See? You\'re trying to silence me!',
      ],
      lowHP: [
        'Maybe... being wrong isn\'t an attack.',
      ],
      victory: [
        'Your attacks made me invincible.',
      ],
      defeat: [
        'Correction isn\'t persecution.',
      ],
    },
    weakness: 'meta',
  },

  {
    id: 'choice_supportive',
    name: 'Choice-Supportive Bias',
    tier: 'elite',
    floor: 3,
    maxHP: 120,
    currentHP: 120,
    resistances: { logic: 4 },
    pattern: [
      {
        intent: 'buff',
        effect: { type: 'shield', value: 12 },
        description: 'Retroactive Justification',
      },
      {
        intent: 'attack',
        damage: 11,
        effect: { type: 'lock_card', value: 1 },
        description: 'Past Commitment',
      },
      {
        intent: 'attack',
        damage: 13,
        description: 'Sunk Choice',
      },
      {
        intent: 'buff',
        effect: { type: 'strength', value: 3 },
        description: 'Doubling Down',
      },
    ],
    currentPatternIndex: 0,
    statusEffects: [],
    shield: 0,
    description: 'ELITE. Justifies past decisions. Locks your cards to your choices.',
    dialogue: {
      intro: [
        'I chose well. I must have.',
        'My decision was clearly the best.',
      ],
      attack: [
        'The path I took was right!',
        'I remember choosing wisely.',
      ],
      hurt: [
        'My choice couldn\'t have been wrong!',
      ],
      lowHP: [
        'Maybe I should have chosen differently...',
      ],
      victory: [
        'My choices led to victory.',
      ],
      defeat: [
        'Not every choice was optimal.',
      ],
    },
    weakness: 'evidence',
  },
]

// =============================================================================
// COMBINED EXPORTS
// =============================================================================

export const ALL_ENEMIES: Enemy[] = [
  ...FLOOR_1_ENEMIES,
  ...FLOOR_2_ENEMIES,
  ...FLOOR_3_ENEMIES,
  ...ELITE_ENEMIES,
]

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getEnemyById(id: string): Enemy | undefined {
  return ALL_ENEMIES.find(e => e.id === id)
}

export function getEnemiesByFloor(floor: number): Enemy[] {
  return ALL_ENEMIES.filter(e => e.floor === floor && e.tier !== 'elite')
}

export function getElitesByFloor(floor: number): Enemy[] {
  return ELITE_ENEMIES.filter(e => e.floor <= floor)
}

export function getRandomEnemy(floor: number, isElite: boolean = false): Enemy {
  const pool = isElite ? getElitesByFloor(floor) : getEnemiesByFloor(floor)
  const enemy = pool[Math.floor(Math.random() * pool.length)]
  return {
    ...enemy,
    currentHP: enemy.maxHP,
    currentPatternIndex: 0,
    statusEffects: [],
    shield: 0,
  }
}

export function getNextPattern(enemy: Enemy): AttackPattern {
  const pattern = enemy.pattern[enemy.currentPatternIndex]

  // Check for conditional patterns
  if (pattern.condition) {
    const meetsCondition = evaluatePatternCondition(enemy, pattern.condition)
    if (!meetsCondition) {
      // Skip to next pattern
      enemy.currentPatternIndex = (enemy.currentPatternIndex + 1) % enemy.pattern.length
      return getNextPattern(enemy)
    }
  }

  return pattern
}

function evaluatePatternCondition(
  enemy: Enemy,
  condition: { type: string; value: number | string }
): boolean {
  switch (condition.type) {
    case 'hp_below':
      return enemy.currentHP < (enemy.maxHP * (condition.value as number) / 100)
    case 'hp_above':
      return enemy.currentHP > (enemy.maxHP * (condition.value as number) / 100)
    default:
      return true
  }
}

export function advancePattern(enemy: Enemy): void {
  enemy.currentPatternIndex = (enemy.currentPatternIndex + 1) % enemy.pattern.length
}
