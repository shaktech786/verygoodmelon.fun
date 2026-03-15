import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Gemini - feedback route instantiates GoogleGenerativeAI at module level
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class MockGemini {
    getGenerativeModel() {
      return {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => JSON.stringify({
              title: 'Bug: Button not working',
              body: '## Summary\nUser reports button issue\n\n## Original User Feedback\n> The submit button does not work',
              labels: ['bug', 'ui/ux'],
            }),
          },
        }),
      }
    }
  },
}))

// Store original fetch
const originalFetch = global.fetch

import { POST } from '@/app/api/feedback/route'

describe('POST /api/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GITHUB_TOKEN = 'test-token'
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key'

    // Mock fetch for GitHub API calls
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ html_url: 'https://github.com/test/repo/issues/1', number: 1 }),
      text: async () => '',
    }) as unknown as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    delete process.env.GITHUB_TOKEN
    delete process.env.GOOGLE_GEMINI_API_KEY
  })

  it('returns 400 for empty feedback', async () => {
    const request = new Request('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ feedback: '' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    expect(response.status).toBe(400)
  })

  it('returns 400 for whitespace-only feedback', async () => {
    const request = new Request('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ feedback: '   ' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    expect(response.status).toBe(400)
  })

  it('returns 400 for missing feedback field', async () => {
    const request = new Request('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    expect(response.status).toBe(400)
  })

  it('creates GitHub issue for valid feedback', async () => {
    const request = new Request('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ feedback: 'The submit button does not work on mobile' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.issueUrl).toBeDefined()
    expect(data.issueNumber).toBe(1)
  })

  it('returns 500 when GitHub API fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    }) as unknown as typeof fetch

    const request = new Request('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ feedback: 'Some feedback here' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    expect(response.status).toBe(500)
  })

  it('returns 500 when GITHUB_TOKEN is missing', async () => {
    delete process.env.GITHUB_TOKEN

    const request = new Request('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ feedback: 'Some feedback here' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    expect(response.status).toBe(500)
  })
})
