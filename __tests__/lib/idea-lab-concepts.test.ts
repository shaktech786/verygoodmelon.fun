import { describe, it, expect } from 'vitest'
import { BASE_CONCEPTS, findKnownCombination, type Concept } from '@/lib/games/idea-lab/concepts'
import { WORKS, isGolden, composeLetter } from '@/lib/games/idea-lab/golds'
import {
  DEFAULT_PROGRESS, HINT_AFTER_TRIES, afterCombination, beginNextWork, parseProgress, parseDiscoveries, parseCombinations,
} from '@/lib/games/idea-lab/progress'

const BASE_NAMES = BASE_CONCEPTS.map(concept => concept.name)

function reachableFromBase(): Set<string> {
  const reachable = new Set(BASE_NAMES)
  let grew = true
  while (grew) {
    grew = false
    const names = [...reachable]
    for (const first of names) {
      for (const second of names) {
        const result = first === second ? undefined : findKnownCombination(first, second)
        if (result && !reachable.has(result.name)) {
          reachable.add(result.name)
          grew = true
        }
      }
    }
  }
  return reachable
}

const found = (...names: string[]): Concept[] => names.map(name => ({ id: name.toLowerCase(), name, emoji: '✨' }))

describe('The Alchemist curated concepts', () => {
  it('answers every pair of starting ideas by hand, so the first steps never wait on anything', () => {
    for (const first of BASE_NAMES) {
      for (const second of BASE_NAMES) {
        if (first === second) continue
        const result = findKnownCombination(first, second)
        expect(result, `${first} + ${second}`).toBeDefined()
        expect(BASE_NAMES).not.toContain(result?.name)
      }
    }
  })

  it('finds a curated pair in either order and ignores case', () => {
    expect(findKnownCombination('fear', 'LOVE')?.name).toBe('Jealousy')
    expect(findKnownCombination('Love', 'Fear')?.name).toBe('Jealousy')
    expect(findKnownCombination('Love', 'Toast')).toBeUndefined()
  })

  it('writes each curated line as a short thought, not a definition', () => {
    for (const first of BASE_NAMES) {
      for (const second of BASE_NAMES) {
        const result = first === second ? undefined : findKnownCombination(first, second)
        if (!result) continue
        expect(result.description.split(/\s+/).length, result.name).toBeLessThanOrEqual(18)
        expect(result.description, result.name).toMatch(/[.!?]$/)
      }
    }
  })
})

describe('The Alchemist golds', () => {
  it('has two Works of seven golds, none shared', () => {
    expect(WORKS).toHaveLength(2)
    for (const work of WORKS) expect(work).toHaveLength(7)
    const names = WORKS.flat().map(gold => gold.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('lets every gold be reached from the starting ideas through curated pairs alone', () => {
    const reachable = reachableFromBase()
    for (const gold of WORKS.flat()) expect(reachable, gold.name).toContain(gold.name)
  })

  it('keeps every gold except one at least two steps away, so the riddles are worth solving', () => {
    const fromBase = new Set<string>()
    for (const first of BASE_NAMES) {
      for (const second of BASE_NAMES) {
        const result = first === second ? undefined : findKnownCombination(first, second)
        if (result) fromBase.add(result.name)
      }
    }
    const direct = WORKS.flat().filter(gold => fromBase.has(gold.name)).map(gold => gold.name)
    expect(direct).toEqual(['Courage'])
  })

  it('opens each gold with a riddle that names no idea on the board and no answer', () => {
    const words = [...BASE_NAMES, ...WORKS.flat().map(gold => gold.name)].map(name => name.toLowerCase())
    for (const gold of WORKS.flat()) {
      const riddle = gold.riddles[0].toLowerCase()
      for (const word of words) expect(riddle, `${gold.name}: ${word}`).not.toMatch(new RegExp(`\\b${word}\\b`))
    }
  })

  it('ends each hint ladder by naming the two ingredients, so nobody stays stuck', () => {
    for (const gold of WORKS.flat()) {
      expect(gold.riddles).toHaveLength(3)
      const [first, second] = gold.ingredients
      expect(findKnownCombination(first, second)?.name, gold.name).toBe(gold.name)
      expect(gold.riddles[2]).toContain(first)
      expect(gold.riddles[2]).toContain(second)
    }
  })

  it('recognises a gold of the current Work by name whatever its case', () => {
    expect(isGolden('healing', 0)).toBe(true)
    expect(isGolden('Joy', 0)).toBe(false)
    expect(isGolden('joy', 1)).toBe(true)
    expect(isGolden('Jealousy', 0)).toBe(false)
  })
})

describe('The Alchemist letter', () => {
  const firstWork = found('Jealousy', 'Courage', 'Grief', 'Healing', 'Anxiety', 'Patience', 'Acceptance', 'Empathy',
    'Understanding', 'Compassion', 'Mortality', 'Legacy', 'Meaning', 'Vulnerability', 'Trust', 'Intimacy', 'Wisdom', 'Virtue')

  it('tells the golds back in the order the player found them', () => {
    const letter = composeLetter(0, firstWork)
    expect(letter.lines).toHaveLength(7)
    expect(letter.lines[0].text).toMatch(/^First, you found Courage/)
    expect(letter.lines[1].text).toContain('Healing')
    expect(letter.lines[6].text).toMatch(/^And last, you found Virtue/)
  })

  it('remembers the first thing the player made and how many discoveries it took', () => {
    const letter = composeLetter(0, firstWork)
    expect(letter.closing.join(' ')).toContain('Jealousy')
    expect(letter.closing.join(' ')).toContain('18 discoveries')
  })

  it('reads differently for a different journey', () => {
    const other = found('Wisdom', 'Courage', 'Virtue', 'Mortality', 'Legacy', 'Meaning', 'Grief', 'Healing', 'Anxiety',
      'Patience', 'Acceptance', 'Empathy', 'Understanding', 'Compassion', 'Vulnerability', 'Trust', 'Intimacy')
    expect(composeLetter(0, other).lines).not.toEqual(composeLetter(0, firstWork).lines)
  })
})

describe('The Alchemist progress', () => {
  it('starts a new or damaged save at the first Work with no clues shown', () => {
    expect(parseProgress(null)).toEqual(DEFAULT_PROGRESS)
    expect(parseProgress('{not json')).toEqual(DEFAULT_PROGRESS)
    expect(parseProgress('{"work": 9, "triesSinceGold": -3, "hintLevel": "x"}')).toEqual(DEFAULT_PROGRESS)
    expect(parseProgress('{"work": 1, "triesSinceGold": 4, "hintLevel": 1}')).toEqual({ work: 1, triesSinceGold: 4, hintLevel: 1 })
  })

  it('offers a plainer clue after a few tries without gold, then the ingredients, and never takes a clue back', () => {
    let progress = DEFAULT_PROGRESS
    for (let i = 0; i < HINT_AFTER_TRIES[0] - 1; i++) progress = afterCombination(progress, false)
    expect(progress.hintLevel).toBe(0)
    progress = afterCombination(progress, false)
    expect(progress.hintLevel).toBe(1)
    while (progress.triesSinceGold < HINT_AFTER_TRIES[1]) progress = afterCombination(progress, false)
    expect(progress.hintLevel).toBe(2)

    progress = afterCombination(progress, true)
    expect(progress).toMatchObject({ triesSinceGold: 0, hintLevel: 2 })
  })

  it('a new Work starts its riddles fresh', () => {
    expect(beginNextWork({ work: 0, triesSinceGold: 7, hintLevel: 2 })).toEqual({ work: 1, triesSinceGold: 0, hintLevel: 0 })
  })

  it('keeps loading discoveries saved by earlier versions of the lab and drops anything damaged', () => {
    const saved = JSON.stringify([
      { id: 'grief', name: 'Grief', emoji: '💔', description: 'Old wording.' },
      { id: 'odd', name: 42 },
      'nonsense',
    ])
    expect(parseDiscoveries(saved)).toEqual([{ id: 'grief', name: 'Grief', emoji: '💔', description: 'Old wording.' }])
    expect(parseDiscoveries('{not json')).toEqual([])
    expect(parseCombinations('{"fear+love":"jealousy","x":3}')).toEqual({ 'fear+love': 'jealousy' })
    expect(parseCombinations('"also wrong"')).toEqual({})
  })
})
