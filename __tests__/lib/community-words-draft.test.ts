import { describe, it, expect, beforeEach, vi } from 'vitest'
import { clearDraft, draftKey, readDraft, saveDraft } from '@/lib/games/community-words/draft'
import { MAX_SUBMISSION_LENGTH } from '@/lib/games/community-words/moderation'

describe('writing-game drafts', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('keeps each game’s draft apart for the visit', () => {
    saveDraft(draftKey('last-words'), 'Tell Mum the garden was hers')
    saveDraft(draftKey('first-words'), 'Oh. It is so quiet.')

    expect(readDraft(draftKey('last-words'))).toBe('Tell Mum the garden was hers')
    expect(readDraft(draftKey('first-words'))).toBe('Oh. It is so quiet.')
    expect(sessionStorage.length).toBe(2)
    expect(localStorage.length).toBe(0)
  })

  it('forgets the draft once it is cleared or emptied', () => {
    const key = draftKey('last-words')
    saveDraft(key, 'Something true')
    clearDraft(key)
    expect(readDraft(key)).toBe('')

    saveDraft(key, 'Something true')
    saveDraft(key, '   ')
    expect(readDraft(key)).toBe('')
    expect(sessionStorage.length).toBe(0)
  })

  it('never hands back more than a submission can hold', () => {
    const key = draftKey('first-words')
    sessionStorage.setItem(key, 'a'.repeat(MAX_SUBMISSION_LENGTH + 40))
    expect(readDraft(key)).toHaveLength(MAX_SUBMISSION_LENGTH)
  })

  it('quietly does without a draft when the browser refuses storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const key = draftKey('last-words')
    expect(() => saveDraft(key, 'words')).not.toThrow()
    expect(readDraft(key)).toBe('')
  })
})
