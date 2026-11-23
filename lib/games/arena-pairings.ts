export type EmblemId =
  | 'laurel' | 'carnation' | 'cat' | 'dog' | 'moon' | 'sun' | 'column' | 'mountain'
  | 'quill' | 'lens' | 'drop' | 'kite' | 'tortoise' | 'hare' | 'gear' | 'bolt'
  | 'honey' | 'scroll' | 'oak' | 'mayfly' | 'star' | 'planet' | 'grapes' | 'mug'

/**
 * The two speakers' colours, the same on the cards, the stage and the keepsake: calm, neither
 * red nor green so neither side ever reads as right or wrong. Both pass 4.5:1 as text on the
 * card background in light and dark.
 */
export const ARENA_VOICE_COLOURS = {
  light: { a: '#35577f', b: '#80541c' },
  dark: { a: '#a8c2e8', b: '#e6bd80' },
} as const

export interface Pairing {
  first: string
  second: string
  topic: string
  /** A small picture for each side, drawn on the pairing's card */
  emblems: readonly [EmblemId, EmblemId]
}

/** Each emblem as ten rows of ten cells, X for ink, drawn the same on the cards, the stage and the keepsake */
export const EMBLEM_ROWS: Record<EmblemId, readonly string[]> = {
  laurel: ['..........', '.X......X.', 'XX......XX', '.XX....XX.', 'XX......XX', '.XX....XX.', '..XX..XX..', '...XXXX...', '....XX....', '..........'],
  carnation: ['...X..X...', '..XXXXXX..', '.XXX..XXX.', '..XXXXXX..', '...XXXX...', '....X.....', '....X.XX..', '..XXX.....', '....X.....', '....X.....'],
  cat: ['X........X', 'XX......XX', 'XXXXXXXXXX', 'XX.XXXX.XX', 'XXXXXXXXXX', 'XXXX..XXXX', '.XXXXXXXX.', '..XXXXXX..', '..........', '..........'],
  dog: ['..XXXXXX..', 'XXXXXXXXXX', 'XXX.XX.XXX', 'XXXXXXXXXX', 'X.XXXXXX.X', 'X.XX..XX.X', '..XXXXXX..', '...XXXX...', '....XX....', '..........'],
  moon: ['...XXXX...', '.XXXX.....', '.XXX......', 'XXX.......', 'XXX.......', 'XXX.......', 'XXX.......', '.XXX......', '.XXXX.....', '...XXXX...'],
  sun: ['....XX....', '.X......X.', '...XXXX...', '..XXXXXX..', 'X.XXXXXX.X', 'X.XXXXXX.X', '..XXXXXX..', '...XXXX...', '.X......X.', '....XX....'],
  column: ['XXXXXXXXXX', '.XXXXXXXX.', '..X.XX.X..', '..X.XX.X..', '..X.XX.X..', '..X.XX.X..', '..X.XX.X..', '..X.XX.X..', '.XXXXXXXX.', 'XXXXXXXXXX'],
  mountain: ['..........', '....X.....', '...XXX....', '..XX.XX...', '..XXXXX.X.', '.XXXXXXXXX', 'XXXXXXXXXX', 'XXXXXXXXXX', '..........', '..........'],
  quill: ['........XX', '.......XXX', '......XXX.', '.....XXX..', '....XXX...', '...XXX....', '...XX.....', '..X.......', '.X........', 'X.........'],
  lens: ['.XXXX.....', 'X....X....', 'X....X....', 'X....X....', 'X....X....', '.XXXX.....', '.....XX...', '......XX..', '.......XX.', '........XX'],
  drop: ['....X.....', '....X.....', '...XXX....', '...XXX....', '..XXXXX...', '.XXXXXXX..', '.XX.XXXX..', '.XX.XXXX..', '..XXXXX...', '...XXX....'],
  kite: ['...X......', '..XXX.....', '.XXXXX....', 'XXXXXXX...', '.XXXXX....', '..XXX.....', '...X......', '....X..X..', '.....XX.X.', '.........X'],
  tortoise: ['..........', '..........', '..XXXXX...', '.X.X.X.XXX', 'XXXXXXXXXX', 'XXXXXXXX..', '.XX..XX...', '..........', '..........', '..........'],
  hare: ['..X.X.....', '..X.X.....', '..X.X.....', '..XXX.....', '.XXXXX....', '.X.XXXX...', '.XXXXXXX..', '..XXXXXXX.', '..XXXXXXXX', '.XX....XX.'],
  gear: ['....XX....', '.X.XXXX.X.', '..XXXXXX..', '.XXX..XXX.', 'XXX....XXX', 'XXX....XXX', '.XXX..XXX.', '..XXXXXX..', '.X.XXXX.X.', '....XX....'],
  bolt: ['.....XXX..', '....XXX...', '...XXX....', '..XXX.....', '.XXXXXXX..', '.....XXX..', '....XXX...', '...XX.....', '..XX......', '.X........'],
  honey: ['..XXXXXX..', '...XXXX...', '.XXXXXXXX.', 'XXXXXXXXXX', 'XX......XX', 'XX.XXXX.XX', 'XX......XX', 'XXXXXXXXXX', '.XXXXXXXX.', '..........'],
  scroll: ['XXXXXXXXXX', 'X........X', '.XXXXXXXX.', '.X......X.', '.X.XXXX.X.', '.X......X.', '.X.XXX..X.', '.X......X.', '.XXXXXXXX.', 'XXXXXXXXXX'],
  oak: ['...XXXX...', '.XXXXXXXX.', 'XXXXXXXXXX', 'XXXXXXXXXX', '.XXXXXXXX.', '..XXXXXX..', '....XX....', '....XX....', '....XX....', '..XXXXXX..'],
  mayfly: ['....XX....', 'XX..XX..XX', 'XXX.XX.XXX', '.XXXXXXXX.', '..XXXXXX..', '....XX....', '....XX....', '....XX....', '...X..X...', '..X....X..'],
  star: ['....XX....', '....XX....', '...XXXX...', 'XXXXXXXXXX', '.XXXXXXXX.', '..XXXXXX..', '..XXXXXX..', '.XXX..XXX.', '.XX....XX.', 'X........X'],
  planet: ['..........', '...XXXX...', '..XXXXXX..', 'XXXXXXXXXX', 'X........X', '.XXXXXXXX.', '..XXXXXX..', '...XXXX...', '..........', '..........'],
  grapes: ['.....X....', '....X.....', '.XX.XX.XX.', '.XXXXXXXX.', '..XX.XX...', '..XXXXXX..', '...XX.X...', '...XXXX...', '....XX....', '..........'],
  mug: ['..X.X.....', '.X.X......', '..........', 'XXXXXXX...', 'XXXXXXXXX.', 'XXXXXXX.X.', 'XXXXXXX.X.', 'XXXXXXXXX.', 'XXXXXXX...', '.XXXXX....'],
}

/** What each emblem shows, for anyone who cannot see it */
export const EMBLEM_NAMES: Record<EmblemId, string> = {
  laurel: 'a laurel wreath', carnation: 'a carnation', cat: 'a cat', dog: 'a dog', moon: 'a crescent moon', sun: 'a sun',
  column: 'a stone column', mountain: 'a mountain', quill: 'a quill', lens: 'a magnifying glass', drop: 'a drop of water',
  kite: 'a kite', tortoise: 'a tortoise', hare: 'a hare', gear: 'a gear', bolt: 'a lightning bolt', honey: 'a honey pot',
  scroll: 'a scroll', oak: 'an oak tree', mayfly: 'a mayfly', star: 'a star', planet: 'a ringed planet', grapes: 'grapes',
  mug: 'a steaming mug',
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
