import { describe, it, expect } from 'vitest'
import { isUnsettled, judgementOf, verdictOf } from '@/lib/games/community-words/judgement'

describe('verdictOf', () => {
  it('is safe only when the reply says so outright', () => {
    expect(verdictOf({ reflection: 'Say it soon.', safe: true })).toBe('safe')
    expect(verdictOf({ reflection: 'Carry it home.', intention: 'Dance.', safe: true })).toBe('safe')
  })

  it.each([
    ['no reply at all', null],
    ['an empty reply', {}],
    ['a reflection with no verdict', { reflection: 'Say it soon.' }],
    ['an unjudged reply', { reflection: 'Whatever is underneath these words, they deserved to be said.', unjudged: true }],
    ['a reply that contradicts itself', { reflection: 'Hm.', safe: true, unjudged: true }],
  ])('reads %s as unjudged, never as safe', (_name, reply) => {
    expect(verdictOf(reply)).toBe('unjudged')
  })

  it('lets care win over anything else in the reply', () => {
    expect(verdictOf({ reflection: 'Thank you for trusting this page.', care: true })).toBe('care')
    expect(verdictOf({ care: true, safe: true })).toBe('care')
  })
})

describe('judgementOf', () => {
  it('has nothing to judge before anything is written', () => {
    expect(judgementOf({ submitted: false, care: false, verdict: null })).toBe('unwritten')
  })

  it('holds while the reply is on its way', () => {
    expect(judgementOf({ submitted: true, care: false, verdict: null })).toBe('awaiting')
  })

  it('passes the verdict through once it arrives', () => {
    expect(judgementOf({ submitted: true, care: false, verdict: 'safe' })).toBe('safe')
    expect(judgementOf({ submitted: true, care: false, verdict: 'unjudged' })).toBe('unjudged')
  })

  it('is care whenever the visit is in care, whatever the reply said', () => {
    for (const verdict of [null, 'safe', 'unjudged', 'care'] as const) {
      expect(judgementOf({ submitted: true, care: true, verdict })).toBe('care')
    }
  })
})

describe('isUnsettled', () => {
  it('is true only while the words are written but not known to be safe or to need care', () => {
    expect(isUnsettled('awaiting')).toBe(true)
    expect(isUnsettled('unjudged')).toBe(true)
    expect(isUnsettled('safe')).toBe(false)
    expect(isUnsettled('care')).toBe(false)
    expect(isUnsettled('unwritten')).toBe(false)
  })
})
