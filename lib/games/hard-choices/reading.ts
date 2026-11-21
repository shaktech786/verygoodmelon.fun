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
  /** Why reaching both ways is not indecision. */
  because: string
}

const AXES: readonly Axis[] = [
  { sides: ['ease', 'growth'], because: 'most good lives need both rest and stretching, at different times' },
  { sides: ['others', 'self'], because: 'close bonds stay healthy when the people around you and your own footing both get a turn' },
]

const PHRASE: Record<Theme, string> = {
  ease: 'things feeling good and settled',
  growth: 'stretching toward something more',
  others: 'the people around you',
  self: 'your own footing',
}

const GROUP_TITLE: Record<Theme, string> = {
  ease: 'Feeling settled',
  growth: 'Stretching further',
  others: 'The people around you',
  self: 'Your own footing',
}

export interface ValueGroup {
  title: string
  values: string[]
}

const MAX_GROUPS = 3

function list(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * The chosen values gathered under the pulls they share, strongest first, so a dozen words read as
 * two or three themes. Answers in a fourth, smaller theme join the last group rather than stand alone.
 */
export function groupChoices(chosen: ChosenValue[]): ValueGroup[] {
  const valuesOf = (theme: Theme) => chosen.filter((c) => c.theme === theme).map((c) => c.value)
  const themes = THEMES.filter((theme) => valuesOf(theme).length > 0)
    .sort((a, b) => valuesOf(b).length - valuesOf(a).length)
  const groups = themes.map((theme) => ({ title: GROUP_TITLE[theme], values: valuesOf(theme) }))
  if (groups.length <= MAX_GROUPS) return groups
  const rest = groups.slice(MAX_GROUPS - 1)
  return [...groups.slice(0, MAX_GROUPS - 1), { title: 'And also', values: rest.flatMap((group) => group.values) }]
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
  const tensionOf = ({ sides: [a, b], because }: Axis) =>
    `You reached for ${list(valuesOf(a))}, and also for ${list(valuesOf(b))}. That is not indecision: ${because}.`

  const lines: string[] = []
  let readAxis: Axis | undefined

  if (leaders.length === 1) {
    const values = valuesOf(leaders[0])
    lines.push(`What kept returning was ${PHRASE[leaders[0]]}: ${list(values)} ${values.length === 2 ? 'both' : 'all'} lean that way.`)
  } else if (leaders.length === 2) {
    readAxis = AXES.find(({ sides }) => sides.every((side) => leaders.includes(side)))
    lines.push(readAxis
      ? tensionOf(readAxis)
      : `Two pulls kept returning in equal measure: ${leaders.map((theme) => `${PHRASE[theme]} (${list(valuesOf(theme))})`).join(' and ')}.`)
  } else {
    const first = chosen[0]
    const far = chosen.find((c) => c.theme !== first.theme) ?? chosen[chosen.length - 1]
    lines.push(`Your answers spread out, from ${first.value} to ${far.value}, with no single pull winning: each question was weighed on its own.`)
  }

  const tension = AXES
    .filter((axis) => axis !== readAxis && smaller(axis) >= 2 && Math.abs(count(axis.sides[0]) - count(axis.sides[1])) <= 1)
    .sort((x, y) => smaller(y) - smaller(x))[0]
  if (tension) return [...lines, tensionOf(tension)]

  const quiet = AXES
    .filter((axis) => smaller(axis) === 0 && Math.max(count(axis.sides[0]), count(axis.sides[1])) >= 3)
    .map(({ sides: [a, b] }) => (count(a) === 0 ? { missing: a, other: count(b) } : { missing: b, other: count(a) }))
    .sort((x, y) => y.other - x.other)[0]
  if (quiet) {
    lines.push(`${capitalise(PHRASE[quiet.missing])} came up less today, which may simply mean it is already looked after, or that it can wait for another day.`)
  }
  return lines
}
