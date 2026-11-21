import { EnemyDef, EnemyTier } from '@/types/thought-pockets'
import { RIGOR } from './pace'

export const TUTORIAL_ENEMY = 'jumping_to_conclusions'
/** The fights a walk can open with. The first walk always opens with the teaching one; after that the seed draws one. */
export const OPENERS = [TUTORIAL_ENEMY, 'rumination', 'catastrophizing'] as const

const GAMBLE = { chance: 0.25, attack: 22 }
/** The damage answering The Meaning of Life's question adds. Flat, so a small honest answer gains as much as a huge one. */
export const MEANING_ANSWER = 10
/** What varying your Conclusion does against The Problem of Induction. */
export const INDUCTION_BONUS = 1.5
export const SORITES_CAP = 20
/**
 * Damage a rule stops (Sorites' cap, a problem's stop lines) shakes it: every `rate` of it banks 1 Shaken,
 * at most `max` in one round (the rest is lost), and the moment the problem changes it all takes its toll at once (half of it
 * staying as Unsettle), so a huge argument pays off without skipping the problem's second half.
 */
export const OVERFLOW = { rate: 2, max: 5 } as const
export const OVERFLOW_TEXT = `Anything past it shakes it: 1 Shaken for every ${OVERFLOW.rate} (at most ${OVERFLOW.max} a round). When it changes, all its Shaken takes that much Resolve at once, and half of it stays as Unsettle for the next turn.`
/** No single round takes a philosophical problem past the next of these shares of its Resolve, so even a huge deck needs three rounds. Half is where it changes. */
export const STOP_LINES = [0.75, 0.5] as const
export const PROBLEM_LINES = 'A philosophical problem gives ground slowly: no single round takes it past three quarters of its Resolve, or past half, where it changes.'
export const PROBLEM_RULE = `${PROBLEM_LINES} ${OVERFLOW_TEXT}`
export const STATUS_QUO_MAX_GUARD = 12
/** Below this, an argument does not move Zeno's Arrow. Gentle pace lets smaller arguments through. */
export const ARROW_MIN = { gentle: 8, rigorous: 12 } as const
/** Guard Buridan's Ass gains for each card you leave in your hand. */
export const BURIDAN_GUARD = 2
/** Once it has chosen, how much stronger each of its hits is for each card you leave in your hand. */
export const BURIDAN_CHARGE = 1
export const SUNK_COST_GROWTH = 2
/** Confirmation Bias only grows by its second rule, on the higher Rigorous levels, where a smaller step is enough. */
export const CONFIRMATION_GROWTH = 1
/** Arguments with fewer cards than this are explained away by Motivated Reasoning; the Backfire Effect's milder second rule only waves off a single card. */
export const MOTIVATED_CARDS = 3
export const DISMISS_CARDS = 2
/** How much Unsettle Rumination adds to itself at the start of each of your turns. */
export const RUMINATION_STEP = 1
/** Catastrophizing starts with its attacks this much stronger, and eases by `ease` after each round you lose nothing to it. */
export const CATASTROPHE = { start: 3, ease: 1 } as const
/** Each argument Zeno's Arrow stops brings its tiring this many turns sooner. */
export const ARROW_TIRES = 2
/** In Rigorous, where most arguments cannot move Zeno's Arrow, it starts to tire from this turn instead of the usual one. */
export const ARROW_RIGOROUS_TIRING = 10
/**
 * Problems from later floors that can also end a Short walk, at a first-floor strength:
 * their Resolve, and what is added to their attacks (before the Short walk's own bonus).
 */
export const SHORT_WALK_GUESTS: Record<string, { health: number; attack: number }> = {
  buridans_ass: { health: 64, attack: 0 },
  newcomb: { health: 70, attack: -2 },
}

function arrowRule(min: number, tiresFrom?: number): string {
  const tiring = tiresFrom ? `It tires from turn ${tiresFrom}, and each argument it stops brings that ${ARROW_TIRES} turns sooner.` : `Each argument it stops brings its tiring ${ARROW_TIRES} turns sooner.`
  return `Motionless at every instant: an argument that would deal less than ${min} damage deals none. Unsettle still works. ${tiring}`
}

function percentMore(factor: number): string {
  return `+${Math.round((factor - 1) * 100)}%`
}

export const ENEMIES: EnemyDef[] = [
  {
    id: 'jumping_to_conclusions',
    name: 'Jumping to Conclusions',
    tier: 'normal',
    floor: 1,
    health: 26,
    rule: 'none',
    ruleText: 'No tricks. It just says the first thing that comes to mind.',
    intro: 'Obviously. Next question.',
    insight: 'A quick answer feels like knowledge. Slowing down is how you check.',
    moves: [{ attack: 6 }, { guard: 4 }, { attack: 8 }],
  },
  {
    id: 'rumination',
    name: 'Rumination',
    tier: 'normal',
    floor: 1,
    health: 28,
    rule: 'ruminates',
    ruleText: `It goes over the same thought again and again: at the start of each of your turns it Unsettles itself ${RUMINATION_STEP} more, and its Unsettle never halves.`,
    intro: 'But what if I go over it just one more time?',
    insight: 'Going over a worry again does not solve it; it only wears you out. Let it wear itself out instead.',
    moves: [{ attack: 4 }, { attack: 3, hits: 2 }, { guard: 4 }],
  },
  {
    id: 'catastrophizing',
    name: 'Catastrophizing',
    tier: 'normal',
    floor: 1,
    health: 26,
    rule: 'catastrophe',
    ruleText: `It imagines the worst: its attacks start ${CATASTROPHE.start} stronger, and after each round you lose no Resolve to it, they ease by ${CATASTROPHE.ease}, down to normal.`,
    intro: 'This is going to be a disaster. I can feel it.',
    insight: 'The worst case is rarely the likely one. Each time it does not happen, the fear loosens a little.',
    moves: [{ attack: 3 }, { guard: 4 }, { attack: 5 }],
  },
  {
    id: 'sunk_cost',
    name: 'Sunk Cost Fallacy',
    tier: 'normal',
    floor: 1,
    health: 38,
    rule: 'grows',
    growth: SUNK_COST_GROWTH,
    ruleText: `Its attacks grow by ${SUNK_COST_GROWTH} every time it acts. End it quickly.`,
    intro: "You've come this far. Why stop now?",
    insight: 'What you have already spent is gone either way. Decide by what lies ahead.',
    moves: [{ attack: 4 }, { guard: 5 }, { attack: 7 }],
  },
  {
    id: 'dunning_kruger',
    name: 'Dunning-Kruger Effect',
    tier: 'normal',
    floor: 1,
    health: 40,
    rule: 'overconfident',
    ruleText: 'Overconfident: its attacks deal +4 while it is above half Resolve.',
    intro: "I've basically mastered this.",
    insight: 'The less we know, the surer we feel. Confidence that drops as you learn is a good sign.',
    moves: [{ attack: 5 }, { guard: 6 }, { attack: 8 }],
  },
  {
    id: 'confirmation_bias',
    name: 'Confirmation Bias',
    tier: 'elite',
    floor: 1,
    health: 56,
    rule: 'confirmation',
    ruleText: 'Evidence it has already seen in an earlier turn gives only half Weight.',
    growth: CONFIRMATION_GROWTH,
    secondRule: { rule: 'grows', ruleText: `Each time it acts, its attacks grow by ${CONFIRMATION_GROWTH}: it only hears what makes it surer.` },
    intro: "I've seen all this before, and I was right.",
    insight: 'We notice what agrees with us. Look for the evidence that would change your mind.',
    moves: [{ guard: 10 }, { attack: 12 }, { attack: 5, hits: 2 }],
  },
  {
    id: 'problem_of_induction',
    name: 'The Problem of Induction',
    tier: 'boss',
    floor: 1,
    health: 74,
    rule: 'induction',
    ruleText: `The future need not resemble the past: an argument whose Conclusion is a different type from last turn’s deals ${percentMore(INDUCTION_BONUS)}.`,
    intro: 'The sun rose yesterday. Why are you so sure it will rise tomorrow?',
    insight: 'No number of past cases proves the next one. We act on patterns anyway, and stay ready to be surprised.',
    moves: [{ attack: 8 }, { guard: 10 }, { attack: 13 }, { attack: 4, hits: 2 }],
    phase2: {
      rule: 'induction',
      ruleText: `The pattern does not hold: below half Resolve it starts a new sequence of actions. Varying your Conclusion still deals ${percentMore(INDUCTION_BONUS)}.`,
      shift: 'The pattern broke. What it did before tells you nothing now: read its next action.',
      moves: [{ attack: 5, hits: 2 }, { attack: 14 }, { guard: 8 }],
    },
  },

  {
    id: 'zenos_arrow',
    name: "Zeno's Arrow",
    tier: 'boss',
    floor: 1,
    health: 64,
    rule: 'arrow',
    ruleText: arrowRule(ARROW_MIN.rigorous, ARROW_RIGOROUS_TIRING),
    gentleRuleText: arrowRule(ARROW_MIN.gentle),
    intro: 'At every instant the arrow is exactly where it is. So when does it ever move?',
    insight: 'Moment by moment, nothing seems to change. Gather yourself for one real step, and you find you were moving all along.',
    moves: [{ attack: 7 }, { guard: 8 }, { attack: 11 }, { attack: 3, hits: 3 }],
    phase2: {
      rule: 'none',
      ruleText: 'In flight at last: below half Resolve every argument lands, however small, but it looses its arrows in volleys.',
      shift: 'The arrow was moving all along. Every argument lands now, and so do its volleys.',
      moves: [{ attack: 3, hits: 3 }, { guard: 8 }, { attack: 4, hits: 3 }],
    },
  },

  {
    id: 'anchoring',
    name: 'Anchoring Bias',
    tier: 'normal',
    floor: 2,
    health: 54,
    rule: 'anchoring',
    ruleText: 'It fixates on first impressions: your FIRST card is the Conclusion, not your last.',
    intro: 'The first number I heard is the right one.',
    insight: 'The first number you hear drags every estimate toward it. Notice the anchor before you adjust.',
    moves: [{ attack: 10 }, { guard: 8 }, { attack: 13 }],
  },
  {
    id: 'bandwagon',
    name: 'Bandwagon Effect',
    tier: 'normal',
    floor: 2,
    health: 50,
    rule: 'bandwagon',
    ruleText: 'It feeds on repetition: each card you play with the same name as one already in your argument makes its attacks +1 for the rest of the fight.',
    intro: 'Everyone is saying it, so it must be true.',
    insight: 'Popularity is not evidence. Repeating a claim makes it familiar, not true.',
    moves: [{ attack: 4, hits: 2 }, { guard: 8 }, { attack: 11 }],
  },
  {
    id: 'availability',
    name: 'Availability Heuristic',
    tier: 'normal',
    floor: 2,
    health: 52,
    rule: 'none',
    ruleText: 'Vivid images stick: some of its actions add a Doubt to your draw pile for this fight.',
    intro: 'Remember that one time? That is how it always goes.',
    insight: 'What comes to mind easily feels common. Vivid is not the same as likely.',
    moves: [{ attack: 8, addDoubt: 1 }, { guard: 8, addDoubt: 1 }, { attack: 12 }],
  },
  {
    id: 'backfire',
    name: 'Backfire Effect',
    tier: 'elite',
    floor: 2,
    health: 68,
    rule: 'backfire',
    ruleText: 'Correcting it stings: when your argument hurts it, you lose 1 Resolve for each card in that argument.',
    secondRule: { rule: 'dismisses', ruleText: 'It also waves off a lone point: it recovers half the damage from a one-card argument.' },
    intro: 'Correct me and I will only believe it harder.',
    insight: 'Pushing harder can entrench a belief. Fewer, better points often land softer and go further.',
    moves: [{ attack: 12 }, { guard: 12 }, { attack: 7, hits: 2 }],
  },
  {
    id: 'sorites',
    name: 'The Sorites Paradox',
    tier: 'boss',
    floor: 2,
    health: 76,
    rule: 'sorites',
    ruleText: `One grain at a time: no single argument can deal more than ${SORITES_CAP} damage. ${OVERFLOW_TEXT}`,
    intro: 'Take one grain from a heap. Still a heap. So when does it stop being one?',
    insight: 'Vague words still mean something. Lots of small steps can add up to a real change.',
    moves: [{ attack: 9 }, { attack: 4, hits: 3 }, { guard: 12 }, { attack: 15 }],
    phase2: {
      rule: 'none',
      ruleText: 'No longer a heap: below half Resolve the cap is gone, and it attacks in many small grains.',
      shift: 'Somewhere along the way it stopped being a heap. No cap now, but it comes at you grain by grain.',
      moves: [{ attack: 2, hits: 3 }, { guard: 10 }, { attack: 3, hits: 3 }],
    },
  },

  {
    id: 'buridans_ass',
    name: "Buridan's Ass",
    tier: 'boss',
    floor: 2,
    health: 72,
    rule: 'buridan',
    ruleText: `Stuck between two haystacks: when it acts, it gains ${BURIDAN_GUARD} Guard for each card still in your hand (Doubts aside).`,
    intro: 'Two haystacks, exactly as good as each other. Which one, which one, which one?',
    insight: 'Waiting for the perfect choice is a choice too. Between two good options, picking one is better than starving.',
    moves: [{ attack: 8 }, { attack: 4, hits: 2 }, { guard: 6 }, { attack: 12 }],
    phase2: {
      rule: 'buridan_charge',
      ruleText: `It chose at last, and charges: below half Resolve every hit it makes is ${BURIDAN_CHARGE} stronger for each card still in your hand (Doubts aside).`,
      shift: 'It finally picked a haystack. Now every card you hold back spurs it on.',
      moves: [{ attack: 9 }, { attack: 5, hits: 2 }, { guard: 6 }, { attack: 12 }],
    },
  },

  {
    id: 'gamblers_fallacy',
    name: "Gambler's Fallacy",
    tier: 'normal',
    floor: 3,
    health: 68,
    rule: 'gambler',
    ruleText: `It insists it is due a big win. Every round, however long since the last one, there is a 1 in ${Math.round(1 / GAMBLE.chance)} chance its action becomes Attack ${GAMBLE.attack}.`,
    intro: "I've lost three times. I'm due a win.",
    insight: 'Coins have no memory. Past results do not make the next one more likely.',
    moves: [{ attack: 5 }, { guard: 8 }, { attack: 7 }],
    gamble: GAMBLE,
  },
  {
    id: 'status_quo',
    name: 'Status Quo Bias',
    tier: 'normal',
    floor: 3,
    health: 66,
    rule: 'status_quo',
    ruleText: `Change is hard: its Guard never wears off, though it holds no more than ${STATUS_QUO_MAX_GUARD}. Break through it or Pierce it.`,
    intro: "It's always been this way. Why change?",
    insight: 'Keeping things as they are is also a choice, and it deserves the same scrutiny as change.',
    moves: [{ guard: 8, attack: 6 }, { guard: 8 }, { attack: 14 }],
  },
  {
    id: 'halo_effect',
    name: 'Halo Effect',
    tier: 'normal',
    floor: 3,
    health: 72,
    rule: 'halo',
    ruleText: 'One shining trait: only your strongest Evidence counts in full; other Evidence gives half Weight.',
    intro: 'Such a good speaker, so they must be right.',
    insight: 'One good quality colours everything else. Judge each claim on its own.',
    moves: [{ attack: 12 }, { guard: 10 }, { attack: 15 }],
  },
  {
    id: 'motivated_reasoning',
    name: 'Motivated Reasoning',
    tier: 'elite',
    floor: 3,
    health: 80,
    rule: 'motivated',
    ruleText: `It explains away anything thin: it recovers half the damage from an argument of fewer than ${MOTIVATED_CARDS} cards.`,
    secondRule: { rule: 'status_quo', ruleText: `And it will not budge: its Guard never wears off, though it holds no more than ${STATUS_QUO_MAX_GUARD}. Break through it or Pierce it.` },
    intro: 'I need this to be true, so it is.',
    insight: 'When we want a conclusion, we argue toward it. Ask what you would think if you wanted the opposite.',
    moves: [{ attack: 12 }, { guard: 10 }, { attack: 7, hits: 2 }],
  },
  {
    id: 'meaning_of_life',
    name: 'The Meaning of Life',
    tier: 'boss',
    floor: 3,
    health: 130,
    rule: 'meaning',
    ruleText: `It asks a question every round: answer it with a card of the named type and your argument deals ${MEANING_ANSWER} more damage.`,
    intro: 'Why does any of it matter?',
    insight: 'Meaning is not found lying around. It is made, one answer at a time.',
    moves: [
      { attack: 10, asks: ['evidence'] },
      { attack: 14, asks: ['logic'] },
      { guard: 14, asks: ['guard'] },
      { attack: 18, asks: ['evidence'] },
    ],
    phase2: {
      rule: 'meaning',
      ruleText: `Below half Resolve it asks two things at once: include both named types and your argument deals ${MEANING_ANSWER} more damage.`,
      shift: 'One answer is not enough any more. It wants two at once.',
      moves: [
        { attack: 12, asks: ['evidence', 'logic'] },
        { guard: 12, attack: 5, asks: ['guard', 'evidence'] },
        { attack: 18, asks: ['logic', 'guard'] },
      ],
    },
  },
  {
    id: 'newcomb',
    name: "Newcomb's Problem",
    tier: 'boss',
    floor: 3,
    health: 84,
    rule: 'newcomb',
    ruleText: 'It predicted you: when it acts, it gains Guard equal to half the damage your argument dealt this round.',
    intro: 'I already know what you will choose. Go on, surprise me.',
    insight: 'Being predictable is not the same as being unfree. Knowing your habits is how you get to choose them.',
    moves: [{ attack: 10 }, { attack: 5, hits: 2 }, { guard: 8 }, { attack: 14 }],
    phase2: {
      rule: 'newcomb_caution',
      ruleText: 'Below half Resolve it predicts your caution instead: when it acts, it gains Guard equal to half your Guard.',
      shift: 'It has read you again. Now it is your caution it sees coming.',
      moves: [{ attack: 12 }, { attack: 7, hits: 2 }, { guard: 6 }, { attack: 16 }],
    },
  },
]

const ENEMY_INDEX = new Map(ENEMIES.map((enemy) => [enemy.id, enemy]))

export function getEnemyDef(enemyId: string): EnemyDef {
  const enemy = ENEMY_INDEX.get(enemyId)
  if (!enemy) throw new Error(`Unknown enemy: ${enemyId}`)
  return enemy
}

/** The rule as it plays at this pace: some problems are milder in Gentle. */
export function ruleTextAt(def: EnemyDef, rigor: number): string {
  return rigor === 0 && def.gentleRuleText ? def.gentleRuleText : def.ruleText
}

/** Every rule a bias plays by at this pace, its second rule included from the Rigorous level that adds it. */
export function fullRuleText(def: EnemyDef, rigor: number): string {
  const main = ruleTextAt(def, rigor)
  const rules = rigor >= RIGOR.secondRule && def.secondRule ? `${main} ${def.secondRule.ruleText}` : main
  return givesGroundSlowly(def, rigor) ? `${rules} ${SLOW_GROUND_TEXT}` : rules
}

/** How much Shaken the damage a rule stopped banks, when `already` has been banked this round. */
export function overflowUnsettle(stopped: number, already = 0): number {
  return Math.max(0, Math.min(OVERFLOW.max - already, Math.floor(stopped / OVERFLOW.rate)))
}

const OPENING: readonly string[] = OPENERS

/** The biases and problems a floor draws from; the opening fights are drawn separately. */
export function enemiesFor(floor: number, tier: EnemyTier): EnemyDef[] {
  return ENEMIES.filter((enemy) => enemy.floor === floor && enemy.tier === tier && !OPENING.includes(enemy.id))
}

/**
 * At Gentle pace a bias gives ground slowly: no round takes it past half its Resolve, so a strong deck still
 * needs two rounds. A newcomer's arguments rarely reach that far in one round, and the teaching fight is exempt.
 */
export function givesGroundSlowly(def: EnemyDef, rigor: number): boolean {
  return rigor === 0 && def.tier !== 'boss' && def.id !== TUTORIAL_ENEMY
}

export const SLOW_GROUND_TEXT = 'It gives ground slowly: no single round takes it past half its Resolve.'

/** The problems that can end a Short walk: the first floor's own, and the guests. */
export const SHORT_WALK_PROBLEMS = [...enemiesFor(1, 'boss').map((e) => e.id), ...Object.keys(SHORT_WALK_GUESTS)]

/** What is left of the damage a rule stopped: "shakes it: Shaken +3", or why it is lost. */
export function overflowWords(extra: number, banked: number): string {
  if (banked > 0) return `shakes it: Shaken +${banked}`
  return extra < OVERFLOW.rate ? `is lost (1 Shaken for every ${OVERFLOW.rate})` : `is lost (at most ${OVERFLOW.max} Shaken a round)`
}

/** When a problem changes, its Shaken takes that much Resolve at once and adds half as much Unsettle for the turns after. */
export function releaseLeftover(shaken: number): number {
  return Math.floor(shaken / 2)
}
