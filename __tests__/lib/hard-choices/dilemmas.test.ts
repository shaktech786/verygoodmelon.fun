import { describe, it, expect } from 'vitest'
import { DILEMMAS } from '@/lib/games/hard-choices/dilemmas'
import { THEMES } from '@/lib/games/hard-choices/reading'

const textOf = (d: (typeof DILEMMAS)[number]) =>
  [d.scenario, d.context, d.carry, d.category, d.choiceA.text, d.choiceA.perspective, d.choiceA.value,
    d.choiceB.text, d.choiceB.perspective, d.choiceB.value].join(' ')

describe('the twelve dilemmas', () => {
  it('has twelve, each with a unique id', () => {
    expect(DILEMMAS).toHaveLength(12)
    expect(new Set(DILEMMAS.map((d) => d.id)).size).toBe(12)
  })

  it('keeps the ids that stored answers and vote counts already use, with their sides unchanged', () => {
    const byId = Object.fromEntries(DILEMMAS.map((d) => [d.id, d]))
    expect(byId['happiness-vs-meaning'].choiceA.value).toBe('Joy')
    expect(byId['career-passion'].choiceB.value).toBe('Purpose')
    expect(byId['love-or-freedom'].choiceA.value).toBe('Devotion')
    expect(byId['radical-honesty'].choiceB.value).toBe('Privacy')
    expect(byId['forgiveness-limits'].choiceA.value).toBe('Peace')
  })

  it('stays with everyday life: no deaths, trains, simulations or worries the visitor did not bring', () => {
    for (const d of DILEMMAS) {
      expect(textOf(d)).not.toMatch(/\b(die|dies|dying|death|dead|kill|train|simulation|climate|oracle|erase|final year|terminal)\b/i)
    }
  })

  it('uses commas or colons, never em dashes', () => {
    for (const d of DILEMMAS) expect(textOf(d)).not.toContain('—')
  })

  it('gives every value a theme, and every theme several chances to recur', () => {
    const themes = DILEMMAS.flatMap((d) => [d.choiceA.theme, d.choiceB.theme])
    for (const theme of THEMES) expect(themes.filter((t) => t === theme).length).toBeGreaterThanOrEqual(4)
    for (const d of DILEMMAS) expect(d.choiceA.theme).not.toBe(d.choiceB.theme)
  })

  it('names categories as they should be read aloud', () => {
    for (const d of DILEMMAS) expect(d.category).toMatch(/^[A-Z][a-z]+$/)
  })

  it('ends light: the last two are small everyday choices', () => {
    expect(DILEMMAS.slice(-2).map((d) => d.id)).toEqual(['empty-weekend', 'last-slice'])
  })
})
