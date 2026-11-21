import { describe, it, expect } from 'vitest'
import { readChoices, THEMES, type Theme, type ChosenValue } from '@/lib/games/hard-choices/reading'

const pick = (theme: Theme, n: number): ChosenValue[] =>
  Array.from({ length: n }, (_, i) => ({ value: `${theme}-${i + 1}`, theme }))

const mix = (counts: Partial<Record<Theme, number>>): ChosenValue[] =>
  THEMES.flatMap((theme) => pick(theme, counts[theme] ?? 0))

const UNKIND = /\b(should|must|wrong|fail\w*|bad|weak|selfish|naive|too much|not enough)\b/i

describe('readChoices: a short reading of what the choices protect', () => {
  it('has nothing to read when every question was let pass', () => {
    expect(readChoices([])).toEqual([])
  })

  it('calls one or two answers a glimpse rather than a pattern, naming them', () => {
    const [line, ...rest] = readChoices([{ value: 'Joy', theme: 'ease' }])
    expect(rest).toEqual([])
    expect(line).toMatch(/glimpse/i)
    expect(line).toContain('Joy')

    const two = readChoices([{ value: 'Joy', theme: 'ease' }, { value: 'Devotion', theme: 'others' }])
    expect(two).toHaveLength(1)
    expect(two[0]).toContain('Joy and Devotion')
  })

  it('names the pull that recurred and the values that lean that way', () => {
    const lines = readChoices([
      { value: 'Joy', theme: 'ease' },
      { value: 'Security', theme: 'ease' },
      { value: 'Rest', theme: 'ease' },
      { value: 'Candour', theme: 'growth' },
    ])
    expect(lines[0]).toMatch(/settled/)
    expect(lines[0]).toContain('Joy, Security and Rest')
  })

  it('names two pulls that recurred equally when they sit together', () => {
    const lines = readChoices(mix({ others: 3, ease: 3 }))
    expect(lines[0]).toContain('settled (ease-1, ease-2 and ease-3)')
    expect(lines[0]).toContain('the people around you (others-1, others-2 and others-3)')
  })

  it('reflects values that pulled against each other, without calling it indecision', () => {
    const lines = readChoices(mix({ others: 3, self: 3, ease: 1 }))
    const all = lines.join(' ')
    expect(all).toMatch(/people around you/)
    expect(all).toMatch(/own footing/)
    expect(all).toMatch(/not indecision|both/i)
  })

  it('mentions a close tension on the other axis as a second line', () => {
    const lines = readChoices(mix({ others: 4, ease: 2, growth: 2 }))
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatch(/people around you/)
    expect(lines[1]).toMatch(/rest|settled/i)
    expect(lines[1]).toMatch(/stretch/i)
  })

  it('notices a side that never came up and reads it kindly', () => {
    const lines = readChoices(mix({ growth: 4, others: 1 }))
    expect(lines).toHaveLength(2)
    expect(lines[1]).toMatch(/settled/)
    expect(lines[1]).toMatch(/already|another day/i)
  })

  it('says so when answers spread evenly with no single pull', () => {
    const lines = readChoices(mix({ ease: 1, growth: 1, others: 1 }))
    expect(lines[0]).toMatch(/spread|on its own/i)
  })

  it('is deterministic: the same answers always read the same', () => {
    const answers = mix({ ease: 2, growth: 3, others: 1, self: 2 })
    expect(readChoices(answers)).toEqual(readChoices([...answers]))
  })

  it('reads every possible combination of twelve answers in one to three kind, complete sentences', () => {
    let combinations = 0
    for (let e = 0; e <= 12; e++)
      for (let g = 0; e + g <= 12; g++)
        for (let o = 0; e + g + o <= 12; o++)
          for (let s = 0; e + g + o + s <= 12; s++) {
            const chosen = mix({ ease: e, growth: g, others: o, self: s })
            const lines = readChoices(chosen)
            combinations++
            if (chosen.length === 0) {
              expect(lines).toEqual([])
              continue
            }
            expect(lines.length).toBeGreaterThanOrEqual(1)
            expect(lines.length).toBeLessThanOrEqual(3)
            expect(new Set(lines).size).toBe(lines.length)
            for (const line of lines) {
              expect(line).toMatch(/^[A-Z].*[.]$/)
              expect(line).not.toMatch(/undefined|null|NaN|—|\s{2}/)
              expect(line).not.toMatch(UNKIND)
              expect(line.split(/\s+/).length).toBeLessThanOrEqual(45)
            }
          }
    expect(combinations).toBe(1820)
  })
})
