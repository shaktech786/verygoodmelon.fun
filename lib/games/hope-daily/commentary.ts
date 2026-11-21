export const MAX_GUESS_LENGTH = 15
export const MAX_COMMENTARY_LENGTH = 140
/** Only the first few guesses of a day are answered live; later ones use the lines below. */
export const LIVE_COMMENTARY_GUESSES = 3

const LINES = [
  'Good word. The story has a little more to say.',
  'Every guess turns the page a little.',
  'A word worth having in the world, even on a day that is not its own.',
  'Take your time. The story will wait.',
  'Nice thinking. Here is a little more to go on.',
  'Still listening. Read on with me.',
]

function stableIndex(text: string, length: number): number {
  let hash = 0
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash % length
}

/**
 * A short, kind line after a guess, used whenever the live line cannot be had. The guess
 * number rotates the lines, so two guesses in a row never hear the same one.
 */
export function fallbackCommentary(guess: string, guessNumber?: number): string {
  return LINES[guessNumber ? (guessNumber - 1) % LINES.length : stableIndex(guess, LINES.length)]
}

/**
 * Model text arrives untrusted: one line, no wrapping quotes, never long. A line with a
 * number in it is dropped, because every figure the player reads must come from a source.
 */
export function tidyCommentary(text: string): string {
  const firstLine = text.trim().split(/\r?\n/)[0].trim().replace(/^["'“”]+|["'“”]+$/g, '').trim()
  if (/\d/.test(firstLine)) return ''
  if (firstLine.length <= MAX_COMMENTARY_LENGTH) return firstLine
  const cut = firstLine.slice(0, MAX_COMMENTARY_LENGTH - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : cut.length)}…`
}
