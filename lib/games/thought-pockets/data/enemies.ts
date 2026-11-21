import { EnemyDef, EnemyTier } from '@/types/thought-pockets'

export const TUTORIAL_ENEMY = 'jumping_to_conclusions'

const GAMBLE = { chance: 0.25, attack: 22 }
/** The damage answering The Meaning of Life's question adds. Flat, so a small honest answer gains as much as a huge one. */
export const MEANING_ANSWER = 10
/** What varying your Conclusion does against The Problem of Induction. */
export const INDUCTION_BONUS = 1.5

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
    id: 'sunk_cost',
    name: 'Sunk Cost Fallacy',
    tier: 'normal',
    floor: 1,
    health: 38,
    rule: 'grows',
    ruleText: 'Its attacks grow by 2 every time it acts. End it quickly.',
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
    secondRule: { rule: 'grows', ruleText: 'Each time it acts, its attacks grow by 2: it only hears what makes it surer.' },
    intro: "I've seen all this before, and I was right.",
    insight: 'We notice what agrees with us. Look for the evidence that would change your mind.',
    moves: [{ guard: 10 }, { attack: 12 }, { attack: 5, hits: 2 }],
  },
  {
    id: 'problem_of_induction',
    name: 'The Problem of Induction',
    tier: 'boss',
    floor: 1,
    health: 70,
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
    secondRule: { rule: 'motivated', ruleText: 'It also explains away anything thin: it recovers half the damage from an argument of fewer than 3 cards.' },
    intro: 'Correct me and I will only believe it harder.',
    insight: 'Pushing harder can entrench a belief. Fewer, better points often land softer and go further.',
    moves: [{ attack: 12 }, { guard: 12 }, { attack: 7, hits: 2 }],
  },
  {
    id: 'sorites',
    name: 'The Sorites Paradox',
    tier: 'boss',
    floor: 2,
    health: 80,
    rule: 'sorites',
    ruleText: 'One grain at a time: no single argument can deal more than 15 damage. Every 5 beyond that becomes 1 Unsettle instead.',
    intro: 'Take one grain from a heap. Still a heap. So when does it stop being one?',
    insight: 'Vague words still mean something. Lots of small steps can add up to a real change.',
    moves: [{ attack: 9 }, { attack: 4, hits: 3 }, { guard: 12 }, { attack: 15 }],
    phase2: {
      rule: 'none',
      ruleText: 'No longer a heap: below half Resolve the cap is gone, and it attacks in many small grains.',
      shift: 'Somewhere along the way it stopped being a heap. No cap now, but it comes at you grain by grain.',
      moves: [{ attack: 2, hits: 4 }, { guard: 10 }, { attack: 2, hits: 5 }],
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
    ruleText: 'Change is hard: its Guard never wears off. Break through it or Pierce it.',
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
    ruleText: 'It explains away anything thin: it recovers half the damage from an argument of fewer than 3 cards.',
    secondRule: { rule: 'status_quo', ruleText: 'And it will not budge: its Guard never wears off. Break through it or Pierce it.' },
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
]

const ENEMY_INDEX = new Map(ENEMIES.map((enemy) => [enemy.id, enemy]))

export function getEnemyDef(enemyId: string): EnemyDef {
  const enemy = ENEMY_INDEX.get(enemyId)
  if (!enemy) throw new Error(`Unknown enemy: ${enemyId}`)
  return enemy
}

export function enemiesFor(floor: number, tier: EnemyTier): EnemyDef[] {
  return ENEMIES.filter(
    (enemy) => enemy.floor === floor && enemy.tier === tier && enemy.id !== TUTORIAL_ENEMY,
  )
}
