import { describe, expect, it } from 'vitest'
import { OUTCOME_RESPONSES, pickLine, tallyReflection, tallySummary } from '@/lib/games/worry-capsule/copy'

describe('pickLine', () => {
  it('is stable for a capsule and varies across capsules', () => {
    const lines = OUTCOME_RESPONSES.no
    expect(pickLine(lines, 'capsule-1')).toBe(pickLine(lines, 'capsule-1'))
    const picked = new Set(Array.from({ length: 40 }, (_, i) => pickLine(lines, `capsule-${i}`)))
    expect(picked.size).toBeGreaterThan(1)
    for (const line of picked) expect(lines).toContain(line)
  })

  it('has several kind lines for every answer', () => {
    for (const lines of Object.values(OUTCOME_RESPONSES)) expect(lines.length).toBeGreaterThanOrEqual(3)
  })
})

describe('tallySummary', () => {
  it('says nothing before anything has been looked back on', () => {
    expect(tallySummary({ no: 0, partly: 0, yes: 0, total: 0 })).toBe('')
  })

  it('speaks plainly about a single capsule', () => {
    expect(tallySummary({ no: 1, partly: 0, yes: 0, total: 1 })).toBe('You’ve looked back on 1 worry. It didn’t happen.')
    expect(tallySummary({ no: 0, partly: 1, yes: 0, total: 1 })).toBe('You’ve looked back on 1 worry. It partly happened.')
    expect(tallySummary({ no: 0, partly: 0, yes: 1, total: 1 })).toBe('You’ve looked back on 1 worry. It happened, and you got through it.')
  })

  it('lists only the answers that occurred', () => {
    expect(tallySummary({ no: 3, partly: 1, yes: 1, total: 5 })).toBe(
      'You’ve looked back on 5 worries: 3 didn’t happen, 1 partly happened and 1 happened.',
    )
    expect(tallySummary({ no: 2, partly: 0, yes: 0, total: 2 })).toBe('You’ve looked back on 2 worries: 2 didn’t happen.')
    expect(tallySummary({ no: 0, partly: 2, yes: 1, total: 3 })).toBe('You’ve looked back on 3 worries: 2 partly happened and 1 happened.')
  })
})

describe('tallyReflection', () => {
  it('waits for at least two answers', () => {
    expect(tallyReflection({ no: 1, partly: 0, yes: 0, total: 1 })).toBe('')
  })

  it('notices when most fears never arrived', () => {
    expect(tallyReflection({ no: 3, partly: 1, yes: 0, total: 4 })).toBe('Most of what you feared never arrived.')
    expect(tallyReflection({ no: 1, partly: 0, yes: 1, total: 2 })).toBe('Half of what you feared never arrived.')
  })

  it('notices when worries came smaller than feared', () => {
    expect(tallyReflection({ no: 1, partly: 2, yes: 1, total: 4 })).toBe('Most of them turned out smaller than they felt.')
  })

  it('stays kind when worries came true', () => {
    expect(tallyReflection({ no: 0, partly: 1, yes: 2, total: 3 })).toBe(
      'Some worries are about real things. You met these, and came back to look.',
    )
  })
})
