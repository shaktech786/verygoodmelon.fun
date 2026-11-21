import { readArchive, writeArchive } from './archive'
import type { Capsule } from './capsules'

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const STORAGE_KEY = 'verygoodmelon:worry-capsule'
export const BACKUP_KEY = 'verygoodmelon:worry-capsule:unreadable'
const PROBE_KEY = 'verygoodmelon:worry-capsule:probe'

export type LoadResult =
  | { status: 'ok'; capsules: Capsule[] }
  | { status: 'unreadable'; capsules: Capsule[] }
  | { status: 'unavailable' }

export type SaveResult = { ok: true } | { ok: false; reason: 'full' | 'unavailable' }

function isQuotaError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
}

export function loadCapsules(store: KeyValueStore | null): LoadResult {
  if (!store) return { status: 'unavailable' }
  let raw: string | null
  try {
    raw = store.getItem(STORAGE_KEY)
  } catch {
    return { status: 'unavailable' }
  }
  if (raw === null) return { status: 'ok', capsules: [] }

  const result = readArchive(raw)
  if (result.ok) return { status: 'ok', capsules: result.capsules }

  // The next save would overwrite this, so keep the first unreadable copy somewhere safe.
  try {
    if (store.getItem(BACKUP_KEY) === null) store.setItem(BACKUP_KEY, raw)
  } catch {
    // Nothing more can be done without storage; the original stays until the next save.
  }
  return { status: 'unreadable', capsules: [] }
}

export function saveCapsules(store: KeyValueStore | null, capsules: readonly Capsule[], now: Date): SaveResult {
  if (!store) return { ok: false, reason: 'unavailable' }
  try {
    store.setItem(STORAGE_KEY, writeArchive(capsules, now))
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: isQuotaError(error) ? 'full' : 'unavailable' }
  }
}

export function canWrite(store: KeyValueStore | null): boolean {
  if (!store) return false
  try {
    store.setItem(PROBE_KEY, '1')
    store.removeItem(PROBE_KEY)
    return true
  } catch {
    return false
  }
}
