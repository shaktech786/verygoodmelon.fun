import { describe, expect, it } from 'vitest'
import {
  CHECK_IN_AFTER_MS,
  KEEP_WINDOW_MS,
  RESUME_WINDOW_MS,
  STORAGE_KEY,
  asCarryLine,
  carryNotes,
  chooseKind,
  decideReturn,
  newSession,
  openingText,
  parseSession,
  readSaved,
  serializeSession,
  writeSaved,
  type Session,
} from '@/lib/games/hard-talk/session'
import { TALKS, TEXT_MAX, WHO_MAX } from '@/lib/games/hard-talk/content'

const NOW = new Date('2026-11-21T10:00:00Z').getTime()
const HOUR = 60 * 60 * 1000

function session(overrides: Partial<Session> = {}): Session {
  return { ...newSession(0, NOW), ...overrides }
}

describe('a new session', () => {
  it('starts at the first step with nothing chosen or written', () => {
    expect(newSession(3, NOW)).toEqual({
      version: 1,
      run: 3,
      step: 'kind',
      kind: null,
      who: '',
      understand: '',
      worry: null,
      openingPick: null,
      ownOpening: '',
      breaths: 0,
      updatedAt: NOW,
      finishedAt: null,
      checkIn: null,
    })
  })
})

describe('choosing the kind of talk', () => {
  it('keeps what was written but clears choices that belonged to the old kind', () => {
    const before = session({
      kind: 'ask', who: 'Sam', understand: 'I have grown here', worry: 'no', openingPick: 1, ownOpening: 'Hi Sam',
    })
    const after = chooseKind(before, 'sorry')
    expect(after).toMatchObject({ kind: 'sorry', who: 'Sam', understand: 'I have grown here', ownOpening: 'Hi Sam' })
    expect(after.worry).toBeNull()
    expect(after.openingPick).toBeNull()
  })

  it('keeps a written first sentence chosen as the opening', () => {
    expect(chooseKind(session({ kind: 'ask', openingPick: 'own', ownOpening: 'Hi' }), 'tell').openingPick).toBe('own')
  })

  it('changes nothing when the same kind is picked again', () => {
    const before = session({ kind: 'ask', worry: 'no', openingPick: 2 })
    expect(chooseKind(before, 'ask')).toEqual(before)
  })
})

describe('reading a saved session', () => {
  it('round-trips through storage', () => {
    const saved = session({ kind: 'tell', step: 'worry', who: 'Mum', understand: 'I am moving away', worry: 'reaction', breaths: 3 })
    expect(parseSession(serializeSession(saved))).toEqual(saved)
  })

  it('treats missing, corrupt or foreign data as no session', () => {
    expect(parseSession(null)).toBeNull()
    expect(parseSession('{oops')).toBeNull()
    expect(parseSession('"a string"')).toBeNull()
    expect(parseSession(JSON.stringify({ ...session(), version: 2 }))).toBeNull()
    expect(parseSession(JSON.stringify({ ...session(), kind: 'shout' }))).toBeNull()
    expect(parseSession(JSON.stringify({ ...session(), step: 'nowhere' }))).toBeNull()
    expect(parseSession(JSON.stringify({ ...session(), updatedAt: 'yesterday' }))).toBeNull()
  })

  it('drops a worry or opening that does not belong to the saved kind', () => {
    const parsed = parseSession(JSON.stringify({ ...session(), kind: 'ask', worry: 'forget', openingPick: 9 }))
    expect(parsed?.worry).toBeNull()
    expect(parsed?.openingPick).toBeNull()
  })

  it('trims text that has grown past its limit', () => {
    const parsed = parseSession(JSON.stringify({ ...session(), who: 'x'.repeat(500), understand: 'y'.repeat(5000) }))
    expect(parsed?.who).toHaveLength(WHO_MAX)
    expect(parsed?.understand).toHaveLength(TEXT_MAX)
  })
})

describe('storage', () => {
  it('reports storage as unavailable when the browser refuses it, without throwing', () => {
    const refusing = { getItem: () => { throw new Error('SecurityError') } }
    expect(readSaved(refusing)).toEqual({ session: null, available: false })
    expect(readSaved(null)).toEqual({ session: null, available: false })
    expect(writeSaved({ setItem: () => { throw new Error('QuotaExceeded') } }, session())).toBe(false)
    expect(writeSaved(null, session())).toBe(false)
  })

  it('reads and writes under its own key', () => {
    const store = new Map<string, string>()
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) }
    expect(readSaved(storage)).toEqual({ session: null, available: true })
    expect(writeSaved(storage, session({ kind: 'doctor' }))).toBe(true)
    expect([...store.keys()]).toEqual([STORAGE_KEY])
    expect(readSaved(storage).session?.kind).toBe('doctor')
  })
})

describe('coming back', () => {
  it('starts fresh with nothing saved', () => {
    expect(decideReturn(null, NOW)).toEqual({ type: 'fresh', run: 0 })
  })

  it('quietly resumes at the same step within the resume window', () => {
    const s = session({ step: 'opening', kind: 'ask', updatedAt: NOW - RESUME_WINDOW_MS })
    expect(decideReturn(s, NOW)).toEqual({ type: 'resume', session: s })
  })

  it('offers to carry on or start fresh when the player comes back days later', () => {
    const s = session({ step: 'worry', kind: 'tell', updatedAt: NOW - 3 * 24 * HOUR })
    expect(decideReturn(s, NOW)).toEqual({ type: 'offer', session: s })
  })

  it('lets an untouched session simply start fresh, without an offer', () => {
    expect(decideReturn(session({ run: 4, updatedAt: NOW - 3 * 24 * HOUR }), NOW)).toEqual({ type: 'fresh', run: 4 })
  })

  it('forgets an old unfinished session after the keep window', () => {
    const s = session({ run: 2, step: 'worry', kind: 'tell', updatedAt: NOW - KEEP_WINDOW_MS - 1 })
    expect(decideReturn(s, NOW)).toEqual({ type: 'fresh', run: 3 })
  })

  it('offers the after-the-talk check-in for a finished session, then lets it go', () => {
    const done = session({ step: 'carry', kind: 'ask', finishedAt: NOW - 2 * HOUR, updatedAt: NOW - 2 * HOUR })
    expect(decideReturn(done, NOW)).toEqual({ type: 'check-in', session: done })
    const old = { ...done, finishedAt: NOW - KEEP_WINDOW_MS - 1 }
    expect(decideReturn(old, NOW)).toEqual({ type: 'fresh', run: 1 })
  })

  it('shows the line again, not a check-in, until the talk could have happened', () => {
    const justDone = session({ step: 'carry', kind: 'ask', finishedAt: NOW - 5 * 60 * 1000, updatedAt: NOW - 5 * 60 * 1000 })
    expect(decideReturn(justDone, NOW)).toEqual({ type: 'resume', session: justDone })
    const edge = { ...justDone, finishedAt: NOW - CHECK_IN_AFTER_MS + 1 }
    expect(decideReturn(edge, NOW)).toEqual({ type: 'resume', session: edge })
    const later = { ...justDone, finishedAt: NOW - CHECK_IN_AFTER_MS }
    expect(decideReturn(later, NOW)).toEqual({ type: 'check-in', session: later })
  })

  it('waits at least half an hour before asking how it went', () => {
    expect(CHECK_IN_AFTER_MS).toBeGreaterThanOrEqual(30 * 60 * 1000)
  })

  it('shows the line again when the clock says it finished in the future', () => {
    const s = session({ step: 'carry', kind: 'ask', finishedAt: NOW + HOUR, updatedAt: NOW + HOUR })
    expect(decideReturn(s, NOW)).toEqual({ type: 'resume', session: s })
  })

  it('does not trust a clock that has gone backwards', () => {
    const s = session({ step: 'opening', kind: 'ask', updatedAt: NOW + 5 * HOUR })
    expect(decideReturn(s, NOW)).toEqual({ type: 'resume', session: s })
  })
})

describe('what the player carries in', () => {
  it('uses the chosen first sentence or the one they wrote', () => {
    expect(openingText(session({ kind: 'ask', openingPick: 0 }))).toBe(TALKS.ask.openings[0])
    expect(openingText(session({ kind: 'ask', openingPick: 'own', ownOpening: '  Hi Sam.  ' }))).toBe('Hi Sam.')
    expect(openingText(session({ kind: 'ask', openingPick: 'own', ownOpening: '   ' }))).toBeNull()
    expect(openingText(session({ kind: 'ask' }))).toBeNull()
  })

  it('builds the line from what they most want understood, and begins with their first sentence', () => {
    const notes = carryNotes(session({ kind: 'ask', understand: ' I have grown into this role ', openingPick: 0 }))
    expect(notes).toEqual({ line: 'I have grown into this role.', ownWords: true, begin: TALKS.ask.openings[0] })
  })

  it('uses their own first sentence as the line when that is all they wrote', () => {
    const notes = carryNotes(session({ kind: 'tell', openingPick: 'own', ownOpening: 'Mum, I have news' }))
    expect(notes).toEqual({ line: 'Mum, I have news.', ownWords: true, begin: null })
  })

  it('uses a chosen first sentence as the line when nothing was written', () => {
    const notes = carryNotes(session({ kind: 'doctor', openingPick: 1 }))
    expect(notes).toEqual({ line: TALKS.doctor.openings[1], ownWords: false, begin: null })
  })

  it('falls back to a stock line only when nothing was written or chosen', () => {
    expect(carryNotes(session({ kind: null }))).toEqual({ line: TALKS.other.carry[0], ownWords: false, begin: null })
    expect(carryNotes(session({ kind: 'sorry', understand: '   ', openingPick: 'own', ownOpening: ' ' }))).toEqual({
      line: TALKS.sorry.carry[0], ownWords: false, begin: null,
    })
  })

  it('still varies the stock line between runs', () => {
    expect(carryNotes(session({ kind: 'sorry', run: 0 })).line).not.toBe(carryNotes(session({ kind: 'sorry', run: 1 })).line)
  })
})

describe('tidying their words into a line', () => {
  it('keeps their words, joined onto one line, with a capital and a full stop', () => {
    expect(asCarryLine('  i missed your\n\nbirthday  ')).toBe('I missed your birthday.')
  })

  it('leaves their own punctuation alone', () => {
    expect(asCarryLine('Can we talk?')).toBe('Can we talk?')
    expect(asCarryLine('I need this!')).toBe('I need this!')
    expect(asCarryLine('So…')).toBe('So…')
    expect(asCarryLine('It matters (to me)')).toBe('It matters (to me)')
  })

  it('drops quote marks wrapped around the whole thing, as the examples show them', () => {
    expect(asCarryLine('“The pain is worse at night.”')).toBe('The pain is worse at night.')
    expect(asCarryLine('"I want to stay"')).toBe('I want to stay.')
  })

  it('is empty when there is nothing but space or quote marks', () => {
    expect(asCarryLine('  “ ” ')).toBe('')
  })
})
