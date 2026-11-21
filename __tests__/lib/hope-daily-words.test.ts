import { describe, it, expect } from 'vitest'
import {
  CATEGORIES,
  MAX_WORD_LENGTH,
  MIN_WORD_LENGTH,
  getWordForDay,
  getWordOfDay,
  wordList,
} from '@/lib/games/hope-daily/words'

const DAY = 24 * 60 * 60 * 1000
const START = Date.UTC(2025, 0, 1)

describe('The Optimist word list', () => {
  it('has no duplicate words', () => {
    const words = wordList.map(entry => entry.word)
    expect(new Set(words).size).toBe(words.length)
  })

  it('has a complete entry for every word, in a length the board supports', () => {
    for (const entry of wordList) {
      expect(entry.word, entry.word).toMatch(/^[A-Z]+$/)
      expect(entry.word.length, entry.word).toBeGreaterThanOrEqual(MIN_WORD_LENGTH)
      expect(entry.word.length, entry.word).toBeLessThanOrEqual(MAX_WORD_LENGTH)
      expect(entry.clue.trim().length, entry.word).toBeGreaterThan(5)
      expect(entry.fact.trim().length, entry.word).toBeGreaterThan(30)
      expect(entry.fact, entry.word).toMatch(/[.!]$/)
      expect(CATEGORIES, entry.word).toContain(entry.category)
    }
  })

  it('never gives the answer away in the clue', () => {
    for (const entry of wordList) {
      expect(entry.clue.toUpperCase(), entry.word).not.toContain(entry.word)
    }
  })

  it('is long enough to run for most of a year before any word comes back', () => {
    expect(wordList.length).toBeGreaterThanOrEqual(200)
  })

  it('draws on every theme', () => {
    for (const category of CATEGORIES) {
      expect(wordList.filter(entry => entry.category === category).length, category).toBeGreaterThanOrEqual(20)
    }
  })
})

describe('Choosing the word for a day', () => {
  it('gives the same word all day and to everyone', () => {
    const morning = getWordForDay(new Date(START + 100 * DAY + 60_000))
    const night = getWordForDay(new Date(START + 100 * DAY + DAY - 60_000))
    expect(night).toBe(morning)
  })

  it('does not repeat a word until every word has had its day', () => {
    const seen = new Set<string>()
    for (let day = 0; day < wordList.length; day++) {
      seen.add(getWordForDay(new Date(START + day * DAY)).word)
    }
    expect(seen.size).toBe(wordList.length)
  })

  it('keeps the full list between any two appearances of the same word, across cycles', () => {
    const lastSeen = new Map<string, number>()
    for (let day = 0; day < wordList.length * 3; day++) {
      const { word } = getWordForDay(new Date(START + day * DAY))
      const previous = lastSeen.get(word)
      if (previous !== undefined) expect(day - previous).toBe(wordList.length)
      lastSeen.set(word, day)
    }
  })

  it('mixes the themes instead of running one theme for weeks', () => {
    const run = Array.from({ length: 14 }, (_, day) => getWordForDay(new Date(START + day * DAY)).category)
    expect(new Set(run).size).toBeGreaterThanOrEqual(4)
  })

  it('handles dates before the start without breaking', () => {
    expect(getWordForDay(new Date(START - 3 * DAY)).word).toMatch(/^[A-Z]+$/)
  })

  it('uses today for the live word', () => {
    expect(getWordOfDay()).toBe(getWordForDay(new Date()))
  })
})
