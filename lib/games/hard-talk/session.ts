import { CHECK_INS, TALKS, TALK_KINDS, TEXT_MAX, WHO_MAX, pick, worriesFor, type CheckInId, type TalkKind } from './content'
import { STEP_IDS, type StepId } from './flow'

export const STORAGE_KEY = 'verygoodmelon:hard-talk'

const HOUR = 60 * 60 * 1000
/** Within this, a reload or a return picks up silently at the same step. */
export const RESUME_WINDOW_MS = 12 * HOUR
/** After this, what was written is let go rather than kept indefinitely. */
export const KEEP_WINDOW_MS = 14 * 24 * HOUR
/** Until this has passed since finishing, the talk can hardly have happened, so the line is shown again. */
export const CHECK_IN_AFTER_MS = 30 * 60 * 1000

export type OpeningPick = number | 'own' | null

export interface Session {
  version: 1
  run: number
  step: StepId
  kind: TalkKind | null
  who: string
  understand: string
  worry: string | null
  openingPick: OpeningPick
  ownOpening: string
  breaths: number
  updatedAt: number
  finishedAt: number | null
  checkIn: CheckInId | null
}

export function newSession(run: number, now: number): Session {
  return {
    version: 1,
    run,
    step: 'kind',
    kind: null,
    who: '',
    understand: '',
    worry: null,
    openingPick: null,
    ownOpening: '',
    breaths: 0,
    updatedAt: now,
    finishedAt: null,
    checkIn: null,
  }
}

export function chooseKind(session: Session, kind: TalkKind): Session {
  if (session.kind === kind) return session
  return {
    ...session,
    kind,
    worry: null,
    openingPick: session.openingPick === 'own' ? 'own' : null,
  }
}

export function serializeSession(session: Session): string {
  return JSON.stringify(session)
}

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const text = (value: unknown, max: number) => (typeof value === 'string' ? value.slice(0, max) : '')

export function parseSession(raw: string | null): Session | null {
  if (raw === null) return null
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof data !== 'object' || data === null) return null
  const d = data as Record<string, unknown>

  if (d.version !== 1) return null
  if (!STEP_IDS.includes(d.step as StepId)) return null
  if (d.kind !== null && !TALK_KINDS.includes(d.kind as TalkKind)) return null
  if (!isFiniteNumber(d.updatedAt) || !isFiniteNumber(d.run)) return null

  const kind = d.kind as TalkKind | null
  const worryIds = worriesFor(kind ?? 'other').map((w) => w.id)
  const openingCount = TALKS[kind ?? 'other'].openings.length
  const openingPick: OpeningPick =
    d.openingPick === 'own' ? 'own'
      : Number.isInteger(d.openingPick) && (d.openingPick as number) >= 0 && (d.openingPick as number) < openingCount
        ? (d.openingPick as number)
        : null
  const checkIn = CHECK_INS.find((c) => c.id === d.checkIn)?.id ?? null

  return {
    version: 1,
    run: Math.max(0, Math.floor(d.run)),
    step: d.step as StepId,
    kind,
    who: text(d.who, WHO_MAX),
    understand: text(d.understand, TEXT_MAX),
    worry: typeof d.worry === 'string' && worryIds.includes(d.worry) ? d.worry : null,
    openingPick,
    ownOpening: text(d.ownOpening, TEXT_MAX),
    breaths: isFiniteNumber(d.breaths) ? Math.max(0, Math.floor(d.breaths)) : 0,
    updatedAt: d.updatedAt,
    finishedAt: isFiniteNumber(d.finishedAt) ? d.finishedAt : null,
    checkIn,
  }
}

export interface SavedRead {
  session: Session | null
  /** False when the browser will not let this page keep anything. */
  available: boolean
}

export function readSaved(storage: Pick<Storage, 'getItem'> | null): SavedRead {
  if (!storage) return { session: null, available: false }
  try {
    return { session: parseSession(storage.getItem(STORAGE_KEY)), available: true }
  } catch {
    return { session: null, available: false }
  }
}

export function writeSaved(storage: Pick<Storage, 'setItem'> | null, session: Session): boolean {
  if (!storage) return false
  try {
    storage.setItem(STORAGE_KEY, serializeSession(session))
    return true
  } catch {
    return false
  }
}

export type ReturnPlan =
  | { type: 'fresh'; run: number }
  | { type: 'resume'; session: Session }
  | { type: 'offer'; session: Session }
  | { type: 'check-in'; session: Session }

function untouched(session: Session): boolean {
  return session.step === 'kind' && session.kind === null && !session.who && !session.understand && !session.ownOpening
}

export function decideReturn(session: Session | null, now: number): ReturnPlan {
  if (!session) return { type: 'fresh', run: 0 }
  if (untouched(session)) return { type: 'fresh', run: session.run }

  // A clock that jumped backwards must not make a session look ancient or lost.
  const age = Math.max(0, now - (session.finishedAt ?? session.updatedAt))
  if (age > KEEP_WINDOW_MS) return { type: 'fresh', run: session.run + 1 }
  if (session.finishedAt !== null) return age < CHECK_IN_AFTER_MS ? { type: 'resume', session } : { type: 'check-in', session }
  return age <= RESUME_WINDOW_MS ? { type: 'resume', session } : { type: 'offer', session }
}

export function openingText(session: Session): string | null {
  if (session.openingPick === null) return null
  if (session.openingPick === 'own') return session.ownOpening.trim() || null
  return TALKS[session.kind ?? 'other'].openings[session.openingPick] ?? null
}

const WRAPPING_QUOTES = /^[\s“”"‘’']+|[\s“”"‘’']+$/g

/** Their words on one line, as they wrote them, with a capital and an ending. */
export function asCarryLine(text: string): string {
  const line = text.replace(/\s+/g, ' ').replace(WRAPPING_QUOTES, '')
  if (!line) return ''
  const capitalised = line.charAt(0).toUpperCase() + line.slice(1)
  return /[\p{L}\p{N}]$/u.test(capitalised) ? `${capitalised}.` : capitalised
}

export interface CarryNotes {
  line: string
  /** True when the line is made of words they typed, not a sentence they picked. */
  ownWords: boolean
  /** Their first sentence, when the line is something else. */
  begin: string | null
}

export function carryNotes(session: Session): CarryNotes {
  const understand = asCarryLine(session.understand)
  const opening = openingText(session)
  if (understand) return { line: understand, ownWords: true, begin: opening }
  if (session.openingPick === 'own' && opening) return { line: asCarryLine(opening), ownWords: true, begin: null }
  if (opening) return { line: opening, ownWords: false, begin: null }
  return { line: pick(TALKS[session.kind ?? 'other'].carry, session.run), ownWords: false, begin: null }
}
