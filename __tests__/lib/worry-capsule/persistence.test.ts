import { describe, expect, it } from 'vitest'
import { ARCHIVE_VERSION, writeArchive } from '@/lib/games/worry-capsule/archive'
import { sealCapsule } from '@/lib/games/worry-capsule/capsules'
import {
  BACKUP_KEY,
  STORAGE_KEY,
  type KeyValueStore,
  canWrite,
  loadCapsules,
  saveCapsules,
} from '@/lib/games/worry-capsule/persistence'

const NOW = new Date('2026-11-21T10:00:00Z')
const capsule = sealCapsule({ id: 'a', worry: 'Something', horizon: 'week', now: NOW, timeZone: 'UTC' })

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value
    },
    removeItem: (key) => {
      delete data[key]
    },
  }
}

function failingStore(error: Error): KeyValueStore {
  return {
    getItem: () => null,
    setItem: () => {
      throw error
    },
    removeItem: () => {},
  }
}

function quotaError(): Error {
  const error = new Error('The quota has been exceeded.')
  error.name = 'QuotaExceededError'
  return error
}

describe('loadCapsules', () => {
  it('finds nothing on a first visit', () => {
    expect(loadCapsules(memoryStore())).toEqual({ status: 'ok', capsules: [] })
  })

  it('reads back what was saved', () => {
    const store = memoryStore()
    expect(saveCapsules(store, [capsule], NOW)).toEqual({ ok: true })
    expect(loadCapsules(store)).toEqual({ status: 'ok', capsules: [capsule] })
  })

  it('reports no storage at all', () => {
    expect(loadCapsules(null)).toEqual({ status: 'unavailable' })
  })

  it('treats a store that throws on read as unavailable', () => {
    const store: KeyValueStore = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {},
      removeItem: () => {},
    }
    expect(loadCapsules(store)).toEqual({ status: 'unavailable' })
  })

  it('sets unreadable data aside once instead of overwriting it', () => {
    const store = memoryStore({ [STORAGE_KEY]: '{broken' })
    expect(loadCapsules(store)).toEqual({ status: 'unreadable', capsules: [] })
    expect(store.data[BACKUP_KEY]).toBe('{broken')

    store.data[STORAGE_KEY] = 'also broken'
    loadCapsules(store)
    expect(store.data[BACKUP_KEY]).toBe('{broken')
  })

  it('sets aside data from a newer version too', () => {
    const newer = writeArchive([capsule], NOW).replace(`"version": ${ARCHIVE_VERSION}`, `"version": ${ARCHIVE_VERSION + 1}`)
    const store = memoryStore({ [STORAGE_KEY]: newer })
    expect(loadCapsules(store)).toEqual({ status: 'unreadable', capsules: [] })
    expect(store.data[BACKUP_KEY]).toBe(newer)
  })
})

describe('saveCapsules', () => {
  it('reports a full store', () => {
    expect(saveCapsules(failingStore(quotaError()), [capsule], NOW)).toEqual({ ok: false, reason: 'full' })
  })

  it('reports any other refusal as unavailable', () => {
    expect(saveCapsules(failingStore(new Error('SecurityError')), [capsule], NOW)).toEqual({ ok: false, reason: 'unavailable' })
    expect(saveCapsules(null, [capsule], NOW)).toEqual({ ok: false, reason: 'unavailable' })
  })
})

describe('canWrite', () => {
  it('checks writing works and leaves nothing behind', () => {
    const store = memoryStore()
    expect(canWrite(store)).toBe(true)
    expect(store.data).toEqual({})
    expect(canWrite(failingStore(quotaError()))).toBe(false)
    expect(canWrite(null)).toBe(false)
  })
})
