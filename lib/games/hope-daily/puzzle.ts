/** One run of the story's text. `word` marks today's word (or a form of it) inside the fact. */
export interface StoryPiece {
  text: string
  word?: true
}

/** A part of the story that unfolds as one step. */
export type StoryPart = StoryPiece[]

export type Step = { kind: 'story'; index: number } | { kind: 'clue' }

export interface PlacedLetter {
  position: number
  letter: string
}

export type Unfolded = Step | ({ kind: 'letter' } & PlacedLetter) | null

export type KnownLetter = [number, string]

export type Status = 'playing' | 'found' | 'shown'

export interface Reflection {
  kind: 'progress' | 'wonder'
  text: string
}

export interface Reveal {
  word: string
  category: string
  kind: Reflection['kind']
  story: StoryPart[]
  source: string
  reflection: string
}

export interface Progress {
  guesses: string[]
  known: KnownLetter[]
  unfolded: number
  status: Status
  reveal: Reveal | null
}

const MIN_STEM = 5

/** True for the word itself or a longer form of it ("vaccination" for VACCINE, "Otters" for OTTER). */
export function isWordForm(token: string, word: string): boolean {
  const candidate = token.toUpperCase()
  if (candidate.length < word.length - 1) return false
  if (candidate.startsWith(word)) return true
  let shared = 0
  while (shared < word.length && candidate[shared] === word[shared]) shared++
  return shared >= MIN_STEM && shared >= word.length - 1
}

function partCount(wordCount: number): number {
  if (wordCount <= 14) return 2
  if (wordCount <= 28) return 3
  return 4
}

const PAUSE = /[,;:]["”’)]?$/
const NUDGE = 3

/** Splits a fact into two to four parts that read naturally, marking every form of the word. */
export function buildStory(fact: string, word: string): StoryPart[] {
  const tokens = fact.match(/\S+\s*/g) ?? [fact]
  const count = partCount(tokens.length)

  const ends: number[] = []
  for (let part = 1; part < count; part++) {
    const target = Math.round((tokens.length * part) / count)
    let end = target
    for (let distance = 0; distance <= NUDGE; distance++) {
      const later = target + distance
      const earlier = target - distance
      if (later < tokens.length - 1 && PAUSE.test(tokens[later - 1].trim())) { end = later; break }
      if (earlier > (ends.at(-1) ?? 0) + 1 && PAUSE.test(tokens[earlier - 1].trim())) { end = earlier; break }
    }
    ends.push(end)
  }
  ends.push(tokens.length)

  let start = 0
  return ends.map(end => {
    const part: StoryPart = []
    const addText = (text: string) => {
      if (!text) return
      const last = part.at(-1)
      if (last && !last.word) last.text += text
      else part.push({ text })
    }
    for (const token of tokens.slice(start, end)) {
      const [, before, core, after] = token.match(/^([^A-Za-z]*)([A-Za-z]*)([\s\S]*)$/) ?? ['', '', '', token]
      if (core && isWordForm(core, word)) {
        addText(before)
        part.push({ text: core, word: true })
        addText(after)
      } else {
        addText(token)
      }
    }
    start = end
    return part
  })
}

/** The story as it is sent before the word is found: the word's places are kept, but empty. */
export function veilStory(story: StoryPart[]): StoryPart[] {
  return story.map(part => part.map(piece => (piece.word ? { text: '', word: true } : piece)))
}

export function storyText(story: StoryPart[]): string {
  return story.flat().map(piece => piece.text).join('')
}

/** The story opens on its first part; the clue arrives after the second, once the story has had a say. */
export function buildLadder(partTotal: number): Step[] {
  const parts: Step[] = Array.from({ length: partTotal }, (_, index) => ({ kind: 'story', index }))
  return [...parts.slice(0, 2), { kind: 'clue' }, ...parts.slice(2)]
}

export function lettersInPlace(guess: string, word: string): KnownLetter[] {
  const upper = guess.toUpperCase()
  return word.split('').flatMap((letter, position): KnownLetter[] => (upper[position] === letter ? [[position, letter]] : []))
}

export function nextLetter(word: string, knownPositions: number[]): PlacedLetter | null {
  const position = word.split('').findIndex((_, index) => !knownPositions.includes(index))
  return position === -1 ? null : { position, letter: word[position] }
}

function listLetters(letters: KnownLetter[]): string {
  const said = letters.map(([position, letter], index) => `${index === 0 ? 'Letter' : 'letter'} ${position + 1} is ${letter}`)
  return said.length > 1 ? `${said.slice(0, -1).join(', ')} and ${said.at(-1)}` : said[0]
}

export function describeLetter({ position, letter }: PlacedLetter): string {
  return `${listLetters([[position, letter]])}.`
}

/** One plain summary of a guess, shown on the page and read out in the same words. */
export function describeGuess(guess: string, newlyPlaced: KnownLetter[], unfolded: Unfolded): string {
  const sentences = [`${guess} is not today’s word.`]
  if (newlyPlaced.length > 0) sentences.push(`${listLetters(newlyPlaced)}.`)
  if (unfolded?.kind === 'story') sentences.push('The story unfolds a little more.')
  if (unfolded?.kind === 'clue') sentences.push('The clue is now showing.')
  if (unfolded?.kind === 'letter') sentences.push(describeLetter(unfolded))
  return sentences.join(' ')
}

const STATUSES: Status[] = ['playing', 'found', 'shown']

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const isKnownLetter = (value: unknown, wordLength: number): value is KnownLetter =>
  Array.isArray(value) &&
  Number.isInteger(value[0]) &&
  value[0] >= 0 &&
  value[0] < wordLength &&
  typeof value[1] === 'string' &&
  /^[A-Z]$/.test(value[1])

function isReveal(value: unknown): value is Reveal {
  return isRecord(value) && typeof value.word === 'string' && Array.isArray(value.story) && typeof value.source === 'string'
}

function mergeKnown(letters: KnownLetter[]): KnownLetter[] {
  return [...new Map(letters).entries()].sort(([a], [b]) => a - b)
}

interface OldTile {
  letter: string
  state: string
}

/**
 * Today's saved progress, or null when there is none worth keeping. Also reads the
 * earlier letter-grid format, so a player mid-way through the day keeps their place.
 */
export function restoreProgress(saved: unknown, today: string, wordLength: number): Progress | null {
  if (!isRecord(saved) || saved.date !== today || !Array.isArray(saved.guesses)) return null

  if (saved.version === 2) {
    const guesses = saved.guesses.filter((guess): guess is string => typeof guess === 'string')
    if (guesses.some(guess => guess.length !== wordLength) || !Array.isArray(saved.known)) return null
    if (!STATUSES.includes(saved.status as Status)) return null
    return {
      guesses,
      known: mergeKnown(saved.known.filter((letter): letter is KnownLetter => isKnownLetter(letter, wordLength))),
      unfolded: Number.isInteger(saved.unfolded) && (saved.unfolded as number) > 0 ? (saved.unfolded as number) : 1,
      status: saved.status as Status,
      reveal: isReveal(saved.reveal) ? saved.reveal : null,
    }
  }

  const rows = saved.guesses as unknown[]
  const fits = rows.every(
    (row): row is OldTile[] =>
      Array.isArray(row) && row.length === wordLength && row.every(tile => isRecord(tile) && typeof tile.letter === 'string')
  )
  if (!fits) return null

  const placedByGuesses = rows.flatMap(row =>
    row.flatMap((tile, position): KnownLetter[] => (tile.state === 'correct' ? [[position, tile.letter]] : []))
  )
  const placedByHints = Array.isArray(saved.revealedLetters)
    ? saved.revealedLetters.filter((letter): letter is KnownLetter => isKnownLetter(letter, wordLength))
    : []
  const usedClue = typeof saved.hintsUsed === 'number' && saved.hintsUsed > 0

  return {
    guesses: rows.map(row => row.map(tile => tile.letter).join('')),
    known: mergeKnown([...placedByHints, ...placedByGuesses]),
    unfolded: 1 + rows.length + (usedClue ? 1 : 0),
    status: saved.gameState === 'won' ? 'found' : saved.gameState === 'lost' ? 'shown' : 'playing',
    reveal: null,
  }
}
