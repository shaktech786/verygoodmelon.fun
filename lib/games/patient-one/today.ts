/**
 * The Patient One's "today" strip: each moment finished today, with what the player noticed
 * in it, kept on this device until local midnight and then let go.
 */

export type MomentId = 'watch' | 'listen' | 'look' | 'reflect' | 'appreciate'

export const MOMENT_IDS: readonly MomentId[] = ['watch', 'listen', 'look', 'reflect', 'appreciate']

export const MOMENT_TITLES: Record<MomentId, string> = {
  watch: 'Watch the Seeds',
  listen: 'Listen to Silence',
  look: 'Look at One Thing',
  reflect: 'Notice This Moment',
  appreciate: 'Count Three Things',
}

export const HEARD = ['Traffic', 'Birds', 'Wind or rain', 'Voices', 'A hum or fan', 'My own breath', 'Almost nothing'] as const
export type Heard = (typeof HEARD)[number]

export const BODY_WORDS = ['Tense', 'Tired', 'Heavy', 'Restless', 'Comfortable', 'Warm'] as const
export const MIND_WORDS = ['Busy', 'Worried', 'Flat', 'Quiet', 'Content', 'Curious'] as const
const FEELING_WORDS: readonly string[] = [...BODY_WORDS, ...MIND_WORDS]

export const THING_MAX_LENGTH = 80
export const LOOKED_AT_MAX_LENGTH = 40

export interface MomentRecord {
  /** Unique within the strip: the instant the moment was finished. */
  key: string
  id: MomentId
  /** ISO instant the moment was finished. */
  at: string
  things: string[]
  heard: Heard[]
  lookedAt: string
  feelings: string[]
}

export const TODAY_STRIP_KEY = 'verygoodmelon:patient-one:today'
const MAX_CARDS = 24

/** The visitor's own calendar day, so the strip turns over at their midnight. */
export function localDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function isToday(record: MomentRecord, now: Date): boolean {
  return localDay(new Date(record.at)) === localDay(now)
}

function strings(value: unknown, maxLength: number, allowed?: readonly string[]): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim().slice(0, maxLength))
    .filter((v) => v !== '' && (!allowed || allowed.includes(v)))
}

function readRecord(value: unknown): MomentRecord | null {
  if (typeof value !== 'object' || value === null) return null
  const v = value as Record<string, unknown>
  if (typeof v.key !== 'string' || !MOMENT_IDS.includes(v.id as MomentId)) return null
  if (typeof v.at !== 'string' || Number.isNaN(Date.parse(v.at))) return null
  return {
    key: v.key,
    id: v.id as MomentId,
    at: v.at,
    things: strings(v.things, THING_MAX_LENGTH).slice(0, 3),
    heard: strings(v.heard, 20, HEARD) as Heard[],
    lookedAt: typeof v.lookedAt === 'string' ? v.lookedAt.trim().slice(0, LOOKED_AT_MAX_LENGTH) : '',
    feelings: strings(v.feelings, 20, FEELING_WORDS),
  }
}

/** Today's cards from what was saved; anything from another day, or unreadable, is let go. */
export function readTodayStrip(raw: string | null, now: Date): MomentRecord[] {
  if (!raw) return []
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return []
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return []
  const { v, day, moments } = data as Record<string, unknown>
  if (v !== 1 || day !== localDay(now) || !Array.isArray(moments)) return []
  return moments
    .map(readRecord)
    .filter((r): r is MomentRecord => r !== null && isToday(r, now))
    .slice(-MAX_CARDS)
}

export function writeTodayStrip(records: readonly MomentRecord[], now: Date): string {
  return JSON.stringify({ v: 1, day: localDay(now), moments: records.filter((r) => isToday(r, now)) })
}

/** Adds a finished moment, or updates it if it is already there; yesterday's cards fall away. */
export function withMoment(records: readonly MomentRecord[], record: MomentRecord, now: Date): MomentRecord[] {
  const kept = records.filter((r) => isToday(r, now))
  const index = kept.findIndex((r) => r.key === record.key)
  const next = index === -1 ? [...kept, record] : kept.map((r, i) => (i === index ? record : r))
  return next.slice(-MAX_CARDS)
}

export function joinNaturally(words: readonly string[]): string {
  if (words.length <= 1) return words.join('')
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
}

/** A few quiet words for a card in the strip. */
export function momentGist(record: MomentRecord): string {
  switch (record.id) {
    case 'watch':
      return 'Eight seeds settled'
    case 'listen':
      if (record.heard.length === 0) return 'A minute of listening'
      return joinNaturally(record.heard.map((s, i) => (s === 'My own breath' ? 'my own breath' : i === 0 ? s : s.toLowerCase())))
    case 'look':
      return record.lookedAt || 'One thing, a whole minute'
    case 'reflect':
      return record.feelings.length ? joinNaturally(record.feelings.map((w, i) => (i === 0 ? w : w.toLowerCase()))) : 'A moment, unnamed'
    case 'appreciate':
      return record.things.length ? record.things.join(' · ') : 'What is good today'
  }
}
