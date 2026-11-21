import { describe, expect, it } from 'vitest'
import { addDays, addMonths, daysBetween, isDateKey, localDateKey } from '@/lib/games/worry-capsule/dates'

describe('localDateKey', () => {
  it('reads the calendar date in the given time zone, not in UTC', () => {
    const instant = new Date('2026-11-21T20:00:00Z')
    expect(localDateKey(instant, 'UTC')).toBe('2026-11-21')
    expect(localDateKey(instant, 'Pacific/Auckland')).toBe('2026-11-22')
    expect(localDateKey(instant, 'America/Los_Angeles')).toBe('2026-11-21')
    expect(localDateKey(new Date('2026-11-22T03:00:00Z'), 'America/Los_Angeles')).toBe('2026-11-21')
  })

  it('stays on the right day either side of a daylight-saving change', () => {
    // New York springs forward at 02:00 local on 8 March 2026.
    expect(localDateKey(new Date('2026-03-08T06:59:00Z'), 'America/New_York')).toBe('2026-03-08')
    expect(localDateKey(new Date('2026-03-08T07:01:00Z'), 'America/New_York')).toBe('2026-03-08')
    expect(localDateKey(new Date('2026-03-08T04:59:00Z'), 'America/New_York')).toBe('2026-03-07')
  })
})

describe('addDays', () => {
  it('counts calendar days across month, year and daylight-saving boundaries', () => {
    expect(addDays('2026-11-21', 7)).toBe('2026-11-28')
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04')
    expect(addDays('2026-03-04', 7)).toBe('2026-03-11')
    expect(addDays('2028-02-26', 7)).toBe('2028-03-04')
  })
})

describe('addMonths', () => {
  it('keeps the same day of the month', () => {
    expect(addMonths('2026-11-21', 1)).toBe('2026-12-21')
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15')
    expect(addMonths('2026-11-21', 3)).toBe('2027-02-21')
  })

  it('lands on the last day when the next month is shorter', () => {
    expect(addMonths('2027-01-31', 1)).toBe('2027-02-28')
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
    expect(addMonths('2026-08-31', 3)).toBe('2026-11-30')
    expect(addMonths('2026-03-31', 1)).toBe('2026-04-30')
  })
})

describe('daysBetween', () => {
  it('counts whole calendar days, negative when the second date is earlier', () => {
    expect(daysBetween('2026-11-21', '2026-11-28')).toBe(7)
    expect(daysBetween('2026-11-28', '2026-11-21')).toBe(-7)
    expect(daysBetween('2026-03-01', '2026-04-01')).toBe(31)
  })
})

describe('isDateKey', () => {
  it('accepts only real calendar dates written as YYYY-MM-DD', () => {
    expect(isDateKey('2026-11-21')).toBe(true)
    expect(isDateKey('2028-02-29')).toBe(true)
    expect(isDateKey('2027-02-29')).toBe(false)
    expect(isDateKey('2026-13-01')).toBe(false)
    expect(isDateKey('2026-1-1')).toBe(false)
    expect(isDateKey('tomorrow')).toBe(false)
    expect(isDateKey(20261121)).toBe(false)
  })
})
