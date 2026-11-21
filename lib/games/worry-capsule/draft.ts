import { type Horizon, HORIZONS, MAX_WORRY_LENGTH } from './capsules'
import type { KeyValueStore } from './persistence'

export const DRAFT_KEY = 'verygoodmelon:worry-capsule:draft'

export interface WorryDraft {
  text: string
  horizon: Horizon
}

// A draft is a convenience: if the browser refuses, the words are still on screen.
export function saveDraft(store: KeyValueStore | null, draft: WorryDraft) {
  if (!store) return
  try {
    if (draft.text.trim()) store.setItem(DRAFT_KEY, JSON.stringify({ text: draft.text, horizon: draft.horizon }))
    else store.removeItem(DRAFT_KEY)
  } catch {
    return
  }
}

export function clearDraft(store: KeyValueStore | null) {
  try {
    store?.removeItem(DRAFT_KEY)
  } catch {
    return
  }
}

export function loadDraft(store: KeyValueStore | null): WorryDraft | null {
  if (!store) return null
  let data: unknown
  try {
    data = JSON.parse(store.getItem(DRAFT_KEY) ?? 'null')
  } catch {
    return null
  }
  if (typeof data !== 'object' || data === null) return null
  const { text, horizon } = data as Record<string, unknown>
  if (typeof text !== 'string' || !text.trim()) return null
  return {
    text: text.slice(0, MAX_WORRY_LENGTH),
    horizon: HORIZONS.find((h) => h.id === horizon)?.id ?? 'week',
  }
}
