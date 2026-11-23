import { describe, it, expect, vi, beforeEach } from 'vitest'

const generateText = vi.fn()

vi.mock('@/lib/ai/gemini', () => ({
  initializeGemini: () => {},
  isAIAvailable: () => true,
  generateText: (...args: unknown[]) => generateText(...args),
}))

// Next's data cache, reduced to what the route relies on: one entry per key and arguments, and a throw is never kept
const entries = new Map<string, { value: unknown; revalidate: number }>()
vi.mock('next/cache', () => ({
  unstable_cache:
    <A extends unknown[], R>(fn: (...args: A) => Promise<R>, keys: string[], options: { revalidate: number }) =>
    async (...args: A): Promise<R> => {
      const key = JSON.stringify([keys, args])
      if (entries.has(key)) return entries.get(key)!.value as R
      const value = await fn(...args)
      entries.set(key, { value, revalidate: options.revalidate })
      return value
    },
}))

import { GET } from '@/app/api/thoughts/fresh/route'

const THOUGHT = { title: 'Small Hours', body: 'One.\n\nTwo.', theme: 'rest' }

describe('GET /api/thoughts/fresh', () => {
  beforeEach(() => {
    entries.clear()
    generateText.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('writes the day’s thought once and keeps it for the day', async () => {
    generateText.mockResolvedValue(JSON.stringify(THOUGHT))

    const first = await GET()
    const second = await GET()

    expect(await first.json()).toEqual({ thought: THOUGHT })
    expect(await second.json()).toEqual({ thought: THOUGHT })
    expect(generateText).toHaveBeenCalledTimes(1)
    expect([...entries.values()].map((e) => e.revalidate)).toContain(24 * 60 * 60)
  })

  it('during an outage, remembers the miss for a few minutes instead of asking again on every visit', async () => {
    generateText.mockRejectedValue(new Error('unavailable'))

    const first = await GET()
    const second = await GET()

    expect(await first.json()).toEqual({ thought: null })
    expect(await second.json()).toEqual({ thought: null })
    expect(generateText).toHaveBeenCalledTimes(1)
    // The miss is held briefly, never for the day
    expect([...entries.values()]).toEqual([{ value: null, revalidate: 10 * 60 }])
    expect(first.headers.get('Cache-Control')).toBe('public, s-maxage=600')
  })
})
