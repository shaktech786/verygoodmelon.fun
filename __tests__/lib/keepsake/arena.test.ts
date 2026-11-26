import { arenaKeepsake } from '@/lib/keepsake/arena'
import { EMBLEM_ROWS } from '@/lib/games/arena-pairings'
import { inkColour, lookFor } from '@/lib/keepsake/render'

const DAY = new Date(2026, 10, 21)
const BASE = {
  first: 'The Moon',
  second: 'The Sun',
  topic: 'Is it better to shine or to reflect?',
  question: 'Where in your life are you a mirror?',
  day: DAY,
}

const words = (plan: ReturnType<typeof arenaKeepsake>) => plan.ops.flatMap((op) => (op.kind === 'text' ? [op.text] : []))
const inkCells = (rows: readonly string[]) => rows.join('').split('').filter((c) => c === 'X').length

describe('arenaKeepsake: the pairing and the question to take away', () => {
  it('draws both pairing pictograms cell for cell, each in its own voice colour', () => {
    const plan = arenaKeepsake({ ...BASE, emblems: ['moon', 'sun'] })
    const first = plan.ops.filter((op) => op.kind === 'rect' && op.ink === 'dusk')
    const second = plan.ops.filter((op) => op.kind === 'rect' && op.ink === 'clay')
    expect(first).toHaveLength(inkCells(EMBLEM_ROWS.moon))
    expect(second).toHaveLength(inkCells(EMBLEM_ROWS.sun))
    const right = (ops: typeof first) => Math.max(...ops.map((op) => (op.kind === 'rect' ? op.x + op.w : 0)))
    expect(right(first)).toBeLessThan(540)
    expect(Math.min(...second.map((op) => (op.kind === 'rect' ? op.x : 0)))).toBeGreaterThan(540)
  })

  it('carries the names, the topic and the question to take with you, and never a winner', () => {
    const plan = arenaKeepsake({ ...BASE, emblems: ['moon', 'sun'] })
    expect(words(plan)).toEqual(expect.arrayContaining(['The Moon', 'The Sun', '“Is it better to shine or to reflect?”', 'To take with you', BASE.question]))
    expect(plan.text).toContain('To take with you:\nWhere in your life are you a mirror?')
    expect(`${plan.alt} ${plan.text}`).not.toMatch(/win|score|point/i)
    expect(plan.alt).toMatch(/The Moon, shown as a crescent moon, and The Sun, shown as a sun/)
    expect(plan.fileName).toBe('the-arena-2026-11-21.png')
  })

  it('draws the voices in dusk and clay, the stage’s own inks, and tells them apart in every palette', () => {
    for (const theme of ['light', 'dark'] as const) {
      const look = lookFor(theme)
      expect(inkColour('dusk', look)).toBe(look.inks.dusk)
      expect(inkColour('clay', look)).toBe(look.inks.clay)
      expect(look.inks.dusk).not.toBe(look.inks.clay)
    }
  })

  it('prints the second voice in the second ink, a pixel out of register', () => {
    const plan = arenaKeepsake({ ...BASE, emblems: ['moon', 'sun'] })
    expect(plan.ops.filter((op) => op.kind === 'rect' && op.ink === 'clay').every((op) => op.kind !== 'text' && op.b)).toBe(true)
    expect(plan.ops.filter((op) => op.kind === 'rect' && op.ink === 'dusk').some((op) => op.kind !== 'text' && op.b)).toBe(false)
  })

  it('marks a pairing written by hand with a round mark and a diamond, as the stage does', () => {
    const plan = arenaKeepsake({ ...BASE, first: 'Kant', second: 'Hume', emblems: null })
    expect(plan.ops.some((op) => op.kind === 'disc' && op.ink === 'dusk')).toBe(true)
    expect(plan.ops.some((op) => op.kind === 'poly' && op.ink === 'clay')).toBe(true)
    expect(plan.alt).toMatch(/Kant, shown as a round mark, and Hume, shown as a diamond/)
  })
})
