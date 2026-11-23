import type { Concept } from './concepts'

export interface GoldenIdea {
  name: string
  /** The two ideas that make it, in the curated table. */
  ingredients: readonly [string, string]
  /** A riddle, a plainer clue, then the ingredients themselves. */
  riddles: readonly [string, string, string]
  /** Finishes the sentence "…you found <name>" in the closing letter. */
  letter: string
}

/**
 * Each Work is seven golds. The first riddle points at the emoji or the feeling of the
 * ingredients, never their names, so solving it is a small act of translation.
 */
export const WORKS: readonly (readonly GoldenIdea[])[] = [
  [
    {
      name: 'Healing',
      ingredients: ['Grief', 'Hope'],
      riddles: [
        'What a broken heart grows when it keeps a window facing the sunrise.',
        'Let love meet its ending, then let the dawn sit beside it.',
        'Grief (Love and Death) with Hope.',
      ],
      letter: 'and learned that grief is love that still has somewhere to grow.',
    },
    {
      name: 'Acceptance',
      ingredients: ['Anxiety', 'Patience'],
      riddles: [
        'Tomorrow’s worry, taught to wait like a seed.',
        'Stretch a fear across the hours, teach the hours to hope, then join the two.',
        'Anxiety (Fear and Time) with Patience (Time and Hope).',
      ],
      letter: 'and set tomorrow’s worry down for a while.',
    },
    {
      name: 'Courage',
      ingredients: ['Fear', 'Hope'],
      riddles: [
        'A trembling that keeps walking toward the morning.',
        'Let what scares you hold hands with what you wish for.',
        'Fear with Hope.',
      ],
      letter: 'which was only ever fear with somewhere to go.',
    },
    {
      name: 'Compassion',
      ingredients: ['Empathy', 'Understanding'],
      riddles: [
        'The stranger appears twice: once to be felt, once to be known.',
        'Bring love to another, bring knowledge to another, then join what you made.',
        'Empathy (Love and Other) with Understanding (Knowledge and Other).',
      ],
      letter: 'which is feeling with someone and then doing something kind about it.',
    },
    {
      name: 'Meaning',
      ingredients: ['Mortality', 'Legacy'],
      riddles: [
        'The candle is lit twice: once by a shiver, once by the long years.',
        'Knowing you will end, and what you will leave behind, held together.',
        'Mortality (Fear and Death) with Legacy (Time and Death).',
      ],
      letter: 'the thing a short life makes precisely because it is short.',
    },
    {
      name: 'Intimacy',
      ingredients: ['Vulnerability', 'Trust'],
      riddles: [
        'Spend your heart twice: once on saying what is real, once on opening your hands.',
        'Love that is honest about itself, and love that holds loosely, brought close.',
        'Vulnerability (Love and Truth) with Trust (Love and Freedom).',
      ],
      letter: 'two people meeting without armour.',
    },
    {
      name: 'Virtue',
      ingredients: ['Wisdom', 'Courage'],
      riddles: [
        'The owl and the lion, finally agreeing.',
        'What the years teach the mind, joined with what walks on through fear.',
        'Wisdom (Time and Knowledge) with Courage (Fear and Hope).',
      ],
      letter: 'which is wisdom brave enough to act.',
    },
  ],
  [
    {
      name: 'Gratitude',
      ingredients: ['Impermanence', 'Love'],
      riddles: [
        'The blossom held more tenderly because it is already falling.',
        'Find what is lovely because it ends, then give it your heart.',
        'Impermanence (Death and Beauty) with Love.',
      ],
      letter: 'which is loving what you have while you still have it.',
    },
    {
      name: 'Resilience',
      ingredients: ['Courage', 'Time'],
      riddles: [
        'The lion, asked to come back tomorrow, and the day after.',
        'Bravery that keeps showing up as the hours pass.',
        'Courage (Fear and Hope) with Time.',
      ],
      letter: 'courage that keeps coming back, one ordinary day at a time.',
    },
    {
      name: 'Forgiveness',
      ingredients: ['Empathy', 'Justice'],
      riddles: [
        'The scales, set down by someone who has felt the far side.',
        'Feel what another feels, then bring it to what is fair.',
        'Empathy (Love and Other) with Justice.',
      ],
      letter: 'the moment fairness remembers that the other person is human too.',
    },
    {
      name: 'Serenity',
      ingredients: ['Balance', 'Patience'],
      riddles: [
        'A seed on a tightrope, in no hurry at all.',
        'Steady between the wild and the tidy, and willing to wait.',
        'Balance (Chaos and Order) with Patience (Time and Hope).',
      ],
      letter: 'steady between the wild and the tidy, and in no hurry.',
    },
    {
      name: 'Belonging',
      ingredients: ['Relationship', 'Trust'],
      riddles: [
        'A chain whose links have stopped testing one another.',
        'Where you end and others begin, held loosely and without fear.',
        'Relationship (Self and Other) with Trust (Love and Freedom).',
      ],
      letter: 'the place where you stop checking whether you are welcome.',
    },
    {
      name: 'Humility',
      ingredients: ['Wisdom', 'Self'],
      riddles: [
        'The owl, looking in a mirror.',
        'Turn what the years have taught you back on yourself.',
        'Wisdom (Time and Knowledge) with Self.',
      ],
      letter: 'which is knowing enough to know how much you do not.',
    },
    {
      name: 'Joy',
      ingredients: ['Wonder', 'Freedom'],
      riddles: [
        'The flower that opened your eyes, given wings.',
        'Amazement at the world, with nowhere else it has to be.',
        'Wonder (Nature and Beauty) with Freedom.',
      ],
      letter: 'wonder with nowhere else it has to be.',
    },
  ],
]

export const WORK_TITLES = ['The Great Work', 'The Second Work'] as const

const ORDINALS = ['First', 'Then', 'After that', 'Next', 'Later', 'Then', 'And last']

const OPENINGS = [
  'You came in with sixteen plain ideas, and some of them were heavy: fear, death, the passing of time. Here is what you made of them.',
  'You came back to the lab and went further, using what you already knew. Here is what the second Work became.',
]

const FAREWELLS = [
  'Nothing you carried in was wasted. The heavy things were always part of the gold.',
  'The lab stays open. Come and wander whenever you like.',
]

export function goldsFor(work: number): readonly GoldenIdea[] {
  return WORKS[work] ?? WORKS[0]
}

export function isGolden(name: string, work: number): boolean {
  const wanted = name.trim().toLowerCase()
  return goldsFor(work).some(gold => gold.name.toLowerCase() === wanted)
}

export interface Letter {
  title: string
  opening: string
  lines: { gold: string; text: string; /** What the gold is, as the letter puts it: "which is wisdom brave enough to act." */ meaning: string }[]
  closing: string[]
}

/** The closing scene: the seven golds told back in the order the player found them. */
export function composeLetter(work: number, discoveries: Concept[]): Letter {
  const indexOf = (name: string) => discoveries.findIndex(c => c.name.toLowerCase() === name.toLowerCase())
  const ordered = goldsFor(work)
    .filter(gold => indexOf(gold.name) >= 0)
    .sort((a, b) => indexOf(a.name) - indexOf(b.name))

  const lines = ordered.map((gold, i) => {
    const ordinal = i === ordered.length - 1 ? ORDINALS[ORDINALS.length - 1] : ORDINALS[i]
    const joiner = gold.letter.startsWith('and ') ? ' ' : ', '
    return { gold: gold.name, text: `${ordinal}, you found ${gold.name}${joiner}${gold.letter}`, meaning: gold.letter }
  })

  // True of every path through the lab, and never a count of how many tries it took
  const first = discoveries[0]
  const closing = [
    `Each of these you made yourself, by bringing two ideas together.${first ? ` The very first thing you made here was ${first.name}.` : ''}`,
    FAREWELLS[work] ?? FAREWELLS[0],
  ]

  return { title: WORK_TITLES[work] ?? WORK_TITLES[0], opening: OPENINGS[work] ?? OPENINGS[0], lines, closing }
}
