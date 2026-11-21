import { opExtent, patientOneKeepsake, seedRow } from '@/lib/keepsake/patient-one'
import type { MomentRecord } from '@/lib/games/patient-one/today'

const AT = new Date(2026, 10, 21, 10, 4).toISOString()
const record = (over: Partial<MomentRecord>): MomentRecord => ({
  key: AT,
  id: 'watch',
  at: AT,
  things: [],
  heard: [],
  lookedAt: '',
  feelings: [],
  ...over,
})

type Plan = ReturnType<typeof patientOneKeepsake>
const words = (plan: Plan) => plan.ops.flatMap((op) => (op.kind === 'text' ? [op.text] : []))
const seeds = (plan: Plan) => plan.ops.filter((op) => op.kind === 'ellipse' && op.ry >= 20 && op.rx < op.ry && op.ink === 'ink')

describe('patientOneKeepsake', () => {
  it('lays the eight settled seeds in a row on every moment, left to right', () => {
    const row = seedRow('a', 400, 600, 22)
    expect(row).toHaveLength(8)
    expect(row.map((s) => s.x)).toEqual([...row.map((s) => s.x)].sort((a, b) => a - b))
    for (const id of ['watch', 'listen', 'look', 'reflect', 'appreciate'] as const) {
      expect(seeds(patientOneKeepsake({ record: record({ id }) }))).toHaveLength(8)
    }
  })

  it('sets the three things in a quiet serif, in the order they were written', () => {
    const plan = patientOneKeepsake({ record: record({ id: 'appreciate', things: ['Morning light', 'My sister', 'Warm socks'] }) })
    const serif = plan.ops.flatMap((op) => (op.kind === 'text' && op.font === 'serif' ? [op.text] : []))
    expect(serif).toEqual(expect.arrayContaining(['Morning light', 'My sister', 'Warm socks']))
    expect(serif.indexOf('Morning light')).toBeLessThan(serif.indexOf('Warm socks'))
    expect(plan.alt).toContain('Morning light')
    expect(plan.text).toContain('Warm socks')
  })

  it('draws a tiny picture and a name for each sound heard, and only those', () => {
    const plan = patientOneKeepsake({ record: record({ id: 'listen', heard: ['Birds', 'Traffic'] }) })
    expect(words(plan)).toEqual(expect.arrayContaining(['Birds', 'Traffic']))
    expect(words(plan)).not.toContain('Voices')
    expect(plan.ops.some((op) => op.kind === 'line' && op.ink === 'ink')).toBe(true) // the birds
    expect(plan.ops.filter((op) => op.kind === 'rect' && op.ink === 'blue')).toHaveLength(1) // the car
    expect(plan.text).toContain('I heard birds and traffic.')
  })

  it('lets "almost nothing" stand on its own', () => {
    const plan = patientOneKeepsake({ record: record({ id: 'listen', heard: ['Almost nothing'] }) })
    expect(words(plan)).toContain('Almost nothing.')
  })

  it('names the one thing looked at, and the words chosen while noticing', () => {
    expect(words(patientOneKeepsake({ record: record({ id: 'look', lookedAt: 'the blue mug' }) }))).toContain('the blue mug')
    const reflect = patientOneKeepsake({ record: record({ id: 'reflect', feelings: ['Tired', 'Curious'] }) })
    expect(words(reflect).join(' ')).toMatch(/Tired.*Curious/)
  })

  it('has gentle words when nothing was written, and never a count or score', () => {
    for (const id of ['watch', 'listen', 'look', 'reflect', 'appreciate'] as const) {
      const plan = patientOneKeepsake({ record: record({ id }) })
      expect(words(plan).length).toBeGreaterThan(3)
      for (const line of [...words(plan), plan.alt, plan.text]) expect(line).not.toMatch(/\d+ (moments?|things|times)|score|streak/i)
    }
  })

  it('sits each moment in the middle of the page, between the date and the signature', () => {
    const records = [
      record({ id: 'watch' }),
      record({ id: 'listen', heard: ['Birds', 'Traffic', 'Voices', 'A hum or fan', 'My own breath'] }),
      record({ id: 'look', lookedAt: 'the blue mug' }),
      record({ id: 'reflect', feelings: ['Tired'] }),
      record({ id: 'appreciate', things: ['Rain', 'Tea', 'A long walk home'] }),
      record({ id: 'appreciate' }),
    ]
    for (const r of records) {
      // The frame's own lines, title, date and signature all sit outside 190..1230
      const art = patientOneKeepsake({ record: r }).ops.map(opExtent).filter(([top, bottom]) => top > 190 && bottom < 1230)
      const top = Math.min(...art.map(([t]) => t))
      const bottom = Math.max(...art.map(([, b]) => b))
      expect(Math.abs((top + bottom) / 2 - 700)).toBeLessThan(10)
    }
  })

  it('is the same picture for the same moment, saved under the moment and its day', () => {
    const r = record({ id: 'appreciate', things: ['Rain'] })
    expect(patientOneKeepsake({ record: r })).toEqual(patientOneKeepsake({ record: { ...r, things: ['Rain'] } }))
    expect(patientOneKeepsake({ record: r }).fileName).toBe('the-patient-one-count-three-things-2026-11-21.png')
  })
})
