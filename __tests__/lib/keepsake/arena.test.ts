import { arenaKeepsake } from '@/lib/keepsake/arena'
import { EMBLEM_ROWS } from '@/lib/games/arena-pairings'

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
    const blue = plan.ops.filter((op) => op.kind === 'rect' && op.ink === 'blue')
    const gold = plan.ops.filter((op) => op.kind === 'rect' && op.ink === 'gold')
    expect(blue).toHaveLength(inkCells(EMBLEM_ROWS.moon))
    expect(gold).toHaveLength(inkCells(EMBLEM_ROWS.sun))
    const right = (ops: typeof blue) => Math.max(...ops.map((op) => (op.kind === 'rect' ? op.x + op.w : 0)))
    expect(right(blue)).toBeLessThan(540)
    expect(Math.min(...gold.map((op) => (op.kind === 'rect' ? op.x : 0)))).toBeGreaterThan(540)
  })

  it('carries the names, the topic and the question to take with you, and never a winner', () => {
    const plan = arenaKeepsake({ ...BASE, emblems: ['moon', 'sun'] })
    expect(words(plan)).toEqual(expect.arrayContaining(['The Moon', 'The Sun', '“Is it better to shine or to reflect?”', 'TO TAKE WITH YOU', BASE.question]))
    expect(plan.text).toContain('To take with you:\nWhere in your life are you a mirror?')
    expect(`${plan.alt} ${plan.text}`).not.toMatch(/win|score|point/i)
    expect(plan.alt).toMatch(/The Moon, shown as a crescent moon, and The Sun, shown as a sun/)
    expect(plan.fileName).toBe('the-arena-2026-11-21.png')
  })

  it('marks a pairing written by hand with a round mark and a diamond, as the stage does', () => {
    const plan = arenaKeepsake({ ...BASE, first: 'Kant', second: 'Hume', emblems: null })
    expect(plan.ops.some((op) => op.kind === 'disc' && op.ink === 'blue')).toBe(true)
    expect(plan.ops.some((op) => op.kind === 'poly' && op.ink === 'gold')).toBe(true)
    expect(plan.alt).toMatch(/Kant, shown as a round mark, and Hume, shown as a diamond/)
  })
})
