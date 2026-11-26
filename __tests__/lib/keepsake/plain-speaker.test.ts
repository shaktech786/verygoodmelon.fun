import { describe, expect, it } from 'vitest'
import { lineSize, plainSpeakerKeepsake } from '@/lib/keepsake/plain-speaker'
import { SEED, type KeepsakeOp } from '@/lib/keepsake/plan'

const day = new Date(2026, 10, 21)
const LINE = 'I have grown into this role.'
const BEGIN = 'There’s something I’d like to ask for. Is now a good time?'
const texts = (ops: KeepsakeOp[]) => ops.filter((op): op is Extract<KeepsakeOp, { kind: 'text' }> => op.kind === 'text')

describe('plainSpeakerKeepsake', () => {
  const plan = plainSpeakerKeepsake({ line: LINE, begin: BEGIN, day })

  it('sets their first sentence on the green bar, under "Begin with"', () => {
    const bar = plan.ops.find((op) => op.kind === 'rect' && op.ink === 'rind')
    if (bar?.kind !== 'rect') throw new Error('no green bar')
    const words = texts(plan.ops)
    const label = words.find((op) => op.text === 'Begin with')
    const opening = words.find((op) => op.text === `“${BEGIN}”`)
    for (const op of [label, opening]) {
      expect(op?.y).toBeGreaterThan(bar.y)
      expect(op?.y).toBeLessThan(bar.y + bar.h)
      expect(op?.ink).toBe('sheet')
    }
  })

  it('carries the line in large type below the bar', () => {
    const bar = plan.ops.find((op) => op.kind === 'rect' && op.ink === 'rind')
    const line = texts(plan.ops).find((op) => op.text === LINE)
    if (bar?.kind !== 'rect' || !line) throw new Error('missing')
    expect(line.y).toBeGreaterThan(bar.y + bar.h)
    expect(line.size).toBeGreaterThanOrEqual(48)
    expect(line.weight).toBe(600)
  })

  it('with no separate first sentence, the bar simply names the card', () => {
    const only = plainSpeakerKeepsake({ line: LINE, begin: null, day })
    const words = texts(only.ops).map((op) => op.text)
    expect(words).toContain('One line to carry in')
    expect(words).not.toContain('Begin with')
    expect(only.text.startsWith(LINE)).toBe(true)
    expect(only.alt).toContain(LINE)
  })

  it('describes and copies exactly what they will carry', () => {
    expect(plan.alt).toContain(BEGIN)
    expect(plan.alt).toContain(LINE)
    expect(plan.text.startsWith(`Begin with: “${BEGIN}”\n\n${LINE}`)).toBe(true)
  })

  it('draws the little melon and a door left ajar at the foot of the card', () => {
    // One slice is the envoy; the other is the site's signature at the foot of every keepsake
    expect(plan.ops.filter((op) => op.kind === 'poly' && op.ink === 'flesh')).toHaveLength(2)
    expect(plan.ops.some((op) => op.kind === 'rect' && op.ink === 'brass')).toBe(true)
  })

  it('gives the little melon a kind face: upright eyes and a smile whose corners lift', () => {
    const eyes = plan.ops.filter((op) => op.kind === 'rect' && op.ink === SEED)
    expect(eyes).toHaveLength(2)
    for (const eye of eyes) if (eye.kind === 'rect') expect(eye.h).toBeGreaterThan(eye.w)
    const smile = plan.ops.find((op) => op.kind === 'line' && op.ink === SEED)
    if (smile?.kind !== 'line') throw new Error('no smile')
    const ys = smile.points.map(([, y]) => y)
    expect(Math.max(...ys.slice(1, -1))).toBeGreaterThan(Math.max(ys[0], ys[ys.length - 1]))
  })

  it('names the file after the game and the day', () => {
    expect(plan.fileName).toBe('the-plain-speaker-2026-11-21.png')
  })

  it('is the same card for the same words', () => {
    expect(plainSpeakerKeepsake({ line: LINE, begin: BEGIN, day })).toEqual(plan)
  })

  it('sets a long line smaller, and never lets it run into the foot of the card', () => {
    expect(lineSize('Short.', 400)).toBeGreaterThan(lineSize('x'.repeat(280), 400))
    const long = plainSpeakerKeepsake({ line: 'w '.repeat(140).trim(), begin: 'b '.repeat(140).trim(), day })
    const line = texts(long.ops).find((op) => op.text.startsWith('w w'))
    if (!line?.lineHeight || !line.maxLines) throw new Error('line not wrapped')
    expect(line.y + (line.maxLines - 1) * line.lineHeight).toBeLessThan(1150 - 58 - 120)
  })

  it('shows no numbers that could read as a score', () => {
    expect(texts(plan.ops).map((op) => op.text).filter((t) => /\d/.test(t) && !/November/.test(t))).toEqual([])
  })
})
