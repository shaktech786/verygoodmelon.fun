import { describe, expect, it } from 'vitest'
import { GENTLE_LINE, lineForCare } from '@/lib/care/gentle-line'

describe('lineForCare', () => {
  it.each([
    'The things you worry about most rarely happen. The things that change you most are never on the list.',
    'The kindest thing you can do for your future self is to rest without guilt right now.',
    'Every person you meet is carrying something invisible. That thought alone can soften a whole day.',
  ])('keeps a light line as it is: %s', (line) => {
    expect(lineForCare(line)).toBe(line)
  })

  it.each([
    'Everything you love will one day let go of you, and that is what makes holding it sweet.',
    'Surrender is not defeat; it is the river finally trusting the sea.',
    'Every ending is a door you have not walked through yet.',
    'Nothing lasts, and that is the mercy of it.',
    'Grief is love with nowhere left to go.',
    'Some days the kindest thing is to stop fighting the dark and simply let the night be long.',
    'It is fine to want it all to be over for a while.',
  ])('swaps a line about loss, surrender or endings for the gentle one: %s', (line) => {
    expect(lineForCare(line)).toBe(GENTLE_LINE)
  })

  it('the gentle line passes its own check', () => {
    expect(lineForCare(GENTLE_LINE)).toBe(GENTLE_LINE)
  })
})
