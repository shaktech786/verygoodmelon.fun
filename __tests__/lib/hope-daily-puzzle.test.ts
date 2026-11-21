import { describe, it, expect } from 'vitest'
import {
  buildLadder,
  buildStory,
  describeGuess,
  describeLetter,
  isWordForm,
  lettersInPlace,
  nextLetter,
  restoreProgress,
  storyText,
  veilStory,
} from '@/lib/games/hope-daily/puzzle'
import { wordList } from '@/lib/games/hope-daily/words'

const TODAY = '2026-11-21'

describe('finding the word inside its own story', () => {
  it('matches the word itself and the longer forms that grow from it', () => {
    expect(isWordForm('solar', 'SOLAR')).toBe(true)
    expect(isWordForm('Otters', 'OTTER')).toBe(true)
    expect(isWordForm('vaccination', 'VACCINE')).toBe(true)
    expect(isWordForm('greening', 'GREEN')).toBe(true)
  })

  it('leaves unrelated words that merely share a start alone', () => {
    expect(isWordForm('health', 'HEALS')).toBe(false)
    expect(isWordForm('whaling', 'WHALE')).toBe(false)
    expect(isWordForm('sol', 'SOLAR')).toBe(false)
    expect(isWordForm('the', 'THERAPY')).toBe(false)
  })
})

describe('splitting the good news into parts', () => {
  const fact = 'A single gram of healthy topsoil, about a pinch, typically holds 100 million to a billion bacteria, tiny recyclers that help plants grow.'

  it('keeps every character of the fact, in order', () => {
    for (const entry of wordList) {
      expect(storyText(buildStory(entry.fact, entry.word)), entry.word).toBe(entry.fact)
    }
  })

  it('gives every fact two to four parts, none of them empty', () => {
    for (const entry of wordList) {
      const story = buildStory(entry.fact, entry.word)
      expect(story.length, entry.word).toBeGreaterThanOrEqual(2)
      expect(story.length, entry.word).toBeLessThanOrEqual(4)
      for (const part of story) expect(storyText([part]).trim().length, entry.word).toBeGreaterThan(0)
    }
  })

  it('prefers to break after a comma, like a person reading aloud', () => {
    const story = buildStory(fact, 'TOPSOIL')
    expect(storyText([story[0]]).trim()).toMatch(/,$/)
  })

  it('marks where the word sits, without its punctuation', () => {
    const story = buildStory(fact, 'TOPSOIL')
    const marked = story.flat().filter(piece => piece.word)
    expect(marked).toEqual([{ text: 'topsoil', word: true }])
  })

  it('hides the word while the puzzle is being played, and nothing else', () => {
    const veiled = veilStory(buildStory(fact, 'TOPSOIL'))
    expect(JSON.stringify(veiled)).not.toMatch(/topsoil/i)
    expect(storyText(veiled)).toBe(fact.replace('topsoil', ''))
  })

  it('never lets the word itself slip into the veiled story', () => {
    for (const entry of wordList) {
      const veiled = storyText(veilStory(buildStory(entry.fact, entry.word))).toUpperCase()
      expect(veiled.split(/[^A-Z]+/), entry.word).not.toContain(entry.word)
    }
  })
})

describe('the ladder of things to unfold', () => {
  it('opens on the first part of the story and brings the clue in after the second', () => {
    expect(buildLadder(2)).toEqual([{ kind: 'story', index: 0 }, { kind: 'story', index: 1 }, { kind: 'clue' }])
    expect(buildLadder(4)).toEqual([
      { kind: 'story', index: 0 },
      { kind: 'story', index: 1 },
      { kind: 'clue' },
      { kind: 'story', index: 2 },
      { kind: 'story', index: 3 },
    ])
  })
})

describe('letters', () => {
  it('finds the letters of a guess that sit in the same place as in the word', () => {
    expect(lettersInPlace('COMPOST', 'TOPSOIL')).toEqual([[1, 'O'], [4, 'O']])
    expect(lettersInPlace('compost', 'TOPSOIL')).toEqual([[1, 'O'], [4, 'O']])
    expect(lettersInPlace('QQQQQQQ', 'TOPSOIL')).toEqual([])
  })

  it('offers the first letter not yet known, and nothing once all are known', () => {
    expect(nextLetter('TOPSOIL', [])).toEqual({ position: 0, letter: 'T' })
    expect(nextLetter('TOPSOIL', [0, 1, 3])).toEqual({ position: 2, letter: 'P' })
    expect(nextLetter('SOLAR', [0, 1, 2, 3, 4])).toBeNull()
  })
})

describe('what is said after each guess', () => {
  it('names the guess, the letters newly in place and what unfolded, in the words the page uses', () => {
    expect(describeGuess('COMPOST', [[1, 'O'], [4, 'O']], { kind: 'story', index: 1 })).toBe(
      'COMPOST is not today’s word. Letter 2 is O and letter 5 is O. The story unfolds a little more.'
    )
    expect(describeGuess('GARDENS', [[6, 'S']], { kind: 'clue' })).toBe(
      'GARDENS is not today’s word. Letter 7 is S. The clue is now showing.'
    )
    expect(describeGuess('QUIETLY', [], null)).toBe('QUIETLY is not today’s word.')
    expect(describeGuess('TOPIARY', [[0, 'T'], [1, 'O'], [2, 'P']], { kind: 'letter', position: 3, letter: 'S' })).toBe(
      'TOPIARY is not today’s word. Letter 1 is T, letter 2 is O and letter 3 is P. Letter 4 is S.'
    )
  })

  it('says a shown letter the same way', () => {
    expect(describeLetter({ position: 0, letter: 'T' })).toBe('Letter 1 is T.')
  })
})

describe('restoring today’s progress', () => {
  const saved = {
    version: 2,
    date: TODAY,
    guesses: ['COMPOST'],
    known: [[1, 'O'], [4, 'O']],
    unfolded: 2,
    status: 'playing',
    reveal: null,
  }

  it('brings back a game saved today', () => {
    expect(restoreProgress(saved, TODAY, 7)).toEqual({
      guesses: ['COMPOST'],
      known: [[1, 'O'], [4, 'O']],
      unfolded: 2,
      status: 'playing',
      reveal: null,
    })
  })

  it('sets aside a game from another day, or one that does not fit today’s word', () => {
    expect(restoreProgress({ ...saved, date: '2001-01-01' }, TODAY, 7)).toBeNull()
    expect(restoreProgress(saved, TODAY, 5)).toBeNull()
    expect(restoreProgress('nonsense', TODAY, 7)).toBeNull()
    expect(restoreProgress(null, TODAY, 7)).toBeNull()
  })

  describe('from the earlier letter-grid version', () => {
    const tiles = (word: string, states: string) =>
      word.split('').map((letter, i) => ({ letter, state: { g: 'correct', y: 'present', x: 'absent' }[states[i]] }))

    it('keeps guesses, letters placed by guesses or hints, and how far the player had got', () => {
      const old = {
        date: TODAY,
        guesses: [tiles('GARDENS', 'xxxxxxy'), tiles('COMPOST', 'xgyygyy')],
        gameState: 'playing',
        revealedData: null,
        hintsUsed: 2,
        currentHint: 'The rich upper layer of the ground',
        revealedLetters: [[0, 'T']],
      }
      expect(restoreProgress(old, TODAY, 7)).toEqual({
        guesses: ['GARDENS', 'COMPOST'],
        known: [[0, 'T'], [1, 'O'], [4, 'O']],
        unfolded: 4,
        status: 'playing',
        reveal: null,
      })
    })

    it('keeps a finished day finished, and asks for the good news again', () => {
      const won = { date: TODAY, guesses: [tiles('TOPSOIL', 'ggggggg')], gameState: 'won', revealedData: { word: 'TOPSOIL', fact: 'x', category: 'Nature' } }
      expect(restoreProgress(won, TODAY, 7)).toMatchObject({ status: 'found', reveal: null })

      const lost = { date: TODAY, guesses: [], gameState: 'lost', revealedData: null }
      expect(restoreProgress(lost, TODAY, 7)).toMatchObject({ status: 'shown', reveal: null })
    })

    it('sets aside an old game from another day', () => {
      expect(restoreProgress({ date: '2001-01-01', guesses: [], gameState: 'won' }, TODAY, 7)).toBeNull()
    })
  })
})
