import { followedPattern, harmonistKeepsake, keepsakeMelon, openedMelon, restingLid } from '@/lib/keepsake/harmonist'
import { SEED } from '@/lib/keepsake/plan'
import type { Breath } from '@/lib/games/breathing-patterns/melon'

const DAY = new Date(2026, 10, 21, 10, 5)
const breaths = (pattern: Breath['pattern'], seconds: number, n: number): Breath[] =>
  Array.from({ length: n }, () => ({ pattern, seconds }))

const words = (plan: ReturnType<typeof harmonistKeepsake>) => plan.ops.flatMap((op) => (op.kind === 'text' ? [op.text] : []))
const seedOps = (plan: ReturnType<typeof harmonistKeepsake>) => plan.ops.filter((op) => op.kind === 'ellipse' && op.ink === SEED)

describe('openedMelon: cut along the shape the breath followed', () => {
  it('cuts a square for Box Breathing, a triangle for 4-7-8 and the sigh, a circle for coherent breathing', () => {
    expect(openedMelon(breaths('box', 16, 3), [0, 0], 100).cut).toHaveLength(4)
    expect(openedMelon(breaths('478', 19, 3), [0, 0], 100).cut).toHaveLength(3)
    expect(openedMelon(breaths('sigh', 11, 3), [0, 0], 100).cut).toHaveLength(3)
    const round = openedMelon(breaths('coherent', 11, 3), [0, 0], 100)
    expect(round.shape).toBe('circle')
    const radii = round.cut.map(([x, y]) => Math.hypot(x, y))
    expect(Math.max(...radii) - Math.min(...radii)).toBeLessThan(0.001)
  })

  it('draws free breathing as a shape of its own, swelling where the marked breaths were long', () => {
    const even = openedMelon(breaths('free', 5, 6), [0, 0], 100)
    const uneven = openedMelon([3, 9, 4, 12, 3, 6].map((seconds) => ({ pattern: 'free' as const, seconds })), [0, 0], 100)
    expect(uneven.shape).toBe('own')
    const spread = (m: typeof even) => {
      const radii = m.cut.map(([x, y]) => Math.hypot(x, y))
      return Math.max(...radii) - Math.min(...radii)
    }
    expect(spread(even)).toBeLessThan(0.001)
    expect(spread(uneven)).toBeGreaterThan(5)
  })

  it('follows the rhythm most breaths were taken in, a tie going to the last one', () => {
    expect(followedPattern([...breaths('box', 16, 3), ...breaths('coherent', 11, 1)])).toBe('box')
    expect(followedPattern([...breaths('box', 16, 2), ...breaths('coherent', 11, 2)])).toBe('coherent')
  })

  it('sets one seed per breath, every one inside the opened flesh and the cut inside the rind', () => {
    for (const pattern of ['box', '478', 'coherent', 'sigh', 'free'] as const) {
      const melon = openedMelon(breaths(pattern, 12, 21), [500, 500], 200)
      expect(melon.seeds).toHaveLength(21)
      for (const [x, y] of melon.cut) expect(Math.hypot(x - 500, y - 500)).toBeLessThan(200)
      const fleshReach = Math.min(...melon.flesh.map(([x, y]) => Math.hypot(x - 500, y - 500)))
      // A polygon's points are its corners, so its sides come closer to the centre than they do.
      const inner = pattern === 'box' ? fleshReach * Math.cos(Math.PI / 4) : pattern === '478' || pattern === 'sigh' ? fleshReach / 2 : fleshReach
      for (const seed of melon.seeds) expect(Math.hypot(seed.x - 500, seed.y - 500) + seed.ry).toBeLessThan(inner + 1)
    }
  })

  it('lifts the cut piece clear of the hole it came from', () => {
    for (const pattern of ['box', '478', 'coherent', 'free'] as const) {
      const melon = openedMelon(breaths(pattern, 12, 5), [500, 500], 200)
      const lid = restingLid(melon)
      const lidCentre = lid.reduce(([sx, sy], [x, y]) => [sx + x / lid.length, sy + y / lid.length], [0, 0])
      const holeReach = Math.max(...melon.cut.map(([x, y]) => Math.hypot(x - 500, y - 500)))
      expect(Math.hypot(lidCentre[0] - 500, lidCentre[1] - 500)).toBeGreaterThanOrEqual(2 * holeReach - 1)
    }
  })
})

describe('harmonistKeepsake', () => {
  it('draws one seed per breath and names the shape and the rhythm', () => {
    const plan = harmonistKeepsake({ breaths: breaths('box', 16, 7), day: DAY })
    expect(seedOps(plan)).toHaveLength(7)
    expect(words(plan)).toContain('Opened along a square: the shape of Box Breathing.')
    expect(words(plan)).toContain('Each seed is a breath you finished.')
    expect(plan.alt).toMatch(/cut open along a square/)
    expect(plan.text).toContain('Box Breathing')
  })

  it('names every rhythm breathed in a mixed session, and marked breaths as marked', () => {
    const mixed = harmonistKeepsake({ breaths: [...breaths('box', 16, 3), ...breaths('coherent', 11, 1)], day: DAY })
    expect(words(mixed)).toContain('Each seed is a breath you finished, in Box Breathing and Coherent Breathing.')
    const free = harmonistKeepsake({ breaths: breaths('free', 6, 4), day: DAY })
    expect(words(free)).toContain('Opened along a shape of your own, drawn by the breaths you marked.')
    expect(words(free)).toContain('Each seed is a breath you marked.')
  })

  it('centres the melon and its piece across the page, the piece turned over to show its cut face', () => {
    for (const pattern of ['box', '478', 'coherent', 'free'] as const) {
      const plan = harmonistKeepsake({ breaths: breaths(pattern, pattern === 'free' ? 5 : 12, 6), day: DAY })
      const rind = plan.ops.find((op) => op.kind === 'disc' && op.ink === 'rind')
      const pieces = plan.ops.filter((op) => op.kind === 'poly' && op.alpha === undefined)
      const xs = pieces.flatMap((op) => (op.kind === 'poly' ? op.points.map(([x]) => x) : []))
      if (rind?.kind !== 'disc') throw new Error('no melon')
      const left = Math.min(rind.x - rind.r, ...xs)
      const right = Math.max(rind.x + rind.r, ...xs)
      expect(Math.abs((left + right) / 2 - 540)).toBeLessThan(2)
      expect(left).toBeGreaterThan(84)
      expect(right).toBeLessThan(996)
      // Two flesh shapes above the signature's little slice: the open hole and the cut face of the piece
      expect(plan.ops.filter((op) => op.kind === 'poly' && op.ink === 'flesh' && op.points.every(([, y]) => y < 1150))).toHaveLength(2)
    }
  })

  it('never tallies the breaths as a score', () => {
    const plan = harmonistKeepsake({ breaths: breaths('478', 19, 12), day: DAY })
    for (const line of [...words(plan), plan.alt, plan.text]) expect(line).not.toMatch(/\b12\b|\bscore|\bstreak/i)
  })

  it('is the same picture for the same session, saved under the game and the day', () => {
    const session = breaths('sigh', 11, 5)
    expect(harmonistKeepsake({ breaths: session, day: DAY })).toEqual(harmonistKeepsake({ breaths: session.map((b) => ({ ...b })), day: DAY }))
    expect(harmonistKeepsake({ breaths: session, day: DAY }).fileName).toBe('the-harmonist-2026-11-21.png')
  })

  it('places the melon where the game opens it, so the opening on screen lands exactly on the saved picture', () => {
    const session = breaths('box', 16, 4)
    const melon = keepsakeMelon(session)
    const plan = harmonistKeepsake({ breaths: session, day: DAY })
    const rind = plan.ops.find((op) => op.kind === 'disc' && op.ink === 'rind')
    if (rind?.kind !== 'disc') throw new Error('no melon')
    expect([rind.x, rind.y, rind.r]).toEqual([...melon.centre, melon.radius])
    expect(plan.ops.filter((op) => op.kind === 'ellipse' && op.ink === SEED).map((op) => op.kind === 'ellipse' && op.x)).toEqual(melon.seeds.map((s) => s.x))
  })
})
