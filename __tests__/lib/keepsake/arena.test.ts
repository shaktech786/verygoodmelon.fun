import { arenaKeepsake } from '@/lib/keepsake/arena'
import { ARENA_VOICE_COLOURS, EMBLEM_ROWS } from '@/lib/games/arena-pairings'
import { inkColour } from '@/lib/keepsake/render'

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
    const first = plan.ops.filter((op) => op.kind === 'rect' && op.ink === 'voiceA')
    const second = plan.ops.filter((op) => op.kind === 'rect' && op.ink === 'voiceB')
    expect(first).toHaveLength(inkCells(EMBLEM_ROWS.moon))
    expect(second).toHaveLength(inkCells(EMBLEM_ROWS.sun))
    const right = (ops: typeof first) => Math.max(...ops.map((op) => (op.kind === 'rect' ? op.x + op.w : 0)))
    expect(right(first)).toBeLessThan(540)
    expect(Math.min(...second.map((op) => (op.kind === 'rect' ? op.x : 0)))).toBeGreaterThan(540)
  })

  it('carries the names, the topic and the question to take with you, and never a winner', () => {
    const plan = arenaKeepsake({ ...BASE, emblems: ['moon', 'sun'] })
    expect(words(plan)).toEqual(expect.arrayContaining(['The Moon', 'The Sun', '“Is it better to shine or to reflect?”', 'TO TAKE WITH YOU', BASE.question]))
    expect(plan.text).toContain('To take with you:\nWhere in your life are you a mirror?')
    expect(`${plan.alt} ${plan.text}`).not.toMatch(/win|score|point/i)
    expect(plan.alt).toMatch(/The Moon, shown as a crescent moon, and The Sun, shown as a sun/)
    expect(plan.fileName).toBe('the-arena-2026-11-21.png')
  })

  it('draws the voices in the same colours the stage gives them, in both themes', () => {
    for (const theme of ['light', 'dark'] as const) {
      expect(inkColour('voiceA', theme)).toBe(ARENA_VOICE_COLOURS[theme].a)
      expect(inkColour('voiceB', theme)).toBe(ARENA_VOICE_COLOURS[theme].b)
    }
  })

  it('marks a pairing written by hand with a round mark and a diamond, as the stage does', () => {
    const plan = arenaKeepsake({ ...BASE, first: 'Kant', second: 'Hume', emblems: null })
    expect(plan.ops.some((op) => op.kind === 'disc' && op.ink === 'voiceA')).toBe(true)
    expect(plan.ops.some((op) => op.kind === 'poly' && op.ink === 'voiceB')).toBe(true)
    expect(plan.alt).toMatch(/Kant, shown as a round mark, and Hume, shown as a diamond/)
  })
})
