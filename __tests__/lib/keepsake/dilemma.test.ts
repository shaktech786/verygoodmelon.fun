import { dilemmaConstellation, dilemmaKeepsake } from '@/lib/keepsake/dilemma'
import type { ChosenValue } from '@/lib/games/hard-choices/reading'

const DAY = new Date(2026, 10, 21)
const CHOSEN: ChosenValue[] = [
  { value: 'Rest', theme: 'ease' },
  { value: 'Friendship', theme: 'others' },
  { value: 'Peace', theme: 'ease' },
  { value: 'Challenge', theme: 'growth' },
  { value: 'Contentment', theme: 'ease' },
]

const words = (plan: ReturnType<typeof dilemmaKeepsake>) => plan.ops.flatMap((op) => (op.kind === 'text' ? [op.text] : []))

describe('dilemmaConstellation: one star per value, gathered by theme', () => {
  it('draws one cluster per theme reached for, in a steady order, each holding its values', () => {
    const clusters = dilemmaConstellation(CHOSEN)
    expect(clusters.map((c) => c.title)).toEqual(['Feeling settled', 'Stretching further', 'The people around you'])
    expect(clusters.map((c) => c.stars.map((s) => s.value))).toEqual([['Rest', 'Peace', 'Contentment'], ['Challenge'], ['Friendship']])
  })

  it('places every star inside the sky, columns running left to right', () => {
    const clusters = dilemmaConstellation(CHOSEN)
    for (const star of clusters.flatMap((c) => c.stars)) {
      expect(star.x).toBeGreaterThan(84)
      expect(star.x).toBeLessThan(996)
      expect(star.y).toBeGreaterThan(300)
      expect(star.labelY).toBeLessThan(960)
    }
    expect(clusters[0].x).toBeLessThan(clusters[1].x)
    expect(clusters[1].x).toBeLessThan(clusters[2].x)
  })

  it('keeps a dozen values in one theme inside the sky', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ value: `Value ${i}`, theme: 'self' as const }))
    const [cluster] = dilemmaConstellation(many)
    expect(cluster.stars).toHaveLength(12)
    expect(Math.max(...cluster.stars.map((s) => s.labelY))).toBeLessThan(960)
  })

  it('sets the names large enough to read when the picture is phone-sized, and never wider than their column', () => {
    // About 22rem wide on a phone: 352 of the picture's 1080 units
    const onPhone = (size: number) => (size * 352) / 1080
    for (const star of dilemmaConstellation(CHOSEN).flatMap((c) => c.stars)) {
      expect(onPhone(star.labelSize)).toBeGreaterThanOrEqual(10)
    }
    expect(onPhone(dilemmaConstellation([{ value: 'Rest', theme: 'ease' }])[0].stars[0].labelSize)).toBeGreaterThanOrEqual(13)
    const all = [
      { value: 'Encouragement', theme: 'others' as const }, { value: 'Self-kindness', theme: 'self' as const },
      { value: 'Contentment', theme: 'ease' as const }, { value: 'Challenge', theme: 'growth' as const },
    ]
    for (const star of dilemmaConstellation(all).flatMap((c) => c.stars)) {
      expect(star.value.length * star.labelSize * 0.55).toBeLessThanOrEqual((1080 - 168) / 4)
    }
  })

  it('draws the same sky for the same answers', () => {
    expect(dilemmaKeepsake({ chosen: CHOSEN, day: DAY })).toEqual(dilemmaKeepsake({ chosen: CHOSEN, day: DAY }))
  })
})

describe('dilemmaKeepsake: the picture and its words', () => {
  const plan = dilemmaKeepsake({ chosen: CHOSEN, day: DAY })

  it('names each value on the picture with one reading line, and no tallies', () => {
    const shown = words(plan)
    for (const { value } of CHOSEN) expect(shown).toContain(value)
    expect(shown).toContain('What kept returning today was things feeling good and settled.')
    expect(shown.join(' ')).not.toMatch(/\d+ (of|out of|answers|values|questions)|score/i)
  })

  it('describes the sky for screen readers, theme by theme', () => {
    expect(plan.alt).toContain('Feeling settled: Rest, Peace, Contentment')
    expect(plan.alt).toContain('The people around you: Friendship')
  })

  it('copies the same visit as plain words and saves under the game and day', () => {
    expect(plan.text).toContain('Stretching further: Challenge')
    expect(plan.fileName).toBe('the-dilemma-2026-11-21.png')
  })

  it('shows a quiet moon when every question was let pass', () => {
    const empty = dilemmaKeepsake({ chosen: [], day: DAY })
    expect(empty.alt).toMatch(/crescent moon/)
    expect(words(empty)).toContain('Every question was let pass today. Some days are like that.')
  })
})
