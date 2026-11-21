import { readingLine, type ChosenValue, type Theme } from '@/lib/games/hard-choices/reading'

const value = (theme: Theme, i: number): ChosenValue => ({ value: `${theme}-${i}`, theme })
const mix = (counts: Partial<Record<Theme, number>>) =>
  Object.entries(counts).flatMap(([theme, n]) => Array.from({ length: n }, (_, i) => value(theme as Theme, i)))

describe('readingLine: one kind line about which pulls kept returning', () => {
  it('says gently when every question was let pass', () => {
    expect(readingLine([])).toBe('Every question was let pass today. Some days are like that.')
  })

  it('calls one or two answers a glimpse rather than a pattern', () => {
    expect(readingLine(mix({ ease: 1, others: 1 }))).toBe('A glimpse rather than a pattern: a few things mattered today.')
  })

  it('names the one pull that returned most', () => {
    expect(readingLine(mix({ others: 4, ease: 2, growth: 2 }))).toBe('What kept returning today was the people around you.')
  })

  it('names two pulls that returned equally', () => {
    expect(readingLine(mix({ ease: 2, others: 2 }))).toBe('Two pulls kept returning today: things feeling good and settled, and the people around you.')
  })

  it('says each question was weighed on its own when three or more pulls tie', () => {
    expect(readingLine(mix({ ease: 1, growth: 1, others: 1 }))).toBe('Your answers spread wide today: each question was weighed on its own.')
  })

  it('never counts or scores the answers', () => {
    for (const counts of [{ ease: 5 }, { growth: 3, self: 3 }, { ease: 2, growth: 2, others: 2, self: 2 }]) {
      expect(readingLine(mix(counts))).not.toMatch(/\d/)
    }
  })
})
