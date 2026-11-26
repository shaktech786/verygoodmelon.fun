import { describe, expect, it } from 'vitest'
import { isOwnMix } from '@/lib/accessibility/own-mix'
import { DEFAULT_ACCESSIBILITY_SETTINGS } from '@/types/accessibility'

describe('isOwnMix', () => {
  it('is false for the defaults, whatever the dial and the look of the page say', () => {
    expect(isOwnMix(DEFAULT_ACCESSIBILITY_SETTINGS)).toBe(false)
    expect(isOwnMix({ ...DEFAULT_ACCESSIBILITY_SETTINGS, sense: 'quiet', theme: 'dark', textSize: 'larger', spacing: 'roomy', volume: 10 })).toBe(false)
  })

  it.each([
    { reduceMotion: true },
    { greyscale: true },
    { muted: true },
    { contrast: 'high' as const },
    { contrast: 'extra-high' as const },
  ])('is true once %o moves away from the dial’s defaults', (change) => {
    expect(isOwnMix({ ...DEFAULT_ACCESSIBILITY_SETTINGS, ...change })).toBe(true)
  })

  it('measures from what the device asks for, so device settings are not a mix', () => {
    const device = { ...DEFAULT_ACCESSIBILITY_SETTINGS, reduceMotion: true, contrast: 'high' as const }
    expect(isOwnMix(device, device)).toBe(false)
    expect(isOwnMix({ ...device, reduceMotion: false }, device)).toBe(true)
  })
})
