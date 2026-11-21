import { describe, it, expect } from 'vitest'
import { plainText } from '@/lib/games/timeless-minds/plain-text'

describe('plainText', () => {
  it('drops bold and italic markers but keeps the words', () => {
    expect(plainText('Call or text **988**, or *Samaritans* on __116 123__ and _soon_.')).toBe(
      'Call or text 988, or Samaritans on 116 123 and soon.'
    )
  })

  it('turns headings, bullet points and numbered lists into plain lines', () => {
    expect(plainText('## A thought\n- first\n* second\n1. third\n2) fourth')).toBe(
      'A thought\nfirst\nsecond\nthird\nfourth'
    )
  })

  it('keeps the text of links, code and quotes without their markup', () => {
    expect(plainText('> See [the helplines](https://findahelpline.com) and `breathe`.')).toBe(
      'See the helplines and breathe.'
    )
  })

  it('leaves ordinary punctuation alone', () => {
    const line = 'Life is short - 3 * 4 is 12, and snake_case_names stay whole.'
    expect(plainText(line)).toBe(line)
  })

  it('removes stray markers left by a cut-off reply', () => {
    expect(plainText('You matter **so')).toBe('You matter so')
  })
})
