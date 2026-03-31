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
  cardAlt: string
  difficulty: 'easy' | 'medium' | 'hard'
  category: 'Action' | 'Puzzle' | 'Wisdom' | 'Thought' | 'Creative'
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
    cardAlt: 'The Optimist - Hope Daily Joker Card',
    difficulty: 'easy',
    category: 'Puzzle',
    accentColor: 'success',
    isShowcase: true,
    tags: ['daily', 'word-game', 'uplifting'],
    order: 1,
  },
  {
    id: 'timeless-minds',
    slug: 'ancient-voices', // Enigmatic: wisdom from the past
    title: 'The Sage',
    description: 'Chat with 61 wisdom figures',
    hook: 'Ask life questions to history\'s greatest thinkers',
    cardImage: '/games/timeless-minds/card.svg',
    cardAlt: 'The Sage - Timeless Minds Joker Card',
    difficulty: 'easy',
    category: 'Wisdom',
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
    hook: 'Vote on impossible dilemmas and see how others chose',
    cardImage: '/games/hard-choices/card.svg',
    cardAlt: 'The Dilemma - Hard Choices Joker Card',
    difficulty: 'medium',
    category: 'Thought',
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
    cardAlt: 'The Final Word - Last Words Joker Card',
    difficulty: 'easy',
    category: 'Thought',
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
    cardAlt: 'The Patient One - The Unrusher Joker Card',
    difficulty: 'easy',
    category: 'Thought',
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
    hook: 'Imagine waking up in the afterlife and speak first',
    cardImage: '/games/first-words/card.svg',
    cardAlt: 'The Awakening - First Words Joker Card',
    difficulty: 'easy',
    category: 'Thought',
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
    hook: 'Mix two ideas together and see what emerges',
    cardImage: '/games/idea-lab/card.svg',
    cardAlt: 'The Alchemist - Idea Lab Joker Card',
    difficulty: 'easy',
    category: 'Creative',
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
    hook: 'Collect thought cards and battle logical fallacies',
    cardImage: '/games/thought-pockets/card.svg',
    cardAlt: 'The Philosopher - Thought Pockets Joker Card',
    difficulty: 'medium',
    category: 'Thought',
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
    cardAlt: 'The Harmonist - Breathing Patterns Joker Card',
    difficulty: 'easy',
    category: 'Thought',
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
    hook: 'Plant seeds of thought and watch your garden respond',
    cardImage: '/games/calm-garden/card.svg',
    cardAlt: 'The Gardener - Calm Garden Joker Card',
    difficulty: 'easy',
    category: 'Creative',
    accentColor: 'success',
    isShowcase: true,
    tags: ['creative', 'meditation', 'ai', 'open-ended', 'calm'],
    order: 9,
  },
  {
    id: 'cascade',
    slug: 'the-mutation',
    title: 'The Shapeshifter',
    description: 'A self-building arcade game that evolves as you play',
    hook: 'Play an arcade game that rewrites its own rules',
    cardImage: '/games/cascade/card.svg',
    cardAlt: 'The Shapeshifter - Cascade Joker Card',
    difficulty: 'medium',
    category: 'Action',
    accentColor: 'purple',
    isShowcase: true,
    tags: ['ai', 'arcade', 'unique', 'creative', 'retro'],
    order: 11,
  },
  {
    id: 'mind-debate',
    slug: 'the-arena', // Enigmatic: a place where minds clash
    title: 'The Arena',
    description: 'Watch any two minds debate any topic',
    hook: 'Pick two people and a topic, then watch them argue it out',
    cardImage: '/games/mind-debate/card.svg',
    cardAlt: 'The Arena - Mind Debate Joker Card',
    difficulty: 'easy',
    category: 'Thought',
    accentColor: 'accent',
    isShowcase: true,
    tags: ['ai', 'debate', 'philosophical', 'creative'],
    order: 12,
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

/**
 * Get games by category
 */
export function getGamesByCategory(category: GameConfig['category']): GameConfig[] {
  return ALL_GAMES.filter((game) => game.category === category)
}

/**
 * Get games by tag
 */
export function getGamesByTag(tag: string): GameConfig[] {
  return ALL_GAMES.filter((game) => game.tags.includes(tag))
}
