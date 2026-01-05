/**
 * Mind Architect - Card Database
 * ~80 unique cards across 5 types
 *
 * BALANCE NOTES:
 * - Evidence cards: 2-6 weight (starter: 2-3)
 * - Logic cards: 1.2-2.0 multiplier (starter: 1.2-1.5)
 * - Cost scales with power: 0-1 = weak, 2 = standard, 3 = strong
 * - Anti-meta: No single card should dominate; synergies > individual power
 */

import { Card, CardType } from '@/types/mind-architect'

// =============================================================================
// EVIDENCE CARDS - Base damage through weight
// =============================================================================

export const EVIDENCE_CARDS: Card[] = [
  // STARTER CARDS
  {
    id: 'observation',
    name: 'Observation',
    type: 'evidence',
    cost: 1,
    weight: 3,
    rarity: 'starter',
    description: 'Base evidence. Weight 3.',
    flavorText: 'The foundation of all knowledge is careful observation.',
    upgraded: false,
    upgradeEffect: { weight: 4 },
  },

  // COMMON EVIDENCE
  {
    id: 'anecdote',
    name: 'Anecdote',
    type: 'evidence',
    cost: 0,
    weight: 2,
    rarity: 'common',
    description: 'Weight 2. Low cost, low impact.',
    flavorText: 'One story is not data, but it is a beginning.',
    upgraded: false,
    upgradeEffect: { weight: 3 },
  },
  {
    id: 'statistic',
    name: 'Statistic',
    type: 'evidence',
    cost: 1,
    weight: 4,
    rarity: 'common',
    description: 'Weight 4. Solid empirical foundation.',
    flavorText: 'Numbers speak louder than anecdotes.',
    upgraded: false,
    upgradeEffect: { weight: 5 },
  },
  {
    id: 'case_study',
    name: 'Case Study',
    type: 'evidence',
    cost: 2,
    weight: 5,
    rarity: 'common',
    description: 'Weight 5. Detailed examination.',
    flavorText: 'In depth, we find truth.',
    upgraded: false,
    upgradeEffect: { weight: 6 },
  },
  {
    id: 'historical_example',
    name: 'Historical Example',
    type: 'evidence',
    cost: 1,
    weight: 3,
    rarity: 'common',
    description: 'Weight 3. Draw 1 card.',
    effect: { type: 'draw', value: 1 },
    flavorText: 'Those who forget history are doomed to repeat it.',
    upgraded: false,
    upgradeEffect: { effect: { type: 'draw', value: 2 } },
  },
  {
    id: 'scientific_study',
    name: 'Scientific Study',
    type: 'evidence',
    cost: 2,
    weight: 6,
    rarity: 'common',
    description: 'Weight 6. Peer-reviewed truth.',
    flavorText: 'Replicated results resist refutation.',
    upgraded: false,
    upgradeEffect: { weight: 8 },
  },
  {
    id: 'expert_testimony',
    name: 'Expert Testimony',
    type: 'evidence',
    cost: 1,
    weight: 4,
    rarity: 'common',
    description: 'Weight 4. +1 weight per Framework in play.',
    effect: { type: 'weight_bonus', value: 1, condition: { type: 'card_type', operator: '=', value: 'framework' } },
    flavorText: 'Credentials lend credibility.',
    upgraded: false,
    upgradeEffect: { effect: { type: 'weight_bonus', value: 2 } },
  },

  // UNCOMMON EVIDENCE
  {
    id: 'primary_source',
    name: 'Primary Source',
    type: 'evidence',
    cost: 2,
    weight: 7,
    rarity: 'uncommon',
    description: 'Weight 7. Cannot be contradicted.',
    flavorText: 'From the horse\'s mouth.',
    upgraded: false,
    upgradeEffect: { weight: 9 },
  },
  {
    id: 'meta_analysis',
    name: 'Meta-Analysis',
    type: 'evidence',
    cost: 3,
    weight: 4,
    rarity: 'uncommon',
    description: 'Weight 4. Doubles weight of other Evidence cards in play.',
    effect: { type: 'weight_bonus', value: 100 }, // Special: doubles other evidence
    flavorText: 'The synthesis of syntheses.',
    upgraded: false,
    upgradeEffect: { cost: 2 },
  },
  {
    id: 'lived_experience',
    name: 'Lived Experience',
    type: 'evidence',
    cost: 1,
    weight: 3,
    rarity: 'uncommon',
    description: 'Weight 3. +2 weight if Coherence below 50%.',
    effect: { type: 'weight_bonus', value: 2, condition: { type: 'coherence', operator: '<', value: 50 } },
    flavorText: 'Suffering teaches what books cannot.',
    upgraded: false,
    upgradeEffect: { weight: 4 },
  },
  {
    id: 'empirical_data',
    name: 'Empirical Data',
    type: 'evidence',
    cost: 2,
    weight: 5,
    rarity: 'uncommon',
    description: 'Weight 5. Gain 1 TP.',
    effect: { type: 'gain_tp', value: 1 },
    flavorText: 'Let the data speak.',
    upgraded: false,
    upgradeEffect: { weight: 6 },
    school: 'empiricist',
  },
  {
    id: 'reproducible_result',
    name: 'Reproducible Result',
    type: 'evidence',
    cost: 2,
    weight: 5,
    rarity: 'uncommon',
    description: 'Weight 5. If another Evidence was played this turn, Weight +3.',
    effect: { type: 'weight_bonus', value: 3, condition: { type: 'card_type', operator: '>=', value: 'evidence' } },
    flavorText: 'True knowledge is repeatable.',
    upgraded: false,
  },

  // RARE EVIDENCE
  {
    id: 'smoking_gun',
    name: 'Smoking Gun',
    type: 'evidence',
    cost: 3,
    weight: 10,
    rarity: 'rare',
    description: 'Weight 10. The undeniable.',
    flavorText: 'Some evidence admits no alternative explanation.',
    upgraded: false,
    upgradeEffect: { weight: 12 },
  },
  {
    id: 'consensus',
    name: 'Scientific Consensus',
    type: 'evidence',
    cost: 2,
    weight: 3,
    rarity: 'rare',
    description: 'Weight 3. Weight equals number of cards in play × 2.',
    effect: { type: 'weight_bonus', value: 2 }, // Per card
    flavorText: 'When experts agree, pay attention.',
    upgraded: false,
  },
  {
    id: 'axiom',
    name: 'Axiom',
    type: 'evidence',
    cost: 0,
    weight: 2,
    rarity: 'rare',
    description: 'Weight 2. Innate. Retain. Self-evident truth.',
    innate: true,
    retain: true,
    flavorText: 'That which needs no proof.',
    upgraded: false,
    upgradeEffect: { weight: 3 },
    school: 'rationalist',
  },
]

// =============================================================================
// LOGIC CARDS - Multipliers for damage
// =============================================================================

export const LOGIC_CARDS: Card[] = [
  // STARTER
  {
    id: 'therefore',
    name: 'Therefore',
    type: 'logic',
    cost: 1,
    multiplier: 1.3,
    rarity: 'starter',
    description: 'Multiplier ×1.3. Basic logical connector.',
    flavorText: 'The bridge between premise and conclusion.',
    upgraded: false,
    upgradeEffect: { multiplier: 1.5 },
  },

  // COMMON LOGIC
  {
    id: 'modus_ponens',
    name: 'Modus Ponens',
    type: 'logic',
    cost: 1,
    multiplier: 1.4,
    rarity: 'common',
    description: 'Multiplier ×1.4. If P then Q. P. Therefore Q.',
    flavorText: 'The most fundamental rule of inference.',
    upgraded: false,
    upgradeEffect: { multiplier: 1.6 },
    school: 'rationalist',
  },
  {
    id: 'deduction',
    name: 'Deduction',
    type: 'logic',
    cost: 1,
    multiplier: 1.3,
    rarity: 'common',
    description: 'Multiplier ×1.3. +0.1 per Logic card in play.',
    effect: { type: 'multiplier_bonus', value: 0.1 },
    flavorText: 'From the general to the particular.',
    upgraded: false,
    upgradeEffect: { effect: { type: 'multiplier_bonus', value: 0.15 } },
  },
  {
    id: 'induction',
    name: 'Induction',
    type: 'logic',
    cost: 1,
    multiplier: 1.3,
    rarity: 'common',
    description: 'Multiplier ×1.3. +0.1 per Evidence card in play.',
    effect: { type: 'multiplier_bonus', value: 0.1, condition: { type: 'card_type', operator: '=', value: 'evidence' } },
    flavorText: 'From the particular to the general.',
    upgraded: false,
    school: 'empiricist',
  },
  {
    id: 'analogy',
    name: 'Analogy',
    type: 'logic',
    cost: 1,
    multiplier: 1.2,
    rarity: 'common',
    description: 'Multiplier ×1.2. Draw 1 card.',
    effect: { type: 'draw', value: 1 },
    flavorText: 'Like unto like.',
    upgraded: false,
    upgradeEffect: { multiplier: 1.4 },
  },
  {
    id: 'syllogism',
    name: 'Syllogism',
    type: 'logic',
    cost: 2,
    multiplier: 1.5,
    rarity: 'common',
    description: 'Multiplier ×1.5. Classical reasoning.',
    flavorText: 'All men are mortal. Socrates is a man. Therefore...',
    upgraded: false,
    upgradeEffect: { multiplier: 1.7 },
  },

  // UNCOMMON LOGIC
  {
    id: 'reductio',
    name: 'Reductio ad Absurdum',
    type: 'logic',
    cost: 2,
    multiplier: 1.6,
    rarity: 'uncommon',
    description: 'Multiplier ×1.6. If enemy has Shield, ×2.0 instead.',
    flavorText: 'Prove it wrong by showing its absurd conclusion.',
    upgraded: false,
    school: 'skeptic',
  },
  {
    id: 'occams_razor',
    name: 'Occam\'s Razor',
    type: 'logic',
    cost: 1,
    multiplier: 1.4,
    rarity: 'uncommon',
    description: 'Multiplier ×1.4. +0.2 if your hand has 3 or fewer cards.',
    effect: { type: 'multiplier_bonus', value: 0.2, condition: { type: 'card_count', operator: '<=', value: 3 } },
    flavorText: 'The simplest explanation is often correct.',
    upgraded: false,
    upgradeEffect: { multiplier: 1.6 },
  },
  {
    id: 'contrapositive',
    name: 'Contrapositive',
    type: 'logic',
    cost: 1,
    multiplier: 1.5,
    rarity: 'uncommon',
    description: 'Multiplier ×1.5. If not Q, then not P.',
    flavorText: 'The logical equivalent speaks volumes.',
    upgraded: false,
    upgradeEffect: { multiplier: 1.7 },
  },
  {
    id: 'socratic_question',
    name: 'Why?',
    type: 'logic',
    cost: 0,
    multiplier: 1.2,
    rarity: 'uncommon',
    description: 'Multiplier ×1.2. If another "Why?" was played, ×1.5 instead. Stacks.',
    effect: { type: 'socratic', value: 0.3 },
    flavorText: 'The question that unravels everything.',
    upgraded: false,
    upgradeEffect: { effect: { type: 'socratic', value: 0.4 } },
    school: 'skeptic',
  },
  {
    id: 'inference',
    name: 'Inference',
    type: 'logic',
    cost: 1,
    multiplier: 1.3,
    rarity: 'uncommon',
    description: 'Multiplier ×1.3. Gain 1 TP.',
    effect: { type: 'gain_tp', value: 1 },
    flavorText: 'To draw forth what was hidden.',
    upgraded: false,
  },

  // RARE LOGIC
  {
    id: 'proof_by_contradiction',
    name: 'Proof by Contradiction',
    type: 'logic',
    cost: 2,
    multiplier: 1.8,
    rarity: 'rare',
    description: 'Multiplier ×1.8. If you have a Flaw in hand, ×2.2 instead.',
    flavorText: 'From impossibility, truth emerges.',
    upgraded: false,
    school: 'rationalist',
  },
  {
    id: 'qed',
    name: 'Q.E.D.',
    type: 'logic',
    cost: 3,
    multiplier: 2.0,
    rarity: 'rare',
    description: 'Multiplier ×2.0. Thus it is demonstrated.',
    flavorText: 'Quod erat demonstrandum.',
    upgraded: false,
    upgradeEffect: { multiplier: 2.5 },
  },
  {
    id: 'first_principles',
    name: 'First Principles',
    type: 'logic',
    cost: 2,
    multiplier: 1.5,
    rarity: 'rare',
    description: 'Multiplier ×1.5. Ignore enemy resistances this turn.',
    effect: { type: 'special' }, // Pierces resistance
    flavorText: 'Strip away assumptions. Begin from truth.',
    upgraded: false,
    school: 'rationalist',
  },
]

// =============================================================================
// FRAMEWORK CARDS - Structure and utility
// =============================================================================

export const FRAMEWORK_CARDS: Card[] = [
  // STARTER
  {
    id: 'premise',
    name: 'Premise',
    type: 'framework',
    cost: 1,
    rarity: 'starter',
    description: 'Draw 2 cards.',
    effect: { type: 'draw', value: 2 },
    flavorText: 'Every argument begins somewhere.',
    upgraded: false,
    upgradeEffect: { effect: { type: 'draw', value: 3 } },
  },

  // COMMON FRAMEWORK
  {
    id: 'structure',
    name: 'Structure',
    type: 'framework',
    cost: 1,
    rarity: 'common',
    description: 'Draw 1 card. Gain 1 TP.',
    effect: { type: 'draw', value: 1, chain: { type: 'gain_tp', value: 1 } },
    flavorText: 'A well-built argument stands firm.',
    upgraded: false,
    upgradeEffect: { effect: { type: 'draw', value: 2, chain: { type: 'gain_tp', value: 1 } } },
  },
  {
    id: 'thesis',
    name: 'Thesis',
    type: 'framework',
    cost: 1,
    rarity: 'common',
    description: '+3 Weight to all Evidence this turn.',
    effect: { type: 'weight_bonus', value: 3, target: 'all' },
    flavorText: 'The proposition to be defended.',
    upgraded: false,
    upgradeEffect: { effect: { type: 'weight_bonus', value: 4, target: 'all' } },
    contradicts: ['antithesis'],
  },
  {
    id: 'antithesis',
    name: 'Antithesis',
    type: 'framework',
    cost: 1,
    rarity: 'common',
    description: '+0.2 Multiplier to all Logic this turn.',
    effect: { type: 'multiplier_bonus', value: 0.2, target: 'all' },
    flavorText: 'The opposing proposition.',
    upgraded: false,
    upgradeEffect: { effect: { type: 'multiplier_bonus', value: 0.3, target: 'all' } },
    contradicts: ['thesis'],
  },
  {
    id: 'hypothesis',
    name: 'Hypothesis',
    type: 'framework',
    cost: 0,
    rarity: 'common',
    description: 'Draw 1 card. If it\'s Evidence, draw another.',
    effect: { type: 'draw', value: 1 }, // Conditional draw handled in engine
    flavorText: 'A tentative explanation awaiting proof.',
    upgraded: false,
    school: 'empiricist',
  },
  {
    id: 'definition',
    name: 'Definition',
    type: 'framework',
    cost: 1,
    rarity: 'common',
    description: 'Look at the top 3 cards of your deck. Put 1 in your hand.',
    effect: { type: 'special' }, // Scry effect
    flavorText: 'Clarity of terms, clarity of thought.',
    upgraded: false,
    upgradeEffect: { description: 'Look at the top 5 cards. Put 2 in your hand.' },
  },

  // UNCOMMON FRAMEWORK
  {
    id: 'synthesis',
    name: 'Synthesis',
    type: 'framework',
    cost: 2,
    rarity: 'uncommon',
    description: 'If Thesis and Antithesis are in play, gain +5 Weight AND +0.5 Multiplier.',
    effect: { type: 'synthesis' },
    flavorText: 'From opposition, unity emerges.',
    upgraded: false,
  },
  {
    id: 'dialectic',
    name: 'Dialectic',
    type: 'framework',
    cost: 1,
    rarity: 'uncommon',
    description: 'Playing contradicting cards doesn\'t break coherence this turn.',
    effect: { type: 'special' }, // Prevents contradiction penalty
    flavorText: 'The dance of opposing ideas.',
    upgraded: false,
    school: 'pragmatist',
  },
  {
    id: 'paradigm',
    name: 'Paradigm',
    type: 'framework',
    cost: 2,
    rarity: 'uncommon',
    description: 'Retain. +1 Weight and +0.1 Multiplier to all cards while in hand.',
    retain: true,
    effect: { type: 'special' }, // Passive bonus
    flavorText: 'The lens through which we see.',
    upgraded: false,
  },
  {
    id: 'methodology',
    name: 'Methodology',
    type: 'framework',
    cost: 1,
    rarity: 'uncommon',
    description: 'The next 2 cards you play cost 1 less TP.',
    effect: { type: 'reduce_cost', value: 1 },
    flavorText: 'A systematic approach yields systematic results.',
    upgraded: false,
    upgradeEffect: { description: 'The next 3 cards you play cost 1 less TP.' },
  },
  {
    id: 'scaffolding',
    name: 'Scaffolding',
    type: 'framework',
    cost: 1,
    rarity: 'uncommon',
    description: 'Draw 2 cards. Discard 1.',
    effect: { type: 'draw', value: 2, chain: { type: 'discard', value: 1 } },
    flavorText: 'Build up, then strip away.',
    upgraded: false,
    upgradeEffect: { effect: { type: 'draw', value: 3, chain: { type: 'discard', value: 1 } } },
  },

  // RARE FRAMEWORK
  {
    id: 'weltanschauung',
    name: 'Weltanschauung',
    type: 'framework',
    cost: 3,
    rarity: 'rare',
    description: 'Innate. Exhaust. Double all bonuses this turn.',
    innate: true,
    exhaust: true,
    effect: { type: 'special' }, // Doubles everything
    flavorText: 'Your entire worldview, compressed into action.',
    upgraded: false,
  },
  {
    id: 'foundationalism',
    name: 'Foundationalism',
    type: 'framework',
    cost: 2,
    rarity: 'rare',
    description: 'All starter cards in your deck gain +2 Weight permanently.',
    effect: { type: 'special' }, // Permanent upgrade
    flavorText: 'Build on bedrock, not sand.',
    upgraded: false,
    school: 'rationalist',
  },
  {
    id: 'coherentism',
    name: 'Coherentism',
    type: 'framework',
    cost: 2,
    rarity: 'rare',
    description: 'Gain +1 Weight for each unique card type in play.',
    effect: { type: 'weight_bonus', value: 1 }, // Per unique type
    flavorText: 'Truth emerges from consistency.',
    upgraded: false,
  },
]

// =============================================================================
// META CARDS - Special abilities and deck manipulation
// =============================================================================

export const META_CARDS: Card[] = [
  // COMMON META
  {
    id: 'reconsider',
    name: 'Reconsider',
    type: 'meta',
    cost: 1,
    rarity: 'common',
    description: 'Return a card from play area to your hand.',
    effect: { type: 'special' }, // Return card
    flavorText: 'Sometimes we must think again.',
    upgraded: false,
    upgradeEffect: { cost: 0 },
  },
  {
    id: 'brainstorm',
    name: 'Brainstorm',
    type: 'meta',
    cost: 1,
    rarity: 'common',
    description: 'Draw 3 cards. Discard 2.',
    effect: { type: 'draw', value: 3, chain: { type: 'discard', value: 2 } },
    flavorText: 'Quantity before quality.',
    upgraded: false,
    upgradeEffect: { effect: { type: 'draw', value: 4, chain: { type: 'discard', value: 2 } } },
  },
  {
    id: 'insight',
    name: 'Insight',
    type: 'meta',
    cost: 0,
    rarity: 'common',
    description: 'Draw 1 card. It costs 0 this turn.',
    effect: { type: 'draw', value: 1, chain: { type: 'reduce_cost', value: 99 } },
    flavorText: 'A flash of clarity.',
    upgraded: false,
    upgradeEffect: { effect: { type: 'draw', value: 2 } },
  },
  {
    id: 'revision',
    name: 'Revision',
    type: 'meta',
    cost: 1,
    rarity: 'common',
    description: 'Discard your hand. Draw that many cards +1.',
    effect: { type: 'special' }, // Full hand swap
    flavorText: 'Start fresh with new perspective.',
    upgraded: false,
  },

  // UNCOMMON META
  {
    id: 'steelman',
    name: 'Steelman',
    type: 'meta',
    cost: 2,
    rarity: 'uncommon',
    description: 'Copy the enemy\'s strongest attack as Weight. Bonus gold if you win.',
    effect: { type: 'steelman' },
    flavorText: 'Defeat the strongest version of their argument.',
    upgraded: false,
  },
  {
    id: 'devils_advocate',
    name: 'Devil\'s Advocate',
    type: 'meta',
    cost: 1,
    rarity: 'uncommon',
    description: 'Add a random Flaw to your hand. Draw 3 cards.',
    effect: { type: 'draw', value: 3, chain: { type: 'special' } }, // Adds flaw
    flavorText: 'Argue the other side to understand it.',
    upgraded: false,
  },
  {
    id: 'meditation',
    name: 'Meditation',
    type: 'meta',
    cost: 1,
    rarity: 'uncommon',
    description: 'Heal 3 Coherence. Draw 1 card.',
    effect: { type: 'heal', value: 3, chain: { type: 'draw', value: 1 } },
    flavorText: 'Still the mind to strengthen it.',
    upgraded: false,
    upgradeEffect: { effect: { type: 'heal', value: 5, chain: { type: 'draw', value: 1 } } },
  },
  {
    id: 'perspective_shift',
    name: 'Perspective Shift',
    type: 'meta',
    cost: 1,
    rarity: 'uncommon',
    description: 'Transform a card in your hand into a random card of the same rarity.',
    effect: { type: 'transform' },
    flavorText: 'See anew what you thought you knew.',
    upgraded: false,
    school: 'pragmatist',
  },
  {
    id: 'socratic_irony',
    name: 'Socratic Irony',
    type: 'meta',
    cost: 1,
    rarity: 'uncommon',
    description: 'Pretend to know nothing. Enemy\'s next attack hits themselves.',
    effect: { type: 'special' }, // Reflects next attack
    flavorText: 'I know that I know nothing.',
    upgraded: false,
    school: 'skeptic',
  },

  // RARE META
  {
    id: 'epiphany',
    name: 'Epiphany',
    type: 'meta',
    cost: 0,
    rarity: 'rare',
    description: 'Exhaust. Your cards cost 0 TP this turn.',
    exhaust: true,
    effect: { type: 'special' }, // Free cards
    flavorText: 'The moment everything clicks.',
    upgraded: false,
  },
  {
    id: 'apotheosis',
    name: 'Apotheosis',
    type: 'meta',
    cost: 2,
    rarity: 'rare',
    description: 'Exhaust. Upgrade all cards in your hand.',
    exhaust: true,
    effect: { type: 'special' }, // Mass upgrade
    flavorText: 'Transcend your limitations.',
    upgraded: false,
  },
  {
    id: 'amor_fati',
    name: 'Amor Fati',
    type: 'meta',
    cost: 2,
    rarity: 'rare',
    description: 'For each Flaw in your deck, gain +2 Weight and +0.1 Multiplier.',
    effect: { type: 'special' }, // Scales with flaws
    flavorText: 'Love your fate. Even the suffering.',
    upgraded: false,
    school: 'absurdist',
  },
  {
    id: 'memento_mori',
    name: 'Memento Mori',
    type: 'meta',
    cost: 1,
    rarity: 'rare',
    description: 'If your Coherence is below 10, triple all damage this turn.',
    effect: { type: 'special', condition: { type: 'coherence', operator: '<', value: 10 } },
    flavorText: 'Remember you will die. Let it focus you.',
    upgraded: false,
    school: 'absurdist',
  },
]

// =============================================================================
// FLAW CARDS - Negative cards that can sometimes be useful
// =============================================================================

export const FLAW_CARDS: Card[] = [
  {
    id: 'doubt',
    name: 'Doubt',
    type: 'flaw',
    cost: 0,
    rarity: 'common',
    description: 'Unplayable. Clogs your hand.',
    flavorText: 'The paralysis of uncertainty.',
    upgraded: false,
  },
  {
    id: 'bias',
    name: 'Blind Spot',
    type: 'flaw',
    cost: 1,
    rarity: 'common',
    description: 'Reduces chain bonus by 10%.',
    effect: { type: 'chain_bonus', value: -0.1 },
    flavorText: 'What you cannot see, you cannot fix.',
    upgraded: false,
  },
  {
    id: 'confusion',
    name: 'Confusion',
    type: 'flaw',
    cost: 0,
    rarity: 'common',
    description: 'Ethereal. If not played, exhausts and deals 3 Coherence damage.',
    ethereal: true,
    effect: { type: 'damage', value: 3, target: 'self' },
    flavorText: 'Thoughts that refuse to align.',
    upgraded: false,
  },
  {
    id: 'fallacy',
    name: 'Logical Fallacy',
    type: 'flaw',
    cost: 1,
    rarity: 'uncommon',
    description: '-0.3 Multiplier.',
    effect: { type: 'multiplier_bonus', value: -0.3 },
    flavorText: 'A flaw in your reasoning.',
    upgraded: false,
  },
  {
    id: 'cognitive_load',
    name: 'Cognitive Load',
    type: 'flaw',
    cost: 2,
    rarity: 'uncommon',
    description: 'Unplayable. At turn end, if in hand, lose 1 TP next turn.',
    flavorText: 'Too much to process.',
    upgraded: false,
  },
  {
    id: 'nihilism',
    name: 'Nihilism',
    type: 'flaw',
    cost: 0,
    rarity: 'rare',
    description: 'Set all damage to 0 this turn. Exhaust.',
    exhaust: true,
    effect: { type: 'special' }, // Zeroes damage
    flavorText: 'Nothing matters.',
    upgraded: false,
    // But can be useful with Amor Fati
  },
  {
    id: 'hubris',
    name: 'Hubris',
    type: 'flaw',
    cost: 0,
    rarity: 'rare',
    description: '+10 Weight. Take 8 Coherence damage.',
    weight: 10,
    effect: { type: 'damage', value: 8, target: 'self' },
    flavorText: 'Pride before the fall.',
    upgraded: false,
  },
  {
    id: 'regress',
    name: 'Infinite Regress',
    type: 'flaw',
    cost: 1,
    rarity: 'rare',
    description: 'Draw 2 cards. Add a copy of Infinite Regress to your discard pile.',
    effect: { type: 'draw', value: 2, chain: { type: 'special' } }, // Self-replicates
    flavorText: 'Why? Why that? Why THAT? And so on forever.',
    upgraded: false,
  },
]

// =============================================================================
// ALL CARDS COMBINED
// =============================================================================

export const ALL_CARDS: Card[] = [
  ...EVIDENCE_CARDS,
  ...LOGIC_CARDS,
  ...FRAMEWORK_CARDS,
  ...META_CARDS,
  ...FLAW_CARDS,
]

// =============================================================================
// STARTER DECKS BY SCHOOL
// =============================================================================

export const STARTER_DECKS: Record<string, string[]> = {
  rationalist: [
    'observation', 'observation', 'observation', 'observation',
    'therefore', 'therefore', 'therefore',
    'premise', 'premise',
    'modus_ponens', // School bonus card
  ],
  empiricist: [
    'observation', 'observation', 'observation', 'observation', 'observation',
    'therefore', 'therefore',
    'premise', 'premise',
    'empirical_data', // School bonus card
  ],
  pragmatist: [
    'observation', 'observation', 'observation', 'observation',
    'therefore', 'therefore', 'therefore',
    'premise',
    'structure',
    'dialectic', // School bonus card
  ],
  skeptic: [
    'observation', 'observation', 'observation',
    'therefore', 'therefore',
    'premise', 'premise',
    'socratic_question', 'socratic_question', // School bonus - 2x Why?
  ],
  absurdist: [
    'observation', 'observation', 'observation',
    'therefore', 'therefore',
    'premise', 'premise',
    'doubt', // Starts with a flaw
    'amor_fati', // But also the card that uses flaws
  ],
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getCardById(id: string): Card | undefined {
  return ALL_CARDS.find(card => card.id === id)
}

export function getCardsByType(type: CardType): Card[] {
  return ALL_CARDS.filter(card => card.type === type)
}

export function getCardsByRarity(rarity: Card['rarity']): Card[] {
  return ALL_CARDS.filter(card => card.rarity === rarity)
}

export function getStarterDeck(school: string): Card[] {
  const cardIds = STARTER_DECKS[school] || STARTER_DECKS.pragmatist
  return cardIds.map(id => {
    const card = getCardById(id)
    if (!card) throw new Error(`Card not found: ${id}`)
    return { ...card } // Return a copy
  })
}

export function createCardInstance(card: Card): Card {
  return { ...card, upgraded: false }
}

export function upgradeCard(card: Card): Card {
  if (card.upgraded || !card.upgradeEffect) return card
  return {
    ...card,
    ...card.upgradeEffect,
    upgraded: true,
    name: `${card.name}+`,
  }
}
