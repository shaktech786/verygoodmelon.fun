import { buildStory, veilStory, type Reveal, type StoryPart } from './puzzle'
import { REFLECTIONS } from './reflections'
import type { WordData } from './words'

export interface Puzzle {
  category: string
  wordLength: number
  clue: string
  story: StoryPart[]
}

export function puzzleFor(entry: WordData): Puzzle {
  return {
    category: entry.category,
    wordLength: entry.word.length,
    clue: entry.clue,
    story: veilStory(buildStory(entry.fact, entry.word)),
  }
}

export function revealFor(entry: WordData): Reveal {
  const reflection = REFLECTIONS[entry.word]
  return {
    word: entry.word,
    category: entry.category,
    kind: reflection.kind,
    story: buildStory(entry.fact, entry.word),
    source: entry.source,
    reflection: reflection.text,
  }
}
