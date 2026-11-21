import { describe, expect, it } from 'vitest'
import {
  LETTER_DROP_GAP_MS,
  LETTER_DROP_MS,
  SOLVED_CHIME_LOUDNESS,
  letterDropDelayMs,
  lettersLandAfterSeconds,
} from '@/lib/games/hope-daily/solved'

describe('the found word settling into its slots', () => {
  it('drops the letters one by one, about 60ms apart, first letter first', () => {
    expect(LETTER_DROP_GAP_MS).toBe(60)
    expect([0, 1, 2, 3, 4].map(letterDropDelayMs)).toEqual([0, 60, 120, 180, 240])
  })

  it('rings the chime as the last letter lands, or straight away when nothing moves', () => {
    expect(lettersLandAfterSeconds(5, true)).toBeCloseTo((240 + LETTER_DROP_MS) / 1000)
    expect(lettersLandAfterSeconds(5, false)).toBe(0)
    expect(lettersLandAfterSeconds(0, true)).toBe(0)
  })

  it('keeps even the longest word under a second and a half', () => {
    expect(lettersLandAfterSeconds(15, true)).toBeLessThan(1.5)
  })

  it('keeps the chime gentle', () => {
    expect(SOLVED_CHIME_LOUDNESS).toBeLessThanOrEqual(0.06)
  })
})
