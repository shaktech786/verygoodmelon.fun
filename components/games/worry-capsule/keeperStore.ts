import type { Capsule } from '@/lib/games/worry-capsule/capsules'
import { type WorryDraft, clearDraft, loadDraft, saveDraft } from '@/lib/games/worry-capsule/draft'
import {
  type KeyValueStore,
  type SaveResult,
  canWrite,
  loadCapsules,
  saveCapsules,
} from '@/lib/games/worry-capsule/persistence'

/**
 * The browser side of The Keeper: localStorage plus the clock, exposed to React through
 * useSyncExternalStore. Each snapshot carries the moment it was taken, so rendering never
 * reads the clock itself and every status on screen agrees with every other.
 */
export interface KeeperSnapshot {
  loaded: true
  capsules: Capsule[]
  storage: 'ok' | 'unreadable' | 'unavailable'
  writable: boolean
  /** Words typed but not yet sealed, kept so a reload or interruption does not lose them. */
  draft: WorryDraft | null
  nowMs: number
  devOffsetDays: number
}

export type Snapshot = KeeperSnapshot | { loaded: false }

const LOADING: Snapshot = { loaded: false }
const DAY_MS = 86_400_000
const DEV_OFFSET_KEY = 'verygoodmelon:worry-capsule:dev-days'

let current: KeeperSnapshot | null = null
const listeners = new Set<() => void>()

function browserStore(): KeyValueStore | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function readDevOffset(store: KeyValueStore | null): number {
  if (process.env.NODE_ENV !== 'development' || !store) return 0
  try {
    const days = Number(store.getItem(DEV_OFFSET_KEY) ?? 0)
    return Number.isFinite(days) ? days : 0
  } catch {
    return 0
  }
}

function clockMs(devOffsetDays: number): number {
  return Date.now() + devOffsetDays * DAY_MS
}

function build(): KeeperSnapshot {
  const store = browserStore()
  const devOffsetDays = readDevOffset(store)
  const loaded = loadCapsules(store)
  return {
    loaded: true,
    capsules: loaded.status === 'unavailable' ? [] : loaded.capsules,
    storage: loaded.status === 'ok' ? 'ok' : loaded.status,
    writable: canWrite(store),
    draft: loadDraft(store),
    nowMs: clockMs(devOffsetDays),
    devOffsetDays,
  }
}

function emit(next: KeeperSnapshot) {
  current = next
  for (const listener of listeners) listener()
}

// Another tab may have sealed or opened something, and a page left open overnight
// should notice that a capsule became ready.
function refresh() {
  emit(build())
}

function onVisibility() {
  if (document.visibilityState === 'visible') refresh()
}

export function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    window.addEventListener('storage', refresh)
    document.addEventListener('visibilitychange', onVisibility)
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      window.removeEventListener('storage', refresh)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }
}

export function getSnapshot(): Snapshot {
  current ??= build()
  return current
}

export function getServerSnapshot(): Snapshot {
  return LOADING
}

export function now(): Date {
  return new Date(clockMs(current?.devOffsetDays ?? 0))
}

export function commit(capsules: Capsule[]): SaveResult {
  const at = now()
  const result = saveCapsules(browserStore(), capsules, at)
  if (result.ok && current) {
    emit({ ...current, capsules, storage: 'ok', writable: true, nowMs: at.getTime() })
  }
  return result
}

export function keepDraft(draft: WorryDraft) {
  const store = browserStore()
  saveDraft(store, draft)
  if (current) emit({ ...current, draft: loadDraft(store) })
}

export function forgetDraft() {
  clearDraft(browserStore())
  if (current) emit({ ...current, draft: null })
}

export function requestPersistence() {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return
  navigator.storage.persist().catch(() => {
    // Refusal only means the browser may clear storage under pressure; "Save a copy" covers that.
  })
}

export function setDevOffsetDays(days: number) {
  if (process.env.NODE_ENV !== 'development') return
  try {
    browserStore()?.setItem(DEV_OFFSET_KEY, String(days))
  } catch {
    return
  }
  refresh()
}

export function newCapsuleId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // randomUUID needs a secure context; getRandomValues does not.
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')
}
