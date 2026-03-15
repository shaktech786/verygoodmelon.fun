import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock OpenAI - the route uses getOpenAI() which creates new OpenAI({ apiKey })
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: 'Nice guess! Keep going!' } }],
          }),
        },
      }
    },
  }
})

import { POST } from '@/app/api/hope-daily/commentary/route'

describe('POST /api/hope-daily/commentary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENAI_API_KEY = 'test-key'
  })

  afterEach(() => {
    delete process.env.OPENAI_API_KEY
  })

  it('returns commentary for a guess', async () => {
    const request = new Request('http://localhost/api/hope-daily/commentary', {
      method: 'POST',
      body: JSON.stringify({ guess: 'HELLO' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.commentary).toBeDefined()
    expect(typeof data.commentary).toBe('string')
  })

  it('handles correct guess context', async () => {
    const request = new Request('http://localhost/api/hope-daily/commentary', {
      method: 'POST',
      body: JSON.stringify({ guess: 'HAPPY', isCorrect: true }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    expect(response.status).toBe(200)
  })

  it('handles invalid guess context', async () => {
    const request = new Request('http://localhost/api/hope-daily/commentary', {
      method: 'POST',
      body: JSON.stringify({ guess: 'ZZZZZ', isInvalid: true }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    expect(response.status).toBe(200)
  })

  it('returns 400 for missing guess', async () => {
    const request = new Request('http://localhost/api/hope-daily/commentary', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    expect(response.status).toBe(400)
  })

  it('returns 400 for non-string guess', async () => {
    const request = new Request('http://localhost/api/hope-daily/commentary', {
      method: 'POST',
      body: JSON.stringify({ guess: 123 }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    expect(response.status).toBe(400)
  })

  it('returns fallback commentary on error', async () => {
    // Remove API key to trigger error in getOpenAI()
    delete process.env.OPENAI_API_KEY

    const request = new Request('http://localhost/api/hope-daily/commentary', {
      method: 'POST',
      body: JSON.stringify({ guess: 'TEST' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    const data = await response.json()

    // Route catches errors and returns fallback commentary
    expect(data.commentary).toBeDefined()
    expect(typeof data.commentary).toBe('string')
  })
})
