import { describe, expect, it } from 'vitest'
import { FALLBACK_ADDRESSEE, bodySize, finalWordKeepsake, letterOf } from '@/lib/keepsake/final-word'
import type { KeepsakeOp } from '@/lib/keepsake/plan'

const day = new Date(2026, 10, 21)
const texts = (ops: KeepsakeOp[]) => ops.filter((op): op is Extract<KeepsakeOp, { kind: 'text' }> => op.kind === 'text').map((op) => op.text)

describe('letterOf', () => {
  it('uses a greeting the player wrote, and leaves it out of the words beneath', () => {
    expect(letterOf({ words: 'Mum, you were right about the garden.', prompt: 'What made it worth it?' })).toEqual({
      to: 'To Mum,',
      body: 'You were right about the garden.',
    })
    expect(letterOf({ words: 'Dear Sam, keep the dog.', prompt: '' })).toEqual({ to: 'To Sam,', body: 'Keep the dog.' })
    expect(letterOf({ words: 'my love: thank you', prompt: '' })).toEqual({ to: 'To my love,', body: 'Thank you' })
  })

  it('otherwise addresses the person the question asked about', () => {
    expect(letterOf({ words: 'Be gentler with yourself.', prompt: 'What would you tell your younger self?' }).to).toBe('To my younger self,')
    expect(letterOf({ words: 'I loved you all.', prompt: 'What do you want the people you love to know?' }).to).toBe('To the people I love,')
  })

  it('falls back to whoever needs it, and never invents a name from an ordinary opening word', () => {
    const letter = letterOf({ words: 'Honestly, it was worth it.', prompt: 'What made it worth it?' })
    expect(letter).toEqual({ to: `To ${FALLBACK_ADDRESSEE},`, body: 'Honestly, it was worth it.' })
    expect(letterOf({ words: 'To be honest, I loved it.', prompt: '' }).to).toBe(`To ${FALLBACK_ADDRESSEE},`)
  })

  it('takes a kin word as the greeting only when a full sentence follows it', () => {
    expect(letterOf({ words: 'My kids, and the sea at dawn.', prompt: 'What small thing did you love most?' })).toEqual({
      to: `To ${FALLBACK_ADDRESSEE},`,
      body: 'My kids, and the sea at dawn.',
    })
    expect(letterOf({ words: 'Mum, and Dad.', prompt: 'Who would you thank?' }).to).toBe(`To ${FALLBACK_ADDRESSEE},`)
    expect(letterOf({ words: 'My kids, the sea.', prompt: 'What do you want the people you love to know?' }).to).toBe('To the people I love,')
  })

  it('never reads "love" as a name, and falls back to the question instead', () => {
    expect(letterOf({ words: 'Love, always. Dad', prompt: 'What do you want the people you love to know?' })).toEqual({
      to: 'To the people I love,',
      body: 'Love, always. Dad',
    })
    expect(letterOf({ words: 'Love, always. Dad', prompt: 'Who would you thank?' }).to).toBe(`To ${FALLBACK_ADDRESSEE},`)
  })

  it('keeps a lone greeting as the words rather than leaving the card empty', () => {
    expect(letterOf({ words: 'Dear Sam,', prompt: '' })).toEqual({ to: `To ${FALLBACK_ADDRESSEE},`, body: 'Dear Sam,' })
  })
})

describe('finalWordKeepsake', () => {
  const plan = finalWordKeepsake({ words: 'Mum, you were right about the garden.', prompt: 'Who would you thank?', day })

  it('draws the greeting and the words themselves', () => {
    const drawn = texts(plan.ops)
    expect(drawn).toContain('To Mum,')
    expect(drawn).toContain('You were right about the garden.')
    expect(drawn).toContain('THE FINAL WORD')
  })

  it('describes and copies the same words', () => {
    expect(plan.alt).toContain('To Mum,')
    expect(plan.alt).toContain('You were right about the garden.')
    expect(plan.alt).toMatch(/candle/)
    expect(plan.text.startsWith('To Mum,\n\nYou were right about the garden.')).toBe(true)
  })

  it('names the file after the game and the day', () => {
    expect(plan.fileName).toBe('the-final-word-2026-11-21.png')
  })

  it('draws a candle mark with a thread of smoke', () => {
    expect(plan.ops.filter((op) => op.kind === 'line').length).toBeGreaterThanOrEqual(2)
  })

  it('is the same picture for the same words', () => {
    expect(finalWordKeepsake({ words: 'Mum, you were right about the garden.', prompt: 'Who would you thank?', day })).toEqual(plan)
  })

  it('writes longer words smaller and limits the lines so they stay on the card', () => {
    expect(bodySize('a'.repeat(50))).toBeGreaterThan(bodySize('a'.repeat(480)))
    const long = finalWordKeepsake({ words: 'word '.repeat(100), prompt: '', day })
    const body = long.ops.find((op) => op.kind === 'text' && op.font === 'serif' && op.text.startsWith('word'))
    expect(body && body.kind === 'text' && body.maxLines).toBeGreaterThan(8)
  })

  it('shows no numbers that could read as a score', () => {
    expect(texts(plan.ops).filter((t) => /\d/.test(t) && !/November/.test(t))).toEqual([])
  })
})
