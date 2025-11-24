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
    id: 'what-really-matters',
    slug: 'eight-slices', // Enigmatic: the 8 slices of life
    title: 'The Prioritizer',
    description: 'You only have 8 slices - choose wisely',
    cardImage: '/games/what-really-matters/card.svg',
    cardAlt: 'The Prioritizer - What Really Matters Joker Card',
    difficulty: 'medium',
    category: 'Thought',
    accentColor: 'accent',
    isShowcase: true,
    tags: ['reflection', 'priorities', 'values'],
    order: 6,
  },
  {
    id: 'slow-pixel-art',
    slug: 'shared-canvas', // Enigmatic: collaborative creation
    title: 'The Collaborator',
    description: 'Create art together, one pixel at a time',
    cardImage: '/games/slow-pixel-art/card.svg',
    cardAlt: 'The Collaborator - Slow Pixel Art Joker Card',
    difficulty: 'easy',
    category: 'Creative',
    accentColor: 'purple',
    isShowcase: true,
    tags: ['collaborative', 'art', 'patience'],
    order: 7,
  },
  {
    id: 'cloud-watcher',
    slug: 'drifting-dreams', // Enigmatic: clouds drifting, imagination
    title: 'The Cloud Watcher',
    description: 'Name the clouds as they drift by',
    cardImage: '/games/cloud-watcher/card.svg',
    cardAlt: 'The Cloud Watcher - Cloud Watcher Joker Card',
    difficulty: 'easy',
    category: 'Creative',
    accentColor: 'success',
    isShowcase: true,
    tags: ['peaceful', 'procedural', 'meditative'],
    order: 8,
  },
  {
    id: 'the-untangler',
    slug: 'tangled-wisdom', // Enigmatic: untangling to reveal quotes
    title: 'The Untangler',
    description: 'Untangle the lines to reveal wisdom',
    cardImage: '/games/the-untangler/card.svg',
    cardAlt: 'The Untangler - Graph Puzzle Joker Card',
    difficulty: 'medium',
    category: 'Puzzle',
    accentColor: 'purple',
    isShowcase: true,
    tags: ['puzzle', 'quotes', 'logic'],
    order: 9,
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
