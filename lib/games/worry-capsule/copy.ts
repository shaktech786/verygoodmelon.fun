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
    'It happened. And here you are, on the other side of it.',
    'Some worries are about real things. You met this one anyway.',
    'It came true, and you are still here, reading this. That counts.',
    'It happened. You were braver about it than your worry expected.',
  ],
}

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

function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

export function tallySummary({ no, partly, yes, total }: Tally): string {
  if (total === 0) return ''
  if (total === 1) {
    const it = no ? 'It didn’t happen.' : partly ? 'It partly happened.' : 'It happened, and you got through it.'
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
  return 'Some worries are about real things. You met these, and came back to look.'
}
