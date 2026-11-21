import { describe, it, expect } from 'vitest'
import { excerpt, wakingLine } from '@/lib/games/community-words/waking'

describe('excerpt', () => {
  it('keeps short words whole', () => {
    expect(excerpt('  Oh.   It is so quiet. ')).toBe('Oh. It is so quiet.')
  })

  it('shortens long words at a word boundary', () => {
    const long = 'Oh. Mum? I was so scared of this part and it was just quiet. I wish I had danced more.'
    const short = excerpt(long)
    expect(short.endsWith('…')).toBe(true)
    expect(short.length).toBeLessThanOrEqual(61)
    expect(long.startsWith(short.slice(0, -1))).toBe(true)
    expect(short).not.toMatch(/\s…$/)
  })
})

describe('wakingLine', () => {
  it('links what they said over there to what they bring back', () => {
    expect(wakingLine({ words: 'I wish I had danced more.', intention: 'Put on one song and dance', care: false })).toBe(
      'Over there, you said “I wish I had danced more.” You woke up with this:'
    )
  })

  it('still links back when they chose nothing to carry', () => {
    expect(wakingLine({ words: 'Where is everyone?', intention: '  ', care: false })).toBe(
      'Over there, you said “Where is everyone?” Whatever you reached for there is within reach here, too.'
    )
  })

  it('never repeats words that sounded like someone in danger', () => {
    const line = wakingLine({ words: 'I never want to go back', intention: '', care: true })
    expect(line).not.toContain('go back')
    expect(line).toMatch(/good to have you here/i)
  })
})
