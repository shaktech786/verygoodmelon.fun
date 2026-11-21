import { describe, expect, it } from 'vitest'
import {
  MAX_NOTE_LENGTH,
  MAX_WORRY_LENGTH,
  type Capsule,
  capsuleStatus,
  normalizeWorry,
  openCapsule,
  sealCapsule,
  shelve,
  tally,
} from '@/lib/games/worry-capsule/capsules'

const TZ = 'Europe/London'
const SEALED = new Date('2026-11-21T10:00:00Z')

function sealed(overrides: Partial<Capsule> = {}): Capsule {
  return {
    ...sealCapsule({ id: 'a', worry: 'The interview will go badly', horizon: 'week', now: SEALED, timeZone: TZ }),
    ...overrides,
  }
}

describe('normalizeWorry', () => {
  it('trims and refuses empty text', () => {
    expect(normalizeWorry('  money  \n')).toBe('money')
    expect(normalizeWorry('   \n ')).toBeNull()
  })

  it('refuses text over the limit rather than cutting a worry short', () => {
    expect(normalizeWorry('x'.repeat(MAX_WORRY_LENGTH))).toHaveLength(MAX_WORRY_LENGTH)
    expect(normalizeWorry('x'.repeat(MAX_WORRY_LENGTH + 1))).toBeNull()
  })
})

describe('sealCapsule', () => {
  it('schedules each horizon on a calendar-correct local date', () => {
    const week = sealCapsule({ id: 'w', worry: 'w', horizon: 'week', now: SEALED, timeZone: TZ })
    const month = sealCapsule({ id: 'm', worry: 'm', horizon: 'month', now: SEALED, timeZone: TZ })
    const season = sealCapsule({ id: 's', worry: 's', horizon: 'season', now: SEALED, timeZone: TZ })
    expect(week.opensOn).toBe('2026-11-28')
    expect(month.opensOn).toBe('2026-12-21')
    expect(season.opensOn).toBe('2027-02-21')
    expect(week.sealedAt).toBe('2026-11-21T10:00:00.000Z')
    expect(week.opening).toBeNull()
  })

  it('uses the sealer’s own date when it is already tomorrow there', () => {
    const late = new Date('2027-01-31T20:00:00Z')
    expect(sealCapsule({ id: 'x', worry: 'x', horizon: 'month', now: late, timeZone: 'Pacific/Auckland' }).opensOn).toBe('2027-03-01')
    expect(sealCapsule({ id: 'y', worry: 'y', horizon: 'month', now: late, timeZone: 'UTC' }).opensOn).toBe('2027-02-28')
  })

  it('trims the worry it keeps', () => {
    expect(sealCapsule({ id: 'a', worry: '  hello ', horizon: 'week', now: SEALED, timeZone: TZ }).worry).toBe('hello')
  })
})

describe('capsuleStatus', () => {
  it('rests until the opening date, then is ready all day long', () => {
    const capsule = sealed()
    expect(capsuleStatus(capsule, new Date('2026-11-27T23:59:00Z'), TZ)).toBe('resting')
    expect(capsuleStatus(capsule, new Date('2026-11-28T00:00:00Z'), TZ)).toBe('ready')
    expect(capsuleStatus(capsule, new Date('2027-06-01T12:00:00Z'), TZ)).toBe('ready')
  })

  it('opens on the local morning of the date even across daylight saving', () => {
    const ny = 'America/New_York'
    const capsule = sealCapsule({ id: 'd', worry: 'd', horizon: 'week', now: new Date('2026-03-01T17:00:00Z'), timeZone: ny })
    expect(capsule.opensOn).toBe('2026-03-08')
    expect(capsuleStatus(capsule, new Date('2026-03-08T04:30:00Z'), ny)).toBe('resting')
    expect(capsuleStatus(capsule, new Date('2026-03-08T05:30:00Z'), ny)).toBe('ready')
  })

  it('simply keeps resting when the device clock jumps back before the seal', () => {
    expect(capsuleStatus(sealed(), new Date('2025-01-01T00:00:00Z'), TZ)).toBe('resting')
  })

  it('stays opened whatever the clock says afterwards', () => {
    const opened = openCapsule(sealed(), 'no', '', new Date('2026-11-29T09:00:00Z'))
    expect(capsuleStatus(opened, new Date('2026-11-29T09:00:00Z'), TZ)).toBe('opened')
    expect(capsuleStatus(opened, new Date('2020-01-01T00:00:00Z'), TZ)).toBe('opened')
  })
})

describe('openCapsule', () => {
  it('records the answer and a trimmed note without changing the original', () => {
    const capsule = sealed()
    const opened = openCapsule(capsule, 'partly', '  it was fine in the end  ', new Date('2026-11-29T09:00:00Z'))
    expect(opened.opening).toEqual({ at: '2026-11-29T09:00:00.000Z', outcome: 'partly', note: 'it was fine in the end' })
    expect(capsule.opening).toBeNull()
  })

  it('keeps the note within the limit', () => {
    const opened = openCapsule(sealed(), 'no', 'y'.repeat(MAX_NOTE_LENGTH + 50), SEALED)
    expect(opened.opening?.note).toHaveLength(MAX_NOTE_LENGTH)
  })

  it('keeps the first answer if the capsule was already opened', () => {
    const first = openCapsule(sealed(), 'no', 'first', SEALED)
    expect(openCapsule(first, 'yes', 'second', SEALED)).toBe(first)
  })
})

describe('shelve', () => {
  it('groups ready, resting and opened capsules in a calm order', () => {
    const now = new Date('2026-12-01T12:00:00Z')
    const readyOld = sealed({ id: 'r1', opensOn: '2026-11-25' })
    const readyNew = sealed({ id: 'r2', opensOn: '2026-11-30' })
    const restingSoon = sealed({ id: 's1', opensOn: '2026-12-05' })
    const restingLate = sealed({ id: 's2', opensOn: '2027-02-01' })
    const openedEarly = openCapsule(sealed({ id: 'o1' }), 'no', '', new Date('2026-11-28T10:00:00Z'))
    const openedLate = openCapsule(sealed({ id: 'o2' }), 'yes', '', new Date('2026-11-30T10:00:00Z'))

    const shelf = shelve([restingLate, openedEarly, readyNew, restingSoon, openedLate, readyOld], now, TZ)
    expect(shelf.ready.map((c) => c.id)).toEqual(['r1', 'r2'])
    expect(shelf.resting.map((c) => c.id)).toEqual(['s1', 's2'])
    expect(shelf.opened.map((c) => c.id)).toEqual(['o2', 'o1'])
  })
})

describe('tally', () => {
  it('counts only the capsules that have been looked back on', () => {
    const capsules = [
      openCapsule(sealed({ id: '1' }), 'no', '', SEALED),
      openCapsule(sealed({ id: '2' }), 'no', '', SEALED),
      openCapsule(sealed({ id: '3' }), 'partly', '', SEALED),
      openCapsule(sealed({ id: '4' }), 'yes', '', SEALED),
      sealed({ id: '5' }),
    ]
    expect(tally(capsules)).toEqual({ no: 2, partly: 1, yes: 1, total: 4 })
    expect(tally([])).toEqual({ no: 0, partly: 0, yes: 0, total: 0 })
  })
})
