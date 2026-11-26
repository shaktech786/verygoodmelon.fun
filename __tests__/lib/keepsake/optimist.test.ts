import { describe, expect, it } from 'vitest'
import { CLIPPING, optimistKeepsake, storyWithWord } from '@/lib/keepsake/optimist'
import type { KeepsakeOp } from '@/lib/keepsake/plan'
import type { Reveal } from '@/lib/games/hope-daily/puzzle'

const day = new Date(2026, 10, 21)
const REVEAL: Reveal = {
  word: 'TOPSOIL',
  category: 'Nature',
  kind: 'wonder',
  story: [[{ text: 'Beneath your feet, a single gram of healthy ' }, { text: 'topsoil', word: true }, { text: ' holds a billion bacteria.' }]],
  source: 'https://www.cfaes.osu.edu/news',
  reflection: 'Under every step you take, a crowd too small to see is busy.',
}
const texts = (ops: KeepsakeOp[]) => ops.filter((op): op is Extract<KeepsakeOp, { kind: 'text' }> => op.kind === 'text')

describe('optimistKeepsake', () => {
  const plan = optimistKeepsake({ reveal: REVEAL, day })

  it('inks the found word into its slots by hand, one letter to a slot', () => {
    const letters = texts(plan.ops).filter((op) => op.font === 'display' && op.text.length === 1)
    expect(letters.map((op) => op.text).join('')).toBe('TOPSOIL')
    expect(new Set(letters.map((op) => op.ink))).toEqual(new Set(['rind']))
    const xs = letters.map((op) => op.x)
    expect(xs).toEqual([...xs].sort((a, b) => a - b))
    expect(Math.min(...xs)).toBeGreaterThan(CLIPPING.left)
    expect(Math.max(...xs)).toBeLessThan(CLIPPING.right)
  })

  it('prints the story with the word in place, and the source', () => {
    expect(storyWithWord(REVEAL)).toBe('Beneath your feet, a single gram of healthy topsoil holds a billion bacteria.')
    const words = texts(plan.ops).map((op) => op.text)
    expect(words).toContain(storyWithWord(REVEAL))
    expect(words).toContain('Source: cfaes.osu.edu')
    expect(words).toContain('Nature · something hopeful to know')
  })

  it('keeps a very long word inside the clipping', () => {
    const long = optimistKeepsake({ reveal: { ...REVEAL, word: 'PHOTOSYNTHESIS' }, day })
    const letters = texts(long.ops).filter((op) => op.font === 'display' && op.text.length === 1)
    expect(letters).toHaveLength(14)
    expect(Math.min(...letters.map((op) => op.x))).toBeGreaterThan(CLIPPING.left)
    expect(Math.max(...letters.map((op) => op.x))).toBeLessThan(CLIPPING.right)
  })

  it('describes the clipping, copies as words, and is named for the day', () => {
    expect(plan.alt).toBe(
      'A newspaper clipping of today’s good news, filed under Nature. The missing word, TOPSOIL, is inked into its place by hand. It reads: “Beneath your feet, a single gram of healthy topsoil holds a billion bacteria.” Beneath it: “Under every step you take, a crowd too small to see is busy.”',
    )
    expect(plan.text).toMatch(/^Beneath your feet.*\n\nUnder every step.*\n\nSource: https:\/\/www\.cfaes\.osu\.edu\/news/)
    expect(plan.fileName).toBe('the-optimist-2026-11-21.png')
  })
})
