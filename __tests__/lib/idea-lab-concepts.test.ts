import { describe, it, expect } from 'vitest'
import { BASE_CONCEPTS, GOLDEN_IDEAS, findKnownCombination, isGolden } from '@/lib/games/idea-lab/concepts'

describe('The Alchemist curated concepts', () => {
  it('lets every golden idea be reached from the starting concepts through curated pairs alone', () => {
    const reachable = new Set(BASE_CONCEPTS.map(concept => concept.name))
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

    for (const golden of GOLDEN_IDEAS) expect(reachable, golden.name).toContain(golden.name)
  })

  it('offers seven golden ideas, each with a riddle that names no answer', () => {
    expect(GOLDEN_IDEAS).toHaveLength(7)
    for (const golden of GOLDEN_IDEAS) {
      expect(golden.riddle.toLowerCase()).not.toContain(golden.name.toLowerCase())
    }
  })

  it('finds a curated pair in either order and ignores case', () => {
    expect(findKnownCombination('fear', 'LOVE')?.name).toBe('Jealousy')
    expect(findKnownCombination('Love', 'Fear')?.name).toBe('Jealousy')
    expect(findKnownCombination('Love', 'Toast')).toBeUndefined()
  })

  it('recognises a golden idea by name whatever its case', () => {
    expect(isGolden('healing')).toBe(true)
    expect(isGolden('Jealousy')).toBe(false)
  })
})
