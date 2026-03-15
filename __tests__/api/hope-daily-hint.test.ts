import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the word-of-day module
vi.mock('@/lib/games/hope-daily/words', () => ({
  getWordOfDay: () => ({
    word: 'HAPPY',
    category: 'Health',
    fact: 'Happiness is contagious.',
  }),
}))

import { POST } from '@/app/api/hope-daily/hint/route'

describe('POST /api/hope-daily/hint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns thematic hint for hintNumber 1', async () => {
    const request = new Request('http://localhost/api/hope-daily/hint', {
      method: 'POST',
      body: JSON.stringify({ hintNumber: 1 }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.hint).toBeDefined()
    expect(data.hintNumber).toBe(1)
  })

  it('returns letter reveal for hintNumber 2', async () => {
    const request = new Request('http://localhost/api/hope-daily/hint', {
      method: 'POST',
      body: JSON.stringify({ hintNumber: 2, revealedPositions: [] }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.revealedLetter).toBeDefined()
    if (data.revealedLetter) {
      expect(data.revealedLetter.position).toBeGreaterThanOrEqual(0)
      expect(data.revealedLetter.letter).toHaveLength(1)
    }
  })

  it('returns letter reveal for hintNumber 3', async () => {
    const request = new Request('http://localhost/api/hope-daily/hint', {
      method: 'POST',
      body: JSON.stringify({ hintNumber: 3, revealedPositions: [0] }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.hintNumber).toBe(3)
  })

  it('returns 400 for invalid hintNumber', async () => {
    const request = new Request('http://localhost/api/hope-daily/hint', {
      method: 'POST',
      body: JSON.stringify({ hintNumber: 5 }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    expect(response.status).toBe(400)
  })

  it('returns 400 for hintNumber 0', async () => {
    const request = new Request('http://localhost/api/hope-daily/hint', {
      method: 'POST',
      body: JSON.stringify({ hintNumber: 0 }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    expect(response.status).toBe(400)
  })

  it('returns 400 for missing hintNumber', async () => {
    const request = new Request('http://localhost/api/hope-daily/hint', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    expect(response.status).toBe(400)
  })
})
