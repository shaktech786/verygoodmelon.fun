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
    description: 'Daily word game with hopeful facts',
    hook: 'Guess the word, discover something good about the world',
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
    description: 'Critical thinking through tough choices',
    hook: 'Twelve questions with no right answer, and what your choices protect',
    cardImage: '/games/hard-choices/card.svg',
    category: 'Reflect',
    accentColor: 'purple',
    isShowcase: true,
    tags: ['voting', 'ethics', 'community'],
    order: 3,
  },
  {
    id: 'last-words',
    slug: 'final-breath', // Enigmatic: end of life reflection
    title: 'The Final Word',
    description: 'Share your last words, see humanity\'s',
    hook: 'Write what you\'d say at the end and read others\' words',
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
    description: 'Slow down and savor the moment',
    hook: 'A game that rewards you for not rushing',
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
    description: 'Your first words after crossing over',
    hook: 'Imagine the moment after your life ends, say your first words, then wake up',
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
    description: 'Combine concepts to discover new ideas',
    hook: 'Mix two ideas and find the seven golds',
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
    description: 'Sync your breath with living geometry',
    hook: 'Breathe along with animated patterns that calm you down',
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
    description: 'Grow a garden that knows what you need',
    hook: 'Plant a quiet garden and see who comes to visit',
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
    description: 'A small, calm arcade game that learns a new rule every wave',
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
    hook: 'Pick two people and a topic, then watch them argue it out',
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
    hook: 'Seal a worry away, then see if it came true',
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
    title: 'The Envoy',
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

/**
 * Get game by slug
 */
export function getGameBySlug(slug: string): GameConfig | undefined {
  return ALL_GAMES.find((game) => game.slug === slug)
}

