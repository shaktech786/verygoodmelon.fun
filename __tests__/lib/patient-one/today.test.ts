import { localDay, momentGist, newestFirst, readTodayStrip, withMoment, writeTodayStrip, type MomentRecord } from '@/lib/games/patient-one/today'

const at = (h: number, m = 0, day = 21) => new Date(2026, 10, day, h, m)
const record = (when: Date, over: Partial<MomentRecord> = {}): MomentRecord => ({
  key: when.toISOString(),
  id: 'appreciate',
  at: when.toISOString(),
  things: ['Morning light'],
  heard: [],
  lookedAt: '',
  feelings: [],
  ...over,
})

describe("the Patient One's today strip", () => {
  it('names the day by the local calendar', () => {
    expect(localDay(at(0, 0))).toBe('2026-11-21')
    expect(localDay(at(23, 59))).toBe('2026-11-21')
    expect(localDay(at(0, 0, 22))).toBe('2026-11-22')
  })

  it('keeps today’s cards through a reload, in order, with what was noticed', () => {
    const strip = [record(at(9)), record(at(11), { id: 'listen', things: [], heard: ['Birds'] })]
    expect(readTodayStrip(writeTodayStrip(strip, at(12)), at(18))).toEqual(strip)
  })

  it('shows the newest moment first, without changing what is kept', () => {
    const strip = [record(at(9)), record(at(11)), record(at(14))]
    expect(newestFirst(strip).map((r) => r.at)).toEqual([at(14), at(11), at(9)].map((d) => d.toISOString()))
    expect(strip.map((r) => r.at)).toEqual([at(9), at(11), at(14)].map((d) => d.toISOString()))
  })

  it('resets at local midnight', () => {
    const saved = writeTodayStrip([record(at(23, 50))], at(23, 55))
    expect(readTodayStrip(saved, at(23, 59, 21))).toHaveLength(1)
    expect(readTodayStrip(saved, at(0, 0, 22))).toEqual([])
  })

  it('lets yesterday fall away when a new moment is added after midnight', () => {
    const late = record(at(23, 40))
    const early = record(at(0, 10, 22))
    expect(withMoment([late], early, at(0, 10, 22))).toEqual([early])
  })

  it('updates a card in place when what was heard changes after the moment ends', () => {
    const listen = record(at(10), { id: 'listen', things: [] })
    const strip = withMoment([record(at(9))], listen, at(10))
    const next = withMoment(strip, { ...listen, heard: ['Birds', 'Voices'] }, at(10, 1))
    expect(next).toHaveLength(2)
    expect(next[1].heard).toEqual(['Birds', 'Voices'])
  })

  it('ignores anything broken or unknown without failing', () => {
    expect(readTodayStrip(null, at(10))).toEqual([])
    expect(readTodayStrip('{oops', at(10))).toEqual([])
    expect(readTodayStrip('[]', at(10))).toEqual([])
    const odd = JSON.stringify({
      v: 1,
      day: '2026-11-21',
      moments: [{ ...record(at(9)), id: 'breathe' }, { ...record(at(10)), heard: ['Birds', 'Sirens'], feelings: ['Tired', 'Evil'] }, 'nope'],
    })
    const [kept, ...rest] = readTodayStrip(odd, at(12))
    expect(rest).toEqual([])
    expect(kept.heard).toEqual(['Birds'])
    expect(kept.feelings).toEqual(['Tired'])
  })

  it('gives each card a few quiet words from what happened', () => {
    expect(momentGist(record(at(9), { things: ['Rain', 'Tea'] }))).toBe('Rain · Tea')
    expect(momentGist(record(at(9), { id: 'listen', heard: ['Birds', 'My own breath'] }))).toBe('Birds and my own breath')
    expect(momentGist(record(at(9), { id: 'look', lookedAt: 'the blue mug' }))).toBe('the blue mug')
    expect(momentGist(record(at(9), { id: 'watch' }))).toBe('Eight seeds settled')
  })
})
