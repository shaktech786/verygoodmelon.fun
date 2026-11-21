/**
 * Calendar dates as 'YYYY-MM-DD' keys. Opening dates are calendar dates rather than
 * instants so that "about a month" means the same day next month, a capsule opens at
 * local midnight whatever daylight saving does, and keys compare as plain strings.
 */
export type DateKey = string

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/
const MS_PER_DAY = 86_400_000

function parts(key: DateKey): [number, number, number] {
  const [year, month, day] = key.split('-').map(Number)
  return [year, month, day]
}

function fromUtc(ms: number): DateKey {
  return new Date(ms).toISOString().slice(0, 10)
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** The calendar date of an instant in a time zone (the device's own when omitted). */
export function localDateKey(instant: Date, timeZone?: string): DateKey {
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant)
  const get = (type: Intl.DateTimeFormatPartTypes) => formatted.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function addDays(key: DateKey, days: number): DateKey {
  const [year, month, day] = parts(key)
  return fromUtc(Date.UTC(year, month - 1, day + days))
}

/** Same day of the month, or the month's last day when it is shorter (31 Jan + 1 = 28 Feb). */
export function addMonths(key: DateKey, months: number): DateKey {
  const [year, month, day] = parts(key)
  const index = year * 12 + (month - 1) + months
  const targetYear = Math.floor(index / 12)
  const targetMonth = (index % 12) + 1
  return fromUtc(Date.UTC(targetYear, targetMonth - 1, Math.min(day, daysInMonth(targetYear, targetMonth))))
}

export function daysBetween(from: DateKey, to: DateKey): number {
  const [fy, fm, fd] = parts(from)
  const [ty, tm, td] = parts(to)
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / MS_PER_DAY)
}

export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string') return false
  const match = DATE_KEY.exec(value)
  if (!match) return false
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)
}

/** A date key as a Date at UTC noon, for formatting with timeZone 'UTC' without drifting a day. */
export function dateKeyToNoonUtc(key: DateKey): Date {
  const [year, month, day] = parts(key)
  return new Date(Date.UTC(year, month - 1, day, 12))
}
