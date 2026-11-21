import { describe, it, expect } from 'vitest'
import { countWords } from '@/lib/games/wordFrequency'

describe('countWords', () => {
  it('counts meaningful words across submissions, most common first', () => {
    expect(countWords(['I love you all', 'Love the garden', 'Remember love'])).toEqual([
      { word: 'love', count: 3 },
      { word: 'garden', count: 1 },
      { word: 'remember', count: 1 },
    ])
  })

  it('keeps words in any script and drops emoji and punctuation', () => {
    expect(countWords(['спасибо, друзья! 🍉 ありがとう']).map((w) => w.word)).toEqual(
      ['ありがとう', 'друзья', 'спасибо'].sort((a, b) => a.localeCompare(b))
    )
  })

  it('does not turn markup-looking text into cloud words', () => {
    expect(countWords(['<script>alert(1)</script> <img src=x onerror=y> remember me']).map((w) => w.word)).toEqual([
      'alert',
      'remember',
    ])
  })

  it('keeps contractions whole and ignores bare numbers', () => {
    expect(countWords(['We’re fine, 2024 forever']).map((w) => w.word)).toEqual(['fine', 'forever', 'we\'re'])
  })

  it('returns at most 50 words', () => {
    const many = Array.from({ length: 80 }, (_, i) => `word${String.fromCharCode(97 + (i % 26))}${i}`)
    expect(countWords(many)).toHaveLength(50)
  })
})
