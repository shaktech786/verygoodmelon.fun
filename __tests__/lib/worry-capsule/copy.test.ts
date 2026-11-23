import { describe, expect, it } from 'vitest'
import { CARRIED_LINES, CLOSED_LINES, FIRST_CLOSED_LINE, NOT_YET_LINES, closedLine, OUTCOME_RESPONSES, outcomeResponse, pickLine, tallyReflection, tallySummary } from '@/lib/games/worry-capsule/copy'

describe('pickLine', () => {
  it('is stable for a capsule and varies across capsules', () => {
    const lines = OUTCOME_RESPONSES.no
    expect(pickLine(lines, 'capsule-1')).toBe(pickLine(lines, 'capsule-1'))
    const picked = new Set(Array.from({ length: 40 }, (_, i) => pickLine(lines, `capsule-${i}`)))
    expect(picked.size).toBeGreaterThan(1)
    for (const line of picked) expect(lines).toContain(line)
  })

  it('has several kind lines for every answer', () => {
    for (const lines of [...Object.values(OUTCOME_RESPONSES), NOT_YET_LINES]) expect(lines.length).toBeGreaterThanOrEqual(3)
  })

  it('never assumes how a worry that came true went, since some are about loss', () => {
    for (const line of OUTCOME_RESPONSES.yes) {
      expect(line).not.toMatch(/brave|got through|other side|tally|counts|handled|met /i)
    }
  })

  it('never weighs a fear: not its size, its likelihood or whether it was worth having', () => {
    const every = Object.values(OUTCOME_RESPONSES).flat().join(' ')
    expect(every).not.toMatch(/small|big|half|weight|never needed|louder|convincing|rarely|imagine|real thing|handled|worth/i)
  })

  it('never calls a worry that came true simply a real thing and leaves it there', () => {
    expect(OUTCOME_RESPONSES.yes.join(' ')).not.toMatch(/This one was\./)
  })
})

describe('outcomeResponse', () => {
  it('follows every "it happened" line with a warm second line about having carried it', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 60; i++) {
      const response = outcomeResponse('yes', `capsule-${i}`)
      const second = CARRIED_LINES.find((line) => response.endsWith(` ${line}`))
      expect(second, response).toBeDefined()
      expect(OUTCOME_RESPONSES.yes.some((first) => response === `${first} ${second}`)).toBe(true)
      seen.add(second as string)
    }
    expect(seen.size).toBeGreaterThan(1)
  })

  it('acknowledges the carrying without assuming the outcome was good or bad', () => {
    expect(CARRIED_LINES.length).toBeGreaterThanOrEqual(3)
    for (const line of CARRIED_LINES) {
      expect(line).toMatch(/carr/i)
      expect(line).not.toMatch(/brave|got through|better|worse|glad|sorry|lucky|okay|fine|handled|survived/i)
    }
  })

  it('is the same every time for one capsule', () => {
    expect(outcomeResponse('yes', 'c1')).toBe(outcomeResponse('yes', 'c1'))
  })

  it('keeps the other answers to their single line', () => {
    expect(outcomeResponse('no', 'c1')).toBe(pickLine(OUTCOME_RESPONSES.no, 'c1'))
    expect(outcomeResponse('partly', 'c1')).toBe(pickLine(OUTCOME_RESPONSES.partly, 'c1'))
  })
})

describe('tallySummary', () => {
  it('says nothing before anything has been looked back on', () => {
    expect(tallySummary({ no: 0, partly: 0, yes: 0, total: 0 })).toBe('')
  })

  it('speaks plainly about a single capsule', () => {
    expect(tallySummary({ no: 1, partly: 0, yes: 0, total: 1 })).toBe('This is the worry you came back to look at. It didn’t happen.')
    expect(tallySummary({ no: 0, partly: 1, yes: 0, total: 1 })).toBe('This is the worry you came back to look at. It partly happened.')
    expect(tallySummary({ no: 0, partly: 0, yes: 1, total: 1 })).toBe('This is the worry you came back to look at. It happened.')
  })

  it('tells only the answers that occurred, without counting them', () => {
    expect(tallySummary({ no: 3, partly: 1, yes: 1, total: 5 })).toBe(
      'These are the worries you came back to look at. Some didn’t happen, some partly happened and some happened.',
    )
    expect(tallySummary({ no: 2, partly: 0, yes: 0, total: 2 })).toBe('These are the worries you came back to look at. None of them happened.')
    expect(tallySummary({ no: 0, partly: 2, yes: 1, total: 3 })).toBe('These are the worries you came back to look at. Some partly happened and some happened.')
  })

  it('never reads as a score: no numbers at all', () => {
    for (const no of [0, 1, 4]) for (const partly of [0, 2]) for (const yes of [0, 3]) {
      expect(tallySummary({ no, partly, yes, total: no + partly + yes })).not.toMatch(/\d/)
    }
  })
})

describe('tallyReflection', () => {
  it('waits for at least two answers', () => {
    expect(tallyReflection({ no: 1, partly: 0, yes: 0, total: 1 })).toBe('')
  })

  it('holds every mix of answers the same way, never weighing the fears', () => {
    const line = 'Whatever came of each one, it is set down here now.'
    expect(tallyReflection({ no: 3, partly: 1, yes: 0, total: 4 })).toBe(line)
    expect(tallyReflection({ no: 0, partly: 1, yes: 2, total: 3 })).toBe(line)
  })
})

describe('closedLine', () => {
  it('greets the first jar on the shelf, then says one stable line per capsule', () => {
    expect(closedLine('a', true)).toBe(FIRST_CLOSED_LINE)
    expect(closedLine('capsule-7', false)).toBe(closedLine('capsule-7', false))
    const seen = new Set(Array.from({ length: 40 }, (_, i) => closedLine(`capsule-${i}`, false)))
    expect(seen.size).toBeGreaterThan(1)
    for (const line of seen) expect(CLOSED_LINES).toContain(line)
  })

  it('assumes nothing about how it turned out, since some worries are about loss', () => {
    for (const line of [...CLOSED_LINES, FIRST_CLOSED_LINE]) expect(line).not.toMatch(/glad|relief|fine|brave|win|proud|happen/i)
  })
})
