import { SHOWCASE_GAMES, type GameConfig } from '@/lib/games/config'

/** Why a calm game is worth today, in one line. Every calm showcase game needs one (a unit test checks). */
export const PICK_REASONS: Readonly<Record<string, string>> = {
  'the-unrusher': 'The day can wait one minute while you notice something small.',
  'breathing-patterns': 'A few slow breaths, and you leave with a pattern that is only yours.',
  'calm-garden': 'Nothing to win: just something small that keeps growing while you are away.',
  'worry-capsule': 'One worry sealed away is one you do not have to carry around all day.',
  'hard-talk': 'If something hard is on today’s list, this helps you walk in steady.',
}

// Someone arriving anxious should be pointed at something calming, never at a game about death
const PICKABLE: readonly GameConfig[] = SHOWCASE_GAMES.filter((game) => game.category === 'Calm')

export interface DailyPick {
  game: GameConfig
  reason: string
}

/** The day of the year in the date's own (the visitor's) timezone, 1 on 1 January. */
function dayOfYear(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 0)
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.round((startOfDay.getTime() - startOfYear.getTime()) / 86_400_000)
}

/** The same calm game all day, a different one tomorrow, rotating through every calm game in turn. */
export function dailyPick(date: Date): DailyPick | undefined {
  if (PICKABLE.length === 0) return undefined
  const game = PICKABLE[dayOfYear(date) % PICKABLE.length]
  return { game, reason: PICK_REASONS[game.id] ?? game.hook }
}
