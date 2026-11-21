/**
 * Every answer leans one of four ways, on two axes that often pull against
 * each other: ease against growth, and the people around you against your
 * own footing. The reading reflects which pulls recurred and which pulled
 * against each other, without scoring or judging either.
 */
export const THEMES = ['ease', 'growth', 'others', 'self'] as const
export type Theme = (typeof THEMES)[number]

export interface ChosenValue {
  value: string
  theme: Theme
}

interface Axis {
  sides: readonly [Theme, Theme]
  tension: string
}

const AXES: readonly Axis[] = [
  {
    sides: ['ease', 'growth'],
    tension: 'You moved between rest and stretching, choosing each more than once. That is not indecision: most good lives need both, at different times.',
  },
  {
    sides: ['others', 'self'],
    tension: 'You moved between the people around you and your own footing, choosing each more than once. That is not indecision: close bonds stay healthy when both get a turn.',
  },
]

const PHRASE: Record<Theme, string> = {
  ease: 'things feeling good and settled',
  growth: 'stretching toward something more',
  others: 'the people around you',
  self: 'your own footing',
}

const SPREAD = 'Your answers spread out with no single pull winning, which usually means each question was weighed on its own.'

function list(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** A short, kind reading of the answers given, in dilemma order. Empty when nothing was chosen. */
export function readChoices(chosen: ChosenValue[]): string[] {
  if (chosen.length === 0) return []
  if (chosen.length <= 2) {
    const amount = chosen.length === 1 ? 'one answer' : 'two answers'
    return [`With ${amount}, this is a glimpse rather than a pattern: ${list(chosen.map((c) => c.value))} mattered today.`]
  }

  const valuesOf = (theme: Theme) => chosen.filter((c) => c.theme === theme).map((c) => c.value)
  const count = (theme: Theme) => valuesOf(theme).length
  const top = Math.max(...THEMES.map(count))
  const leaders = THEMES.filter((theme) => count(theme) === top)
  const smaller = ({ sides: [a, b] }: Axis) => Math.min(count(a), count(b))

  const lines: string[] = []
  let readAxis: Axis | undefined

  if (leaders.length === 1) {
    const values = valuesOf(leaders[0])
    lines.push(`What kept returning was ${PHRASE[leaders[0]]}: ${list(values)} ${values.length === 2 ? 'both' : 'all'} lean that way.`)
  } else if (leaders.length === 2) {
    readAxis = AXES.find(({ sides }) => sides.every((side) => leaders.includes(side)))
    lines.push(readAxis
      ? readAxis.tension
      : `Two pulls kept returning in equal measure: ${leaders.map((theme) => `${PHRASE[theme]} (${list(valuesOf(theme))})`).join(' and ')}.`)
  } else {
    lines.push(SPREAD)
  }

  const tension = AXES
    .filter((axis) => axis !== readAxis && smaller(axis) >= 2 && Math.abs(count(axis.sides[0]) - count(axis.sides[1])) <= 1)
    .sort((x, y) => smaller(y) - smaller(x))[0]
  if (tension) return [...lines, tension.tension]

  const quiet = AXES
    .filter((axis) => smaller(axis) === 0 && Math.max(count(axis.sides[0]), count(axis.sides[1])) >= 3)
    .map(({ sides: [a, b] }) => (count(a) === 0 ? { missing: a, other: count(b) } : { missing: b, other: count(a) }))
    .sort((x, y) => y.other - x.other)[0]
  if (quiet) {
    lines.push(`${capitalise(PHRASE[quiet.missing])} came up less today, which may simply mean it is already looked after, or that it can wait for another day.`)
  }
  return lines
}
