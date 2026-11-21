import { type Capsule, type Horizon, type Opening, type Outcome, MAX_NOTE_LENGTH, MAX_WORRY_LENGTH } from './capsules'
import { isDateKey } from './dates'

/**
 * One envelope format serves both this browser's storage and the "Save a copy" file,
 * so a copy restores exactly what was kept and both share one versioning path.
 */
export const ARCHIVE_KIND = 'verygoodmelon.fun/worry-capsules'
export const ARCHIVE_VERSION = 1
export const MAX_ARCHIVE_CHARS = 5_000_000

export type ArchiveProblem = 'unreadable' | 'foreign' | 'newer' | 'damaged' | 'too-large'
export type ArchiveResult = { ok: true; capsules: Capsule[] } | { ok: false; reason: ArchiveProblem }

const HORIZON_IDS: readonly Horizon[] = ['week', 'month', 'season']
const OUTCOME_IDS: readonly Outcome[] = ['yes', 'partly', 'no']

export function writeArchive(capsules: readonly Capsule[], now: Date): string {
  return JSON.stringify({ kind: ARCHIVE_KIND, version: ARCHIVE_VERSION, savedAt: now.toISOString(), capsules }, null, 2)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isInstant(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value))
}

function readOpening(value: unknown): Opening | null | undefined {
  if (value === null) return null
  if (!isRecord(value)) return undefined
  const { at, outcome, note } = value
  if (!isInstant(at) || !OUTCOME_IDS.includes(outcome as Outcome)) return undefined
  if (typeof note !== 'string' || note.length > MAX_NOTE_LENGTH) return undefined
  return { at, outcome: outcome as Outcome, note }
}

function readCapsule(value: unknown): Capsule | undefined {
  if (!isRecord(value)) return undefined
  const { id, worry, horizon, sealedAt, opensOn } = value
  if (typeof id !== 'string' || id.length === 0 || id.length > 100) return undefined
  if (typeof worry !== 'string' || worry.trim().length === 0 || worry.length > MAX_WORRY_LENGTH) return undefined
  if (!HORIZON_IDS.includes(horizon as Horizon) || !isInstant(sealedAt) || !isDateKey(opensOn)) return undefined
  const opening = readOpening(value.opening)
  if (opening === undefined) return undefined
  return { id, worry, horizon: horizon as Horizon, sealedAt, opensOn, opening }
}

export function readArchive(text: string): ArchiveResult {
  if (text.length > MAX_ARCHIVE_CHARS) return { ok: false, reason: 'too-large' }
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'unreadable' }
  }
  if (!isRecord(data) || data.kind !== ARCHIVE_KIND) return { ok: false, reason: 'foreign' }
  const { version } = data
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) return { ok: false, reason: 'damaged' }
  if (version > ARCHIVE_VERSION) return { ok: false, reason: 'newer' }
  if (!Array.isArray(data.capsules)) return { ok: false, reason: 'damaged' }

  const capsules: Capsule[] = []
  for (const entry of data.capsules) {
    const capsule = readCapsule(entry)
    if (!capsule) return { ok: false, reason: 'damaged' }
    capsules.push(capsule)
  }
  return { ok: true, capsules }
}

export interface Merge {
  capsules: Capsule[]
  added: number
  updated: number
}

/** Restoring never loses anything already here; an answered copy replaces an unanswered one. */
export function mergeCapsules(existing: readonly Capsule[], incoming: readonly Capsule[]): Merge {
  const byId = new Map(existing.map((capsule) => [capsule.id, capsule]))
  const known = new Set(byId.keys())
  let added = 0
  let updated = 0
  for (const capsule of incoming) {
    const current = byId.get(capsule.id)
    if (!current) {
      byId.set(capsule.id, capsule)
      added += 1
    } else if (!current.opening && capsule.opening) {
      byId.set(capsule.id, capsule)
      if (known.has(capsule.id)) updated += 1
    }
  }
  return { capsules: [...byId.values()], added, updated }
}
