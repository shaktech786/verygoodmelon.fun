import { describe, expect, it } from 'vitest'
import { awakeningKeepsake, noteSize } from '@/lib/keepsake/awakening'
import type { KeepsakeOp } from '@/lib/keepsake/plan'

const day = new Date(2026, 10, 21)
const NOTE = 'Dance with Sam after dinner.'
const texts = (ops: KeepsakeOp[]) => ops.filter((op): op is Extract<KeepsakeOp, { kind: 'text' }> => op.kind === 'text')

describe('awakeningKeepsake', () => {
  const plan = awakeningKeepsake({ note: `  ${NOTE} `, day })

  it('writes the plan for tomorrow on the note, in the reading face, under short titles in the display face', () => {
    const note = texts(plan.ops).find((op) => op.text === NOTE)
    expect(note?.font).toBe('sans')
    expect(texts(plan.ops).find((op) => op.text === 'For tomorrow')?.font).toBe('display')
    expect(texts(plan.ops).map((op) => op.text)).toEqual(expect.arrayContaining(['Good morning', 'For tomorrow', 'The Awakening']))
  })

  it('draws a sun over the hills in the glass inks, the same in either theme', () => {
    const sun = plan.ops.find((op) => op.kind === 'disc' && op.r === 92)
    expect(sun && typeof sun.ink !== 'string' && JSON.stringify(sun.ink).includes('glass-')).toBe(true)
    expect(plan.ops.filter((op) => op.kind === 'poly').length).toBeGreaterThanOrEqual(2)
  })

  it('describes and copies the note', () => {
    expect(plan.alt).toContain(NOTE)
    expect(plan.alt).toMatch(/sun/i)
    expect(plan.text.startsWith(`Good morning.\n\nFor tomorrow: ${NOTE}`)).toBe(true)
  })

  it('names the file after the game and the day', () => {
    expect(plan.fileName).toBe('the-awakening-2026-11-21.png')
  })

  it('is the same picture for the same note, and a different sky of stars for another', () => {
    expect(awakeningKeepsake({ note: NOTE, day })).toEqual(plan)
    expect(awakeningKeepsake({ note: 'Ring Grandad', day }).ops).not.toEqual(plan.ops)
  })

  it('writes a longer plan smaller so the whole of it fits the note', () => {
    expect(noteSize('Ring Grandad')).toBeGreaterThan(noteSize('x'.repeat(120)))
    const long = awakeningKeepsake({ note: 'Call Grandad after breakfast and ask him about the summer he spent fixing boats by the harbour', day })
    const note = texts(long.ops).find((op) => op.text.startsWith('Call Grandad'))
    expect(note?.maxLines).toBeGreaterThanOrEqual(5)
  })

  it('shows no numbers that could read as a score', () => {
    expect(texts(plan.ops).map((op) => op.text).filter((t) => /\d/.test(t) && !/November/.test(t))).toEqual([])
  })
})
