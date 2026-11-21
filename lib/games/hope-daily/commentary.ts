export type TileState = 'correct' | 'present' | 'absent'

export interface ScoredTile {
  letter: string
  state: TileState
}

export const MAX_GUESS_LENGTH = 15
export const MAX_COMMENTARY_LENGTH = 140

const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten']

const WIN_LINES = [
  'There it is. Worth finding.',
  'Found. Read on, this one is good news.',
  'That is the word. Here is why it matters.',
  'Yes. Now for the hopeful part.',
  'You found it, and the world got a little better too.',
]

const PLACED_LINES = [
  (n: string) => `${n} letters have found their places.`,
  (n: string) => `${n} letters are home already.`,
  (n: string) => `${n} letters are sitting exactly where they belong.`,
]

const ONE_PLACED_LINES = [
  'One letter has found its place.',
  'One letter is home already.',
  'One letter is sitting exactly where it belongs.',
]

const PRESENT_LINES = [
  'Some of these letters belong. They just want a different seat.',
  'Right letters, new places. The word is taking shape.',
  'A few of these are in the word, just shuffled.',
]

const NONE_LINES = [
  'None of these are in it, which clears the way.',
  'A clean slate. Those letters can rest now.',
  'Every letter here is ruled out. That is real progress.',
]

const EVEN_LINES = [
  'Each guess narrows the path. No hurry.',
  'Take your time. The word will wait.',
  'Another clue on the board.',
]

function stableIndex(text: string, length: number): number {
  let hash = 0
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash % length
}

// The row number rotates the lines, so two guesses in a row never get the same one.
function pick<T>(options: T[], seed: string, guessNumber?: number): T {
  return options[guessNumber ? guessNumber % options.length : stableIndex(seed, options.length)]
}

/**
 * A short, honest line about the tiles that just turned. Used whenever the
 * live commentary cannot be had, so a slow day never sounds like a broken record.
 */
export function fallbackCommentary(
  guess: string,
  tiles: ScoredTile[],
  isCorrect: boolean,
  guessNumber?: number
): string {
  if (isCorrect) return pick(WIN_LINES, guess)

  const placed = tiles.filter(tile => tile.state === 'correct').length
  const present = tiles.filter(tile => tile.state === 'present').length

  if (placed === 1) return pick(ONE_PLACED_LINES, guess, guessNumber)
  if (placed > 1) return pick(PLACED_LINES, guess, guessNumber)(NUMBER_WORDS[placed] ?? String(placed))
  if (present > 0) return pick(PRESENT_LINES, guess, guessNumber)
  if (tiles.length > 0) return pick(NONE_LINES, guess, guessNumber)
  return pick(EVEN_LINES, guess, guessNumber)
}

/** Model text arrives untrusted: one line, no wrapping quotes, never long. */
export function tidyCommentary(text: string): string {
  const firstLine = text.trim().split(/\r?\n/)[0].trim().replace(/^["'“”]+|["'“”]+$/g, '').trim()
  if (firstLine.length <= MAX_COMMENTARY_LENGTH) return firstLine
  const cut = firstLine.slice(0, MAX_COMMENTARY_LENGTH - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : cut.length)}…`
}

export function parseTiles(value: unknown, guess: string): ScoredTile[] {
  if (!Array.isArray(value) || value.length !== guess.length) return []
  const states: TileState[] = ['correct', 'present', 'absent']
  return value.every(tile => states.includes(tile?.state))
    ? value.map((tile, i) => ({ letter: guess[i], state: tile.state as TileState }))
    : []
}
