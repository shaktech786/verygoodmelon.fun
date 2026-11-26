import { describe, expect, it } from 'vitest'
import { MAX_FLASHES_PER_SECOND, mostFlashesInASecond, type LuminanceSample } from '../e2e/helpers/flash'
import { wordList } from '@/lib/games/hope-daily/words'
import { aiWordingIn } from '../e2e/helpers/ai-wording'

const FRAME_MS = 1000 / 60

describe('the flash detector', () => {
  it('counts a plain strobe', () => {
    const strobe: LuminanceSample[] = Array.from({ length: 60 }, (_, i) => ({ at: i * FRAME_MS, luminance: i % 2 ? 0.9 : 0.1 }))
    expect(mostFlashesInASecond(strobe)).toBeGreaterThan(MAX_FLASHES_PER_SECOND)
  })

  it('counts a strobe built of steps too small to see between frames: 0.1 to 0.55 in five steps of 0.09, four times a second', () => {
    const samples: LuminanceSample[] = []
    for (let frame = 0; frame < 120; frame++) {
      const inCycle = frame % 15
      samples.push({ at: frame * FRAME_MS, luminance: inCycle <= 5 ? 0.1 + inCycle * 0.09 : 0.1 })
    }
    const biggestStep = Math.max(...samples.slice(1).map((s, i) => Math.abs(s.luminance - samples[i].luminance)))
    expect(biggestStep).toBeLessThanOrEqual(0.45)
    expect(mostFlashesInASecond(samples)).toBeGreaterThan(MAX_FLASHES_PER_SECOND)
  })

  it('counts a slow fade across the whole range as one swing, and ignores small wobble', () => {
    const fade: LuminanceSample[] = Array.from({ length: 100 }, (_, i) => ({ at: i * FRAME_MS, luminance: i / 99 + (i % 2 ? 0.03 : 0) }))
    expect(mostFlashesInASecond(fade)).toBe(1)
    const still: LuminanceSample[] = Array.from({ length: 100 }, (_, i) => ({ at: i * FRAME_MS, luminance: 0.3 + (i % 2 ? 0.05 : 0) }))
    expect(mostFlashesInASecond(still)).toBe(0)
  })
})

describe('the AI wording scan', () => {
  it('lets ordinary phrases through and still catches the rest of the line', () => {
    expect(aiWordingIn('A role model for future generations.')).toBeNull()
    expect(aiWordingIn('Regenerative brakes turn slowing down back into electricity.')).toBeNull()
    expect(aiWordingIn('Panels help generate electricity.')).toBeNull()
    expect(aiWordingIn('Powered by AI')).not.toBeNull()
    expect(aiWordingIn('A role model, and an AI-powered game.')).not.toBeNull()
    expect(aiWordingIn('We generate a story for generations.')).not.toBeNull()
  })

  it('passes every day of The Optimist: no story in the word list reads as AI, model or generating', () => {
    const flagged = wordList.flatMap((entry) => [entry.word, entry.clue, entry.fact].map(aiWordingIn).filter((line) => line !== null))
    expect(flagged).toEqual([])
  })
})
