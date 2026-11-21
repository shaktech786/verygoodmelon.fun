import { describe, it, expect } from 'vitest'
import { keepKnownAnswers, keepKnownIds } from '@/lib/games/hard-choices/answers'
import { DILEMMAS } from '@/lib/games/hard-choices/dilemmas'

const known = DILEMMAS[0].id
const alsoKnown = DILEMMAS[1].id

describe('stored answers from an earlier set of dilemmas', () => {
  it('keeps answers to dilemmas that still exist', () => {
    expect(keepKnownAnswers({ [known]: 'A', [alsoKnown]: 'skip' })).toEqual({ [known]: 'A', [alsoKnown]: 'skip' })
  })

  it('quietly drops answers to dilemmas that were retired', () => {
    expect(keepKnownAnswers({ [known]: 'B', 'trolley-personal': 'A', 'memory-erasure': 'skip' })).toEqual({ [known]: 'B' })
  })

  it('drops answers that are not A, B or a skip', () => {
    expect(keepKnownAnswers({ [known]: 'C', [alsoKnown]: 1 })).toEqual({})
  })

  it('starts empty from anything that is not a plain object of answers', () => {
    for (const stored of [null, undefined, 'A', 42, ['A'], true]) {
      expect(keepKnownAnswers(stored)).toEqual({})
    }
  })

  it('keeps only known ids in the list of dilemmas already counted', () => {
    expect(keepKnownIds([known, 'children-climate', 7, alsoKnown])).toEqual([known, alsoKnown])
    expect(keepKnownIds({ not: 'a list' })).toEqual([])
  })
})
