export type EmblemId =
  | 'laurel' | 'carnation' | 'cat' | 'dog' | 'moon' | 'sun' | 'column' | 'mountain'
  | 'quill' | 'lens' | 'drop' | 'kite' | 'tortoise' | 'hare' | 'gear' | 'bolt'
  | 'honey' | 'scroll' | 'oak' | 'mayfly' | 'star' | 'planet' | 'grapes' | 'mug'

export interface Pairing {
  first: string
  second: string
  topic: string
  /** A small picture for each side, drawn on the pairing's card */
  emblems: readonly [EmblemId, EmblemId]
}

export const PAIRINGS: readonly Pairing[] = [
  { first: 'Marcus Aurelius', second: 'Oscar Wilde', topic: 'Should you care what others think?', emblems: ['laurel', 'carnation'] },
  { first: 'A cat', second: 'A dog', topic: 'Is a nap a waste of a day?', emblems: ['cat', 'dog'] },
  { first: 'The Moon', second: 'The Sun', topic: 'Is it better to shine or to reflect?', emblems: ['moon', 'sun'] },
  { first: 'Socrates', second: 'Nietzsche', topic: 'Is free will an illusion?', emblems: ['column', 'mountain'] },
  { first: 'Jane Austen', second: 'Sherlock Holmes', topic: 'Can you reason your way into love?', emblems: ['quill', 'lens'] },
  { first: 'Lao Tzu', second: 'Benjamin Franklin', topic: 'Is doing nothing ever the wise choice?', emblems: ['drop', 'kite'] },
  { first: 'The Tortoise', second: 'The Hare', topic: 'Is slow and steady overrated?', emblems: ['tortoise', 'hare'] },
  { first: 'Ada Lovelace', second: 'Mary Shelley', topic: 'Should we fear what we create?', emblems: ['gear', 'bolt'] },
  { first: 'Winnie-the-Pooh', second: 'Seneca', topic: 'Is it enough to want very little?', emblems: ['honey', 'scroll'] },
  { first: 'An old oak tree', second: 'A mayfly', topic: 'Is a short life a lesser life?', emblems: ['oak', 'mayfly'] },
  { first: 'Hypatia', second: 'Carl Sagan', topic: 'Does the universe mind that we are here?', emblems: ['star', 'planet'] },
  { first: 'Epicurus', second: 'A busy parent', topic: 'Is a simple life a happy life?', emblems: ['grapes', 'mug'] },
]

/** The pairing these exact fields came from, or -1 once anything has been changed by hand. */
export function pairingIndexOf(first: string, second: string, topic: string): number {
  return PAIRINGS.findIndex((p) => p.first === first && p.second === second && p.topic === topic)
}

/** Where arrow keys move focus in a deck laid out `columns` wide; a single row moves one card either way. */
export function deckStep(index: number, key: string, count: number, columns: number): number | null {
  const rowStep = columns >= count ? 1 : columns
  switch (key) {
    case 'ArrowLeft': return Math.max(0, index - 1)
    case 'ArrowRight': return Math.min(count - 1, index + 1)
    case 'ArrowUp': return Math.max(0, index - rowStep)
    case 'ArrowDown': return Math.min(count - 1, index + rowStep)
    case 'Home': return 0
    case 'End': return count - 1
    default: return null
  }
}
