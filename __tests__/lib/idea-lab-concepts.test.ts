import { describe, it, expect } from 'vitest'
import { BASE_CONCEPTS, findKnownCombination, type Concept } from '@/lib/games/idea-lab/concepts'
import { WORKS, isGolden, composeLetter } from '@/lib/games/idea-lab/golds'
import {
  DEFAULT_PROGRESS, HINT_AFTER_TRIES, afterCombination, beginNextWork, parseProgress, parseDiscoveries, parseCombinations, type LabProgress,
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
  const NONE_SOLVED = [false, false, false, false, false, false, false]
  const fresh = (hints = [0, 0, 0, 0, 0, 0, 0]) => ({ work: 0, triesSinceClue: 0, hints })
  const tryWithoutGold = (progress: LabProgress, times: number, solved = NONE_SOLVED) => {
    let next = progress
    for (let i = 0; i < times; i++) next = afterCombination(next, false, solved).progress
    return next
  }

  it('starts a new or damaged save at the first Work with no clues shown', () => {
    expect(parseProgress(null)).toEqual(DEFAULT_PROGRESS)
    expect(parseProgress('{not json')).toEqual(DEFAULT_PROGRESS)
    expect(parseProgress('{"work": 9, "triesSinceClue": -3, "hints": "x"}')).toEqual(DEFAULT_PROGRESS)
    expect(parseProgress('{"work": 0, "triesSinceClue": 1, "hints": [0, 3, 0, 0, 0, 0, 0]}')).toEqual(DEFAULT_PROGRESS)
    expect(parseProgress('{"work": 0, "triesSinceClue": 1, "hints": [0, 1]}')).toEqual(DEFAULT_PROGRESS)
    expect(parseProgress(JSON.stringify({ work: 1, triesSinceClue: 4, hints: [2, 1, 0, 0, 0, 0, 0] })))
      .toEqual({ work: 1, triesSinceClue: 4, hints: [2, 1, 0, 0, 0, 0, 0] })
  })

  it('keeps every clue an earlier save had already shown, now held per riddle', () => {
    expect(parseProgress('{"work": 1, "triesSinceGold": 14, "hintLevel": 2}')).toEqual({ work: 1, triesSinceClue: 0, hints: [2, 2, 2, 2, 2, 2, 2] })
    expect(parseProgress('{"work": 0, "triesSinceGold": 3, "hintLevel": 0}')).toEqual(DEFAULT_PROGRESS)
    expect(parseProgress('{"work": 0, "triesSinceGold": 3, "hintLevel": 7}')).toEqual(DEFAULT_PROGRESS)
  })

  it('makes one riddle plainer after a few tries without gold, and leaves the others alone', () => {
    const before = tryWithoutGold(DEFAULT_PROGRESS, HINT_AFTER_TRIES - 1)
    expect(before.hints).toEqual([0, 0, 0, 0, 0, 0, 0])

    const { progress, clued } = afterCombination(before, false, NONE_SOLVED)
    expect(clued).toBe(0)
    expect(progress.hints).toEqual([1, 0, 0, 0, 0, 0, 0])
    expect(progress.triesSinceClue).toBe(0)
  })

  it('takes the oldest unsolved riddle to its ingredients before starting on the next', () => {
    const solved = [true, false, false, false, false, false, false]
    let progress = tryWithoutGold(DEFAULT_PROGRESS, HINT_AFTER_TRIES, solved)
    expect(progress.hints).toEqual([0, 1, 0, 0, 0, 0, 0])
    progress = tryWithoutGold(progress, HINT_AFTER_TRIES, solved)
    expect(progress.hints).toEqual([0, 2, 0, 0, 0, 0, 0])
    progress = tryWithoutGold(progress, HINT_AFTER_TRIES, solved)
    expect(progress.hints).toEqual([0, 2, 1, 0, 0, 0, 0])
  })

  it('never reveals every riddle at once, however long the player wanders', () => {
    const progress = tryWithoutGold(DEFAULT_PROGRESS, HINT_AFTER_TRIES * 3)
    expect(progress.hints.filter(level => level > 0)).toHaveLength(2)
  })

  it('a gold restarts the count but never takes a clue back', () => {
    const { progress, clued } = afterCombination({ work: 0, triesSinceClue: HINT_AFTER_TRIES - 1, hints: [2, 1, 0, 0, 0, 0, 0] }, true, NONE_SOLVED)
    expect(clued).toBeNull()
    expect(progress).toEqual({ work: 0, triesSinceClue: 0, hints: [2, 1, 0, 0, 0, 0, 0] })
  })

  it('has nothing left to offer once every unsolved riddle names its ingredients', () => {
    const allShown = fresh([2, 2, 2, 2, 2, 2, 2])
    const { progress, clued } = afterCombination({ ...allShown, triesSinceClue: HINT_AFTER_TRIES - 1 }, false, NONE_SOLVED)
    expect(clued).toBeNull()
    expect(progress.hints).toEqual(allShown.hints)
  })

  it('a new Work starts its riddles fresh', () => {
    expect(beginNextWork({ work: 0, triesSinceClue: 3, hints: [2, 2, 1, 0, 0, 0, 0] })).toEqual({ work: 1, triesSinceClue: 0, hints: [0, 0, 0, 0, 0, 0, 0] })
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
