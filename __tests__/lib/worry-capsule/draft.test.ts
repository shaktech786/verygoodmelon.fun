import { describe, expect, it } from 'vitest'
import { MAX_WORRY_LENGTH } from '@/lib/games/worry-capsule/capsules'
import { DRAFT_KEY, clearDraft, loadDraft, saveDraft } from '@/lib/games/worry-capsule/draft'
import { type KeyValueStore, STORAGE_KEY } from '@/lib/games/worry-capsule/persistence'

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

const refusing: KeyValueStore = {
  getItem: () => {
    throw new Error('SecurityError')
  },
  setItem: () => {
    throw new Error('QuotaExceededError')
  },
  removeItem: () => {
    throw new Error('SecurityError')
  },
}

describe('a half-written worry', () => {
  it('is kept as it is typed and comes back exactly, with its horizon', () => {
    const store = memoryStore()
    saveDraft(store, { text: 'That the boiler  breaks\nagain', horizon: 'month' })
    expect(loadDraft(store)).toEqual({ text: 'That the boiler  breaks\nagain', horizon: 'month' })
  })

  it('lives under its own key, apart from the sealed capsules', () => {
    const store = memoryStore()
    saveDraft(store, { text: 'Something', horizon: 'week' })
    expect(Object.keys(store.data)).toEqual([DRAFT_KEY])
    expect(DRAFT_KEY).not.toBe(STORAGE_KEY)
  })

  it('is let go when the box is emptied, so nothing blank is kept', () => {
    const store = memoryStore()
    saveDraft(store, { text: 'Something', horizon: 'week' })
    saveDraft(store, { text: '   \n ', horizon: 'week' })
    expect(store.data).toEqual({})
    expect(loadDraft(store)).toBeNull()
  })

  it('is cleared on request', () => {
    const store = memoryStore()
    saveDraft(store, { text: 'Something', horizon: 'season' })
    clearDraft(store)
    expect(loadDraft(store)).toBeNull()
  })

  it('treats nothing saved, damaged data or a foreign shape as no draft', () => {
    expect(loadDraft(memoryStore())).toBeNull()
    expect(loadDraft(memoryStore({ [DRAFT_KEY]: '{oops' }))).toBeNull()
    expect(loadDraft(memoryStore({ [DRAFT_KEY]: '"text"' }))).toBeNull()
    expect(loadDraft(memoryStore({ [DRAFT_KEY]: JSON.stringify({ text: 42 }) }))).toBeNull()
    expect(loadDraft(memoryStore({ [DRAFT_KEY]: JSON.stringify({ text: '  ' }) }))).toBeNull()
  })

  it('repairs an unknown horizon and an over-long text rather than losing the words', () => {
    const long = 'w'.repeat(MAX_WORRY_LENGTH + 50)
    const store = memoryStore({ [DRAFT_KEY]: JSON.stringify({ text: long, horizon: 'decade' }) })
    expect(loadDraft(store)).toEqual({ text: 'w'.repeat(MAX_WORRY_LENGTH), horizon: 'week' })
  })

  it('never throws when the browser refuses storage', () => {
    expect(() => saveDraft(refusing, { text: 'Something', horizon: 'week' })).not.toThrow()
    expect(() => clearDraft(refusing)).not.toThrow()
    expect(loadDraft(refusing)).toBeNull()
    expect(loadDraft(null)).toBeNull()
    expect(() => saveDraft(null, { text: 'Something', horizon: 'week' })).not.toThrow()
  })
})
