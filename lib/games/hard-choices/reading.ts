/**
 * Every answer leans one of four ways, on two axes that often pull against
 * each other: ease against growth, and the people around you against your
 * own footing. The ending reads back which pulls recurred, without scoring
 * or judging either.
 */
export const THEMES = ['ease', 'growth', 'others', 'self'] as const
export type Theme = (typeof THEMES)[number]

export interface ChosenValue {
  value: string
  theme: Theme
}

const PHRASE: Record<Theme, string> = {
  ease: 'things feeling good and settled',
  growth: 'stretching toward something more',
  others: 'the people around you',
  self: 'your own footing',
}

export const THEME_TITLE: Record<Theme, string> = {
  ease: 'Feeling settled',
  growth: 'Stretching further',
  others: 'The people around you',
  self: 'Your own footing',
}

/** One line for the end of the game: which pulls kept returning, kept short because the values are shown beside it. */
export function readingLine(chosen: readonly ChosenValue[]): string {
  if (chosen.length === 0) return 'Every question was let pass today. Some days are like that.'
  if (chosen.length <= 2) return 'A glimpse rather than a pattern: a few things mattered today.'
  const count = (theme: Theme) => chosen.filter((c) => c.theme === theme).length
  const top = Math.max(...THEMES.map(count))
  const leaders = THEMES.filter((theme) => count(theme) === top)
  if (leaders.length === 1) return `What kept returning today was ${PHRASE[leaders[0]]}.`
  if (leaders.length === 2) return `Two pulls kept returning today: ${PHRASE[leaders[0]]}, and ${PHRASE[leaders[1]]}.`
  return 'Your answers spread wide today: each question was weighed on its own.'
}
