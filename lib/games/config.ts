/**
 * Central configuration for all games on VeryGoodMelon.Fun
 *
 * This is the single source of truth for game metadata.
 * When adding a new game, add it here and it will automatically
 * appear on the homepage (if isShowcase: true).
 */

export interface GameConfig {
  id: string
  slug: string
  title: string
  description: string
  /** Short action-oriented line: what the player actually does */
  hook: string
  cardImage: string
  category: 'Calm' | 'Reflect' | 'Play'
  accentColor: 'accent' | 'success' | 'warning' | 'purple'
  isShowcase: boolean
  tags: string[]
  order: number
}

export const ALL_GAMES: readonly GameConfig[] = [
  {
    id: 'hope-daily',
    slug: 'the-silver-lining', // Enigmatic: hints at finding the positive
    title: 'The Optimist',
    description: 'A true piece of good news each day, with one word missing',
    hook: "Read today's good news as it unfolds and find its missing word",
    cardImage: '/games/hope-daily/card.svg',
    category: 'Play',
    accentColor: 'success',
    isShowcase: true,
    tags: ['daily', 'word-game', 'uplifting'],
    order: 1,
  },
  {
    id: 'timeless-minds',
    slug: 'ancient-voices', // Enigmatic: wisdom from the past
    title: 'The Sage',
    description: 'Talk with 39 great minds from history',
    hook: 'Ask life questions to history\'s greatest thinkers',
    cardImage: '/games/timeless-minds/card.svg',
    category: 'Reflect',
    accentColor: 'accent',
    isShowcase: true,
    tags: ['ai', 'therapeutic', 'conversation'],
    order: 2,
  },
  {
    id: 'hard-choices',
    slug: 'the-crossroads', // Enigmatic: pivotal decisions
    title: 'The Dilemma',
    description: 'Everyday questions with no right answer',
    hook: 'Twelve everyday choices, and a gentle reading of what they protect',
    cardImage: '/games/hard-choices/card.svg',
    category: 'Reflect',
    accentColor: 'purple',
    isShowcase: true,
    tags: ['reflection', 'values', 'philosophical'],
    order: 3,
  },
  {
    id: 'last-words',
    slug: 'final-breath', // Enigmatic: end of life reflection
    title: 'The Final Word',
    description: 'One last thing to say. Why wait?',
    hook: "Write what you'd say at the very end, by candlelight, then see why it doesn't have to wait",
    cardImage: '/games/last-words/card.svg',
    category: 'Reflect',
    accentColor: 'accent',
    isShowcase: true,
    tags: ['reflection', 'community', 'philosophical'],
    order: 4,
  },
  {
    id: 'the-unrusher',
    slug: 'the-long-breath', // Enigmatic: patience and slowness
    title: 'The Patient One',
    description: "Notice what you'd usually rush past",
    hook: 'Seeds that settle only while you stay still, and a minute for one small thing',
    cardImage: '/games/the-unrusher/card.svg',
    category: 'Calm',
    accentColor: 'success',
    isShowcase: true,
    tags: ['meditation', 'calm', 'mindfulness'],
    order: 5,
  },
  {
    id: 'first-words',
    slug: 'first-breath', // Enigmatic: beginning after the end
    title: 'The Awakening',
    description: 'Imagine the other side, then come back with something',
    hook: 'Imagine the moment after, say your first words, and wake at dawn with one small thing for tomorrow',
    cardImage: '/games/first-words/card.svg',
    category: 'Reflect',
    accentColor: 'purple',
    isShowcase: true,
    tags: ['reflection', 'community', 'philosophical', 'afterlife'],
    order: 10,
  },
  {
    id: 'idea-lab',
    slug: 'idea-lab', // Direct: the name evokes the experience
    title: 'The Alchemist',
    description: 'Turn heavy feelings into gold, one riddle at a time',
    hook: 'Solve seven riddles by mixing ideas, and get a letter at the end',
    cardImage: '/games/idea-lab/card.svg',
    category: 'Play',
    accentColor: 'warning',
    isShowcase: true,
    tags: ['ai', 'creative', 'philosophical', 'exploration'],
    order: 6,
  },
  {
    id: 'thought-pockets',
    slug: 'thought-pockets', // Direct: evokes the deckbuilder mechanic
    title: 'The Philosopher',
    description: 'Build arguments, defeat cognitive biases',
    hook: 'Out-think cognitive biases, one argument at a time',
    cardImage: '/games/thought-pockets/card.svg',
    category: 'Play',
    accentColor: 'purple',
    isShowcase: true,
    tags: ['deckbuilder', 'roguelike', 'philosophy', 'strategy'],
    order: 7,
  },
  {
    id: 'breathing-patterns',
    slug: 'the-still-point', // Enigmatic: T.S. Eliot - "at the still point of the turning world"
    title: 'The Harmonist',
    description: 'Every breath you finish becomes a seed',
    hook: 'Follow a shape, sound a chord, and leave with the pattern your breaths made',
    cardImage: '/games/breathing-patterns/card.svg',
    category: 'Calm',
    accentColor: 'success',
    isShowcase: true,
    tags: ['meditation', 'breathing', 'calm', 'mindfulness', 'anxiety-relief'],
    order: 8,
  },
  {
    id: 'calm-garden',
    slug: 'quiet-grove', // Enigmatic: a peaceful, hidden place to grow
    title: 'The Gardener',
    description: 'Plant a small garden, then sit with it as the light changes',
    hook: "Tend a garden that answers what you plant and grows while you're away",
    cardImage: '/games/calm-garden/card.svg',
    category: 'Calm',
    accentColor: 'success',
    isShowcase: true,
    tags: ['creative', 'meditation', 'ai', 'open-ended', 'calm'],
    order: 9,
  },
  {
    id: 'cascade',
    slug: 'the-mutation',
    title: 'The Shapeshifter',
    description: 'A calm arcade game that learns six new rules, in a new order each time',
    hook: "Play a game that keeps changing its mind, and can't be lost",
    cardImage: '/games/cascade/card.svg',
    category: 'Play',
    accentColor: 'purple',
    isShowcase: true,
    tags: ['ai', 'arcade', 'unique', 'creative', 'retro'],
    order: 11,
  },
  {
    id: 'mind-debate',
    slug: 'the-arena', // Enigmatic: a place where minds clash
    title: 'The Arena',
    description: 'Two minds, one question, and what each got right',
    hook: 'Pick two minds and a question, hear them think it through, and see what each got right',
    cardImage: '/games/mind-debate/card.svg',
    category: 'Reflect',
    accentColor: 'accent',
    isShowcase: true,
    tags: ['ai', 'debate', 'philosophical', 'creative'],
    order: 12,
  },
  {
    id: 'worry-capsule',
    slug: 'the-slow-post', // Enigmatic: a letter to your future self
    title: 'The Keeper',
    description: 'Seal a worry, see how it turned out',
    hook: 'Seal a worry away, then see how it turned out',
    cardImage: '/games/worry-capsule/card.svg',
    category: 'Calm',
    accentColor: 'warning',
    isShowcase: true,
    tags: ['calm', 'reflection', 'private', 'anxiety-relief'],
    order: 13,
  },
  {
    id: 'hard-talk',
    slug: 'the-threshold', // Enigmatic: the moment before you step in
    title: 'The Plain Speaker',
    description: 'Steady yourself before a hard conversation',
    hook: 'Settle, find your words, walk in with one line',
    cardImage: '/games/hard-talk/card.svg',
    category: 'Calm',
    accentColor: 'success',
    isShowcase: true,
    tags: ['calm', 'anxiety-relief', 'conversation', 'self-compassion'],
    order: 14,
  },
] as const

/**
 * Games to display on the homepage
 * Sorted by order field
 */
export const SHOWCASE_GAMES = ALL_GAMES
  .filter((game) => game.isShowcase)
  .sort((a, b) => a.order - b.order)

export interface GameGroup {
  category: GameConfig['category']
  title: string
  description: string
  games: GameConfig[]
}

const GROUP_HEADINGS: readonly Omit<GameGroup, 'games'>[] = [
  { category: 'Calm', title: 'Slow down', description: 'Quiet games for when your mind is busy' },
  { category: 'Reflect', title: 'Reflect', description: 'Big questions, held gently' },
  { category: 'Play', title: 'Play', description: 'Thoughtful fun to get lost in' },
]

/** Showcase games in the one grouping and order every listing page uses. */
export const SHOWCASE_GROUPS: readonly GameGroup[] = GROUP_HEADINGS.map((heading) => ({
  ...heading,
  games: SHOWCASE_GAMES.filter((game) => game.category === heading.category),
})).filter((group) => group.games.length > 0)

/**
 * Get game by slug
 */
export function getGameBySlug(slug: string): GameConfig | undefined {
  return ALL_GAMES.find((game) => game.slug === slug)
}

