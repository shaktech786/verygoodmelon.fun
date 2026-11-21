import { MAX_SUBMISSION_LENGTH } from './moderation'
import type { CommunityWordsGame } from './useCommunityWords'

/** Session storage only: a draft should survive a reload, never outlast the visit or leave the browser. */
export function draftKey(game: CommunityWordsGame): string {
  return `verygoodmelon:${game}:draft`
}

// A draft is a convenience: if the browser refuses, the words are still on screen.
export function readDraft(key: string): string {
  try {
    return (window.sessionStorage.getItem(key) ?? '').slice(0, MAX_SUBMISSION_LENGTH)
  } catch {
    return ''
  }
}

export function saveDraft(key: string, text: string) {
  try {
    if (text.trim()) window.sessionStorage.setItem(key, text)
    else window.sessionStorage.removeItem(key)
  } catch {
    return
  }
}

export function clearDraft(key: string) {
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    return
  }
}
