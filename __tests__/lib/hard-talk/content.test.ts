import { describe, expect, it } from 'vitest'
import {
  CHECK_INS,
  KINDNESS,
  SETTLE,
  TALKS,
  TALK_KINDS,
  pick,
  themLine,
  worriesFor,
  type Prompt,
} from '@/lib/games/hard-talk/content'

/** Every line a player can read during a run. */
function allCopy(): string[] {
  const lines: string[] = []
  const prompts: Prompt[] = [...SETTLE.shoulders, ...SETTLE.ground, ...KINDNESS]
  for (const p of prompts) lines.push(p.line, p.sub)
  for (const kind of TALK_KINDS) {
    const t = TALKS[kind]
    lines.push(t.label, t.detail, t.understand.heading, t.understand.example, t.them.named, t.them.unnamed, t.them.listen)
    lines.push(...t.openings, ...t.carry)
    for (const w of worriesFor(kind)) lines.push(w.label, w.response)
  }
  for (const c of CHECK_INS) lines.push(c.label, c.response)
  return lines
}

const sentences = (text: string) => (text.match(/[.!?…](?=\s|”|$)/g) ?? []).length

describe('content integrity', () => {
  it('has a complete, distinct set of content for every kind of talk', () => {
    for (const kind of TALK_KINDS) {
      const t = TALKS[kind]
      expect(t.openings).toHaveLength(3)
      expect(new Set(t.openings).size).toBe(3)
      expect(t.carry.length).toBeGreaterThanOrEqual(2)
      expect(t.them.named).toContain('{who}')
      expect(t.them.unnamed).not.toContain('{who}')

      const worries = worriesFor(kind)
      expect(worries).toHaveLength(4)
      expect(new Set(worries.map((w) => w.id)).size).toBe(4)
      expect(worries.at(-1)?.id).toBe('else')
    }
    expect(new Set(TALK_KINDS.map((k) => TALKS[k].label)).size).toBe(TALK_KINDS.length)
  })

  it('has no empty lines and no stray whitespace', () => {
    for (const line of allCopy()) {
      expect(line.trim()).toBe(line)
      expect(line.length).toBeGreaterThan(0)
    }
  })

  it('never promises an outcome or tells the player they are ready or safe', () => {
    const banned = [/\bready\b/i, /\bsafe\b/i, /will go well/i, /don.t worry/i, /calm down/i, /\byou should\b/i, /\bjust relax\b/i]
    for (const line of allCopy()) {
      for (const pattern of banned) expect(line, line).not.toMatch(pattern)
    }
  })

  it('keeps every prompt to a sentence or two', () => {
    for (const line of allCopy()) expect(sentences(line), line).toBeLessThanOrEqual(2)
    for (const kind of TALK_KINDS) {
      expect(TALKS[kind].understand.heading.length).toBeLessThanOrEqual(60)
      for (const line of TALKS[kind].carry) expect(line.length).toBeLessThanOrEqual(48)
    }
  })

  it('offers three variations of each settling step and of the kind word', () => {
    expect(SETTLE.shoulders).toHaveLength(3)
    expect(SETTLE.ground).toHaveLength(3)
    expect(KINDNESS).toHaveLength(3)
  })

  it('has distinct check-in answers, including one for a talk that has not happened yet', () => {
    expect(new Set(CHECK_INS.map((c) => c.id)).size).toBe(CHECK_INS.length)
    expect(CHECK_INS.map((c) => c.id)).toContain('not-yet')
  })
})

describe('pick', () => {
  it('chooses deterministically by run and wraps around', () => {
    const pool = ['a', 'b', 'c'] as const
    expect([0, 1, 2, 3, 4].map((run) => pick(pool, run))).toEqual(['a', 'b', 'c', 'a', 'b'])
    expect(pick(pool, -1)).toBe('a')
  })
})

describe('themLine', () => {
  it('names the other person when the player gave a name or role', () => {
    expect(themLine('ask', 'Priya')).toBe(TALKS.ask.them.named.replace('{who}', 'Priya'))
  })

  it('capitalises a role written in lower case at the start of the sentence', () => {
    expect(themLine('ask', 'my manager').startsWith('My manager')).toBe(true)
  })

  it('falls back gracefully when no one was named', () => {
    expect(themLine('tell', '')).toBe(TALKS.tell.them.unnamed)
    expect(themLine('tell', '   ')).toBe(TALKS.tell.them.unnamed)
  })
})
