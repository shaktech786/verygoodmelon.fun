import { describe, expect, it } from 'vitest'
import { ALCHEMIST_HEIGHT, alchemistKeepsake } from '@/lib/keepsake/alchemist'
import { WORKS, composeLetter } from '@/lib/games/idea-lab/golds'
import type { Concept } from '@/lib/games/idea-lab/concepts'

const day = new Date(2026, 10, 21)
const concept = (name: string): Concept => ({ id: name.toLowerCase(), name, emoji: '✨', description: '' })
// Courage first, then the rest of the Great Work in the table's order
const found = [concept('Jealousy'), concept('Courage'), ...WORKS[0].filter((g) => g.name !== 'Courage').map((g) => concept(g.name))]
const letter = composeLetter(0, found)
const words = (plan: ReturnType<typeof alchemistKeepsake>) => plan.ops.flatMap((op) => (op.kind === 'text' ? [op.text] : []))

describe('alchemistKeepsake: the Great Work letter as a sheet to keep', () => {
  const plan = alchemistKeepsake({ letter, day })

  it('names every gold in the order it was found, each with a coin and what it means', () => {
    const shown = words(plan)
    const golds = letter.lines.map((line) => line.gold)
    expect(golds[0]).toBe('Courage')
    const positions = golds.map((gold) => shown.indexOf(gold))
    expect(positions.every((p) => p >= 0)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
    for (const line of letter.lines) expect(shown).toContain(`…${line.meaning}`)
    expect(plan.ops.filter((op) => op.kind === 'disc' && op.ink === 'gold')).toHaveLength(7)
  })

  it('carries the title and the farewell, and no count of tries', () => {
    const shown = words(plan)
    expect(shown).toContain('The Great Work')
    expect(shown).toContain(letter.closing[1])
    expect(shown.filter((t) => /\d/.test(t) && !/November/.test(t))).toEqual([])
  })

  it('copies the whole letter as text and describes it for screen readers', () => {
    for (const line of letter.lines) expect(plan.text).toContain(line.text)
    expect(plan.text).toContain(letter.opening)
    expect(plan.alt).toContain('Courage, Healing')
    expect(plan.title).toBe('The Alchemist')
    expect(plan.fileName).toBe('the-alchemist-2026-11-21.png')
  })

  it('keeps every word on the sheet, above the site name', () => {
    expect(plan.height).toBe(ALCHEMIST_HEIGHT)
    const texts = plan.ops.filter((op): op is Extract<typeof op, { kind: 'text' }> => op.kind === 'text')
    const farewell = texts.find((op) => op.text === letter.closing[1])
    expect(farewell!.y + (farewell!.lineHeight ?? 0)).toBeLessThan(ALCHEMIST_HEIGHT - 170)
  })
})
