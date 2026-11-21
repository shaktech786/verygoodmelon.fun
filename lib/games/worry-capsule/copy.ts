import type { Outcome, Tally } from './capsules'

export const OUTCOME_RESPONSES: Record<Outcome, readonly string[]> = {
  no: [
    'It didn’t happen. The worry was louder than the days turned out to be.',
    'Not this time. Worth remembering the next time that voice speaks up.',
    'It stayed a thought. Thoughts can be very convincing.',
    'It never came. You carried it for a while, and now you can set it down.',
  ],
  partly: [
    'Some of it came. Usually the real thing is smaller than the one we imagine.',
    'Partly. And the part that came, you handled.',
    'Half true, which means half of the weight was never needed.',
    'Some of it, not all of it. Fears rarely arrive in full.',
  ],
  yes: [
    'It happened. Thank you for coming back to look at it.',
    'Some worries are about real things, and this one was.',
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

function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

export function tallySummary({ no, partly, yes, total }: Tally): string {
  if (total === 0) return ''
  if (total === 1) {
    const it = no ? 'It didn’t happen.' : partly ? 'It partly happened.' : 'It happened.'
    return `You’ve looked back on 1 worry. ${it}`
  }
  const parts: string[] = []
  if (no) parts.push(`${no} didn’t happen`)
  if (partly) parts.push(`${partly} partly happened`)
  if (yes) parts.push(`${yes} happened`)
  return `You’ve looked back on ${total} worries: ${joinWithAnd(parts)}.`
}

export function tallyReflection({ no, partly, total }: Tally): string {
  if (total < 2) return ''
  if (no * 2 > total) return 'Most of what you feared never arrived.'
  if (no * 2 === total) return 'Half of what you feared never arrived.'
  if ((no + partly) * 2 > total) return 'Most of them turned out smaller than they felt.'
  return 'Some worries are about real things. You came back to look at each one.'
}
