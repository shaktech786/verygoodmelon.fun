import type { Outcome, Tally } from './capsules'

/**
 * What is said once an answer is chosen. None of these weigh the worry: not how big it was, how
 * likely, or whether it was worth having. Some are about illness or loss, so they only say what
 * happened and that it can be set down.
 */
export const OUTCOME_RESPONSES: Record<Outcome, readonly string[]> = {
  no: [
    'It didn’t happen. You can set this one down.',
    'Not this time. It’s yours to put down now.',
    'It never came. You carried it for a while, and now you can rest it here.',
    'It didn’t happen. Thank you for coming back to look.',
  ],
  partly: [
    'Some of it came. Thank you for coming back to look at it.',
    'Partly. Some of it happened, and it is kept here now, as it was.',
    'Some of it happened. You don’t have to make sense of it today.',
    'Part of it came. Whatever it asked of you, you can set it down here.',
  ],
  yes: [
    'It happened. Thank you for coming back to look at it.',
    'It happened. Be gentle with yourself today.',
    'It happened. It is kept here now, with the others.',
    'It came true. You don’t have to make sense of it today.',
  ],
}

/** Said after any "it happened" line; it honours the carrying and assumes nothing about how it went. */
export const CARRIED_LINES: readonly string[] = [
  'And you carried it through the days in between. That counted.',
  'You carried it all the way here, and you came back to look.',
  'It was yours to carry for a while. You did carry it.',
  'Carrying it until now took something, whatever came of it.',
]

export const NOT_YET_LINES: readonly string[] = [
  'Too soon to tell. That is an answer too.',
  'Some things take longer to show how they’ll go. It can wait.',
  'Not yet. It can rest a while longer.',
]

export const RESTING_LINES: readonly string[] = [
  'It is still resting.',
  'It is not ready yet, and that is fine.',
  'Still sealed, still kept.',
]

export const SEALED_LINES: readonly string[] = [
  'You don’t have to carry this one until then.',
  'It’s kept now. You can put it down.',
  'Set down, for now. It will wait for you.',
]

/** Said once, as an answered capsule is set on the shelf. True whatever the answer was. */
export const CLOSED_LINES: readonly string[] = [
  'It rests on the shelf now, with its answer beside it.',
  'You don’t need to wonder about this one any more.',
  'Set down for good. You can look back on it whenever you like.',
]

export const FIRST_CLOSED_LINE = 'The first one on your shelf. You came back for it.'

export function closedLine(seed: string, first: boolean): string {
  return first ? FIRST_CLOSED_LINE : pickLine(CLOSED_LINES, seed)
}

function hash(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** The same capsule always says the same thing, so revisiting it feels consistent. */
export function pickLine(lines: readonly string[], seed: string): string {
  return lines[hash(seed) % lines.length]
}

export function outcomeResponse(outcome: Outcome, seed: string): string {
  const first = pickLine(OUTCOME_RESPONSES[outcome], seed)
  return outcome === 'yes' ? `${first} ${pickLine(CARRIED_LINES, `${seed}:carried`)}` : first
}

const SOME: Record<keyof Omit<Tally, 'total'>, string> = {
  no: 'some didn’t happen',
  partly: 'some partly happened',
  yes: 'some happened',
}

const EVERY: Record<keyof Omit<Tally, 'total'>, string> = {
  no: 'None of them happened.',
  partly: 'Each of them partly happened.',
  yes: 'Each of them happened.',
}

/** What became of the worries, told without a number, so it never reads as a score. */
export function tallySummary({ no, partly, yes, total }: Tally): string {
  if (total === 0) return ''
  if (total === 1) {
    const it = no ? 'It didn’t happen.' : partly ? 'It partly happened.' : 'It happened.'
    return `This is the worry you came back to look at. ${it}`
  }
  const kinds = (['no', 'partly', 'yes'] as const).filter((kind) => ({ no, partly, yes })[kind] > 0)
  const told = kinds.length === 1
    ? EVERY[kinds[0]]
    : `${kinds.slice(0, -1).map((kind) => SOME[kind]).join(', ')} and ${SOME[kinds[kinds.length - 1]]}.`
  return `These are the worries you came back to look at. ${told.charAt(0).toUpperCase()}${told.slice(1)}`
}

/** A closing thought for the shelf that holds every answer the same way, whatever came of them. */
export function tallyReflection({ total }: Tally): string {
  return total < 2 ? '' : 'Whatever came of each one, it is set down here now.'
}
