import { type DateKey, addDays, addMonths, localDateKey } from './dates'

export type Horizon = 'week' | 'month' | 'season'
export type ResealHorizon = Exclude<Horizon, 'season'>
export type Outcome = 'yes' | 'partly' | 'no'
export type CapsuleStatus = 'resting' | 'ready' | 'opened'

export interface Opening {
  at: string
  outcome: Outcome
  note: string
}

export interface Capsule {
  id: string
  worry: string
  horizon: Horizon
  /** ISO instant of sealing. */
  sealedAt: string
  /** Local calendar date on which the capsule becomes ready. */
  opensOn: DateKey
  opening: Opening | null
  /** ISO instants of each time it was opened and judged too soon to tell, then sealed again. */
  lookedIn: string[]
}

export interface Tally {
  no: number
  partly: number
  yes: number
  total: number
}

export const MAX_WORRY_LENGTH = 500
export const MAX_NOTE_LENGTH = 280
export const MAX_LOOKED_IN = 100

export const HORIZONS: readonly { id: Horizon; label: string }[] = [
  { id: 'week', label: 'In about a week' },
  { id: 'month', label: 'In about a month' },
  { id: 'season', label: 'In three months' },
]

export const RESEAL_HORIZONS: readonly { id: ResealHorizon; label: string }[] = [
  { id: 'week', label: 'Another week' },
  { id: 'month', label: 'Another month' },
]

export const OUTCOMES: readonly { id: Outcome; label: string }[] = [
  { id: 'yes', label: 'It happened' },
  { id: 'partly', label: 'Partly happened' },
  { id: 'no', label: 'It didn’t happen' },
]

export function normalizeWorry(text: string): string | null {
  const trimmed = text.trim()
  return trimmed.length > 0 && trimmed.length <= MAX_WORRY_LENGTH ? trimmed : null
}

export function opensOnFor(sealedOn: DateKey, horizon: Horizon): DateKey {
  if (horizon === 'week') return addDays(sealedOn, 7)
  return addMonths(sealedOn, horizon === 'month' ? 1 : 3)
}

interface SealInput {
  id: string
  worry: string
  horizon: Horizon
  now: Date
  timeZone?: string
}

export function sealCapsule({ id, worry, horizon, now, timeZone }: SealInput): Capsule {
  return {
    id,
    worry: worry.trim(),
    horizon,
    sealedAt: now.toISOString(),
    opensOn: opensOnFor(localDateKey(now, timeZone), horizon),
    opening: null,
    lookedIn: [],
  }
}

export function capsuleStatus(capsule: Capsule, now: Date, timeZone?: string): CapsuleStatus {
  if (capsule.opening) return 'opened'
  return localDateKey(now, timeZone) >= capsule.opensOn ? 'ready' : 'resting'
}

export function openCapsule(capsule: Capsule, outcome: Outcome, note: string, now: Date): Capsule {
  if (capsule.opening) return capsule
  return {
    ...capsule,
    opening: { at: now.toISOString(), outcome, note: note.trim().slice(0, MAX_NOTE_LENGTH) },
  }
}

/** "Too soon to tell": it rests again from today and stays out of the tally. */
export function resealCapsule(capsule: Capsule, horizon: ResealHorizon, now: Date, timeZone?: string): Capsule {
  if (capsule.opening) return capsule
  return {
    ...capsule,
    opensOn: opensOnFor(localDateKey(now, timeZone), horizon),
    lookedIn: [...capsule.lookedIn, now.toISOString()].slice(-MAX_LOOKED_IN),
  }
}

export interface Shelf {
  ready: Capsule[]
  resting: Capsule[]
  opened: Capsule[]
}

export function shelve(capsules: readonly Capsule[], now: Date, timeZone?: string): Shelf {
  const shelf: Shelf = { ready: [], resting: [], opened: [] }
  for (const capsule of capsules) shelf[capsuleStatus(capsule, now, timeZone)].push(capsule)
  const byOpening = (a: Capsule, b: Capsule) => a.opensOn.localeCompare(b.opensOn) || a.sealedAt.localeCompare(b.sealedAt)
  shelf.ready.sort(byOpening)
  shelf.resting.sort(byOpening)
  shelf.opened.sort((a, b) => (b.opening?.at ?? '').localeCompare(a.opening?.at ?? ''))
  return shelf
}

export function tally(capsules: readonly Capsule[]): Tally {
  const counts: Tally = { no: 0, partly: 0, yes: 0, total: 0 }
  for (const { opening } of capsules) {
    if (!opening) continue
    counts[opening.outcome] += 1
    counts.total += 1
  }
  return counts
}
