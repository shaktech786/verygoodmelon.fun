import { describe, it, expect, afterEach, vi } from 'vitest'
import { getThinkerById, pickRandomThinker, thinkers } from '@/lib/games/timeless-minds/thinkers'

const everyDraw = (count: number) => Array.from({ length: count }, (_, i) => (i + 0.5) / count)

function allPicks(options: Parameters<typeof pickRandomThinker>[0] = {}) {
  const random = vi.spyOn(Math, 'random')
  return everyDraw(thinkers.length * 3).map(value => {
    random.mockReturnValue(value)
    return pickRandomThinker(options)
  })
}

describe('choosing a thinker at random', () => {
  afterEach(() => vi.restoreAllMocks())

  it('never opens with someone who died by suicide or whose story centres on despair', () => {
    for (const id of ['vincent-van-gogh', 'virginia-woolf']) {
      expect(getThinkerById(id)?.randomPick).toBe('deliberate')
    }
    const picked = new Set(allPicks().map(t => t.id))
    expect(picked.has('vincent-van-gogh')).toBe(false)
    expect(picked.has('virginia-woolf')).toBe(false)
    expect(picked.size).toBeGreaterThan(20)
  })

  it('keeps those thinkers in the directory for anyone who chooses them', () => {
    expect(thinkers.map(t => t.id)).toEqual(expect.arrayContaining(['vincent-van-gogh', 'virginia-woolf']))
  })

  it('offers only calm, warm company once someone may be struggling', () => {
    const picks = allPicks({ care: true })
    expect(picks.every(t => t.randomPick === 'calm')).toBe(true)
    expect(new Set(picks.map(t => t.id)).size).toBeGreaterThanOrEqual(8)
  })

  it('never brings the same thinker straight back', () => {
    const socrates = getThinkerById('socrates')!
    expect(allPicks({ exclude: socrates }).some(t => t.id === 'socrates')).toBe(false)
    const buddha = getThinkerById('buddha')!
    expect(allPicks({ exclude: buddha, care: true }).some(t => t.id === 'buddha')).toBe(false)
  })

  it('opens every thinker with their own words, not a famous quotation', () => {
    for (const thinker of thinkers) {
      expect(thinker.openingLine).not.toMatch(/["“”]/)
    }
    expect(getThinkerById('socrates')?.openingLine).not.toMatch(/I know that I know nothing/i)
    expect(getThinkerById('nelson-mandela')?.openingLine).not.toMatch(/impossible until it/i)
  })
})
