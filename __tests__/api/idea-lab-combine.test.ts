import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Gemini - the route uses getGenAI() which checks env var
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class MockGemini {
    getGenerativeModel() {
      return {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => JSON.stringify({
              name: 'Temporal Love',
              emoji: '???',
              description: 'Love that transcends the boundaries of time.',
            }),
          },
        }),
      }
    }
  },
}))

import { POST } from '@/app/api/idea-lab/combine/route'

describe('POST /api/idea-lab/combine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key'
  })

  afterEach(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY
  })

  it('returns combination result for two concepts', async () => {
    const request = new Request('http://localhost/api/idea-lab/combine', {
      method: 'POST',
      body: JSON.stringify({ concept1: 'Chaos', concept2: 'Quantum' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBeDefined()
    expect(data.emoji).toBeDefined()
    expect(data.description).toBeDefined()
  })

  it('returns known combination from cache', async () => {
    // chaos+order is a known combination -> Balance
    // getComboKey sorts alphabetically: ['chaos', 'order'] -> 'chaos+order'
    const request = new Request('http://localhost/api/idea-lab/combine', {
      method: 'POST',
      body: JSON.stringify({ concept1: 'Chaos', concept2: 'Order' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe('Balance')
    expect(data.description).toContain('structure and spontaneity')
  })

  it('returns known combination regardless of input order', async () => {
    // Order+Chaos should also match since getComboKey sorts alphabetically
    const request = new Request('http://localhost/api/idea-lab/combine', {
      method: 'POST',
      body: JSON.stringify({ concept1: 'Order', concept2: 'Chaos' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe('Balance')
  })

  it('returns 400 for missing concept1', async () => {
    const request = new Request('http://localhost/api/idea-lab/combine', {
      method: 'POST',
      body: JSON.stringify({ concept2: 'Fear' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    expect(response.status).toBe(400)
  })

  it('returns 400 for missing concept2', async () => {
    const request = new Request('http://localhost/api/idea-lab/combine', {
      method: 'POST',
      body: JSON.stringify({ concept1: 'Love' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    expect(response.status).toBe(400)
  })

  it('returns 400 when both concepts are missing', async () => {
    const request = new Request('http://localhost/api/idea-lab/combine', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    expect(response.status).toBe(400)
  })

  it('returns fallback on AI error', async () => {
    // Remove env var so getGenAI() throws
    delete process.env.GOOGLE_GEMINI_API_KEY

    const request = new Request('http://localhost/api/idea-lab/combine', {
      method: 'POST',
      body: JSON.stringify({ concept1: 'Unknown1', concept2: 'Unknown2' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    const data = await response.json()

    // Route catches errors and returns fallback
    expect(data.name).toBe('Synthesis')
    expect(data.description).toContain('unexpected combinations')
  })
})
