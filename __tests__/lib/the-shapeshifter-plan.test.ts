import { describe, it, expect } from 'vitest'
import { planRun, planOrder } from '@/app/games/the-mutation/engine/plan'
import { MECHANIC_OPTIONS } from '@/app/games/the-mutation/engine/types'

/** A repeatable stand-in for Math.random. */
function seeded(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

describe('The Shapeshifter run plan', () => {
  it('always learns to move first, finds something to gather second, and blooms last', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const plan = planRun(seeded(seed), false)
      expect(plan).toHaveLength(6)
      expect(plan[0].category).toBe('movement')
      expect(plan[1].category).toBe('collectible')
      expect(plan[5].category).toBe('climax')
      expect(plan.slice(2, 5).map(step => step.category).sort()).toEqual(['modifier', 'power', 'threat'])
    }
  })

  it('offers every rule of a step, with the one this run leans toward first', () => {
    for (let seed = 1; seed <= 20; seed++) {
      for (const step of planRun(seeded(seed), false)) {
        expect([...step.options].sort()).toEqual([...MECHANIC_OPTIONS[step.category]].sort())
      }
    }
  })

  it('only offers touch players a way of moving they can use', () => {
    for (let seed = 1; seed <= 10; seed++) expect(planRun(seeded(seed), true)[0].options).toEqual(['mouse_follow'])
  })

  it('varies which rules arrive, and in what order, from run to run', () => {
    const leanings = new Set(Array.from({ length: 60 }, (_, i) => planRun(seeded(i + 1), false).map(s => s.options[0]).join()))
    expect(leanings.size).toBeGreaterThan(20)
    const orders = new Set(Array.from({ length: 60 }, (_, i) => planRun(seeded(i + 1), false).map(s => s.category).join()))
    expect(orders.size).toBe(6)
  })

  it('never brings the rules in the same order as the run before it, even when chance would', () => {
    const always = () => 0
    const first = planRun(always, false)
    const next = planRun(always, false, planOrder(first))
    expect(planOrder(next)).not.toBe(planOrder(first))
    for (let seed = 1; seed <= 30; seed++) {
      const previous = planOrder(planRun(seeded(seed), false))
      expect(planOrder(planRun(seeded(seed + 100), false, previous))).not.toBe(previous)
    }
  })
})
