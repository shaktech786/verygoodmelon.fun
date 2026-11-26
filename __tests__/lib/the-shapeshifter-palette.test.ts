import { describe, expect, it } from 'vitest'
import { contrast } from '@/lib/design/color'
import { PALETTES } from '@/lib/design/tokens'
import { NEON_CONTRAST, arcadePalette, withAlpha, type Palette } from '@/app/games/the-mutation/engine/palette'

const DARK = ['dark', 'darkQuiet', 'darkHigh'] as const
const INKS: (keyof Palette)[] = ['orb', 'orbGlow', 'star', 'starEdge', 'gem', 'gemEdge', 'shadow', 'tide', 'light', 'glide', 'ring', 'bloom', 'text', 'textDim']

describe('the arcade screen inks', () => {
  for (const name of DARK) {
    const palette = arcadePalette(PALETTES[name])
    it.each(INKS)(`${name}: %s holds ${NEON_CONTRAST}:1 on the field`, (ink) => {
      expect(contrast(palette[ink], palette.bg)).toBeGreaterThanOrEqual(NEON_CONTRAST)
    })
    it(`${name}: the field is deep and the go-action keeps its words readable`, () => {
      expect(contrast(palette.bg, PALETTES[name].ink)).toBeGreaterThan(10)
      expect(contrast(palette.onGo, palette.go)).toBeGreaterThanOrEqual(4.5)
    })
  }

  it('Quiet carries less chroma than Gentle in the same ink', () => {
    expect(arcadePalette(PALETTES.darkQuiet).orb).not.toBe(arcadePalette(PALETTES.dark).orb)
  })

  it('hands the canvas plain colours at an opacity', () => {
    expect(withAlpha('#FF8000', 0.5)).toBe('rgba(255,128,0,0.5)')
  })
})
