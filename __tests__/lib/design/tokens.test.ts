import { describe, expect, it } from 'vitest'
import { chroma, contrast, mixOklab } from '@/lib/design/color'
import { CARE_PAPER, COLOR_ROLES, CONTRAST_PAIRS, PALETTES, SURFACES, type PaletteName } from '@/lib/design/tokens'

const NAMES = Object.keys(PALETTES) as PaletteName[]
const CHROMATIC = ['rind', 'flesh', 'flesh-press', 'seed', 'moss', 'dusk', 'clay'] as const

describe('Seedpress palettes', () => {
  it.each(NAMES)('%s defines every role as a six-digit hex colour', (name) => {
    expect(Object.keys(PALETTES[name]).sort()).toEqual([...COLOR_ROLES].sort())
    for (const value of Object.values(PALETTES[name])) expect(value).toMatch(/^#[0-9A-F]{6}$/)
  })

  for (const name of NAMES) {
    for (const { fg, bg, min, why } of CONTRAST_PAIRS) {
      const backgrounds = bg === 'surface' ? SURFACES : [bg]
      for (const surface of backgrounds) {
        it(`${name}: ${fg} on ${surface} reaches ${min}:1 (${why})`, () => {
          expect(contrast(PALETTES[name][fg], PALETTES[name][surface])).toBeGreaterThanOrEqual(min)
        })
      }
    }
  }

  it('keeps the care block lamplight readable with ink in the light palette', () => {
    const light = PALETTES.light
    const carePaper = mixOklab(light[CARE_PAPER.ink], CARE_PAPER.weight, light[CARE_PAPER.over])
    expect(contrast(light.ink, carePaper)).toBeGreaterThanOrEqual(11)
  })

  it.each(NAMES)('%s: ink and ink-soft stay readable on the care paper', (name) => {
    const p = PALETTES[name]
    const carePaper = mixOklab(p[CARE_PAPER.ink], CARE_PAPER.weight, p[CARE_PAPER.over])
    expect(contrast(p.ink, carePaper)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(p['ink-soft'], carePaper)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(NAMES)('%s: paper is low chroma (OKLCH C at most 0.02)', (name) => {
    expect(chroma(PALETTES[name].paper)).toBeLessThanOrEqual(0.02)
  })

  it.each(NAMES)('%s: only flesh goes above chroma 0.12', (name) => {
    const loud = COLOR_ROLES.filter((role) => chroma(PALETTES[name][role]) > 0.12)
    expect(loud.every((role) => role === 'flesh' || role === 'flesh-press')).toBe(true)
  })

  it.each([
    ['lightQuiet', 'light'],
    ['darkQuiet', 'dark'],
  ] as const)('%s inks carry at most 0.6 of the chroma of %s', (quiet, gentle) => {
    for (const role of CHROMATIC) {
      expect(chroma(PALETTES[quiet][role]), role).toBeLessThanOrEqual(chroma(PALETTES[gentle][role]) * 0.6)
    }
  })
})
