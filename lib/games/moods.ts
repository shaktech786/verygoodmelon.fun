import { SHOWCASE_GAMES, type GameConfig } from '@/lib/games/config'

export type MoodId = 'restless' | 'heavy' | 'play'

export interface Mood {
  id: MoodId
  /** How the visitor names it on the homepage: "I feel restless" */
  label: string
  /** Heading for the filtered list on /games */
  heading: string
  /** One line under that heading */
  line: string
  gameIds: readonly string[]
}

/**
 * Three ways in for someone who doesn't know what they want yet. The games about death
 * (The Final Word, The Awakening) are left out of every mood on purpose: a visitor who
 * says they feel heavy is pointed at somewhere to set it down, not somewhere heavier.
 */
export const MOODS: readonly Mood[] = [
  {
    id: 'restless',
    label: 'Restless',
    heading: 'For a restless mind',
    line: 'Something for your breath and hands to follow, until the hurry wears off.',
    gameIds: ['breathing-patterns', 'the-unrusher', 'calm-garden', 'cascade', 'hard-talk'],
  },
  {
    id: 'heavy',
    label: 'Heavy',
    heading: 'For when it feels heavy',
    line: 'Gentle places to set something down for a while.',
    gameIds: ['worry-capsule', 'idea-lab', 'hope-daily', 'calm-garden', 'timeless-minds'],
  },
  {
    id: 'play',
    label: 'Want to play',
    heading: 'For when you want to play',
    line: 'Thoughtful fun with nothing to lose.',
    gameIds: ['hope-daily', 'cascade', 'idea-lab', 'thought-pockets', 'mind-debate', 'hard-choices'],
  },
]

const MOOD_IDS: ReadonlySet<string> = new Set(MOODS.map((mood) => mood.id))

/** The mood named in a URL's query, or undefined for anything else (missing, repeated, misspelt). */
export function parseMood(value: string | string[] | undefined): MoodId | undefined {
  return typeof value === 'string' && MOOD_IDS.has(value) ? (value as MoodId) : undefined
}

export function getMood(id: MoodId): Mood {
  const mood = MOODS.find((m) => m.id === id)
  if (!mood) throw new Error(`Unknown mood: ${id}`)
  return mood
}

/** A mood's games in the order the mood lists them, the most fitting first. */
export function gamesForMood(id: MoodId): GameConfig[] {
  return getMood(id)
    .gameIds.map((gameId) => SHOWCASE_GAMES.find((game) => game.id === gameId))
    .filter((game): game is GameConfig => game !== undefined)
}

export const moodHref = (id: MoodId): string => `/games?mood=${id}`
