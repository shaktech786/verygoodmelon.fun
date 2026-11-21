import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const generateContent = vi.fn()

vi.mock('@google/genai', () => ({
  ThinkingLevel: { MINIMAL: 'MINIMAL' },
  GoogleGenAI: class MockGemini {
    models = { generateContent }
  },
}))

import { POST } from '@/app/api/calm-garden/suggest/route'

const ask = async (body: unknown, ip: string) => {
  const response = await POST(new Request('http://localhost/api/calm-garden/suggest', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
  }) as never)
  return { status: response.status, data: await response.json() }
}

const elements = [{ type: 'daisy', x: 0.3, y: 0.7 }, { type: 'oak', x: 0.6, y: 0.5 }, { type: 'tulip', x: 0.4, y: 0.8 }]
const promptSent = () => String(generateContent.mock.calls.at(-1)?.[0]?.contents)

describe('POST /api/calm-garden/suggest', () => {
  beforeEach(() => {
    generateContent.mockReset()
    generateContent.mockResolvedValue({ text: '{"type": "lavender", "x": 0.5, "y": 0.9, "line": "Butterflies would find lavender by your daisy."}' })
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key'
  })

  afterEach(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY
  })

  it('tells the gardener the visitor’s own season, so a southern garden in November is in spring', async () => {
    const { status, data } = await ask({ elements, season: 'spring' }, '10.0.0.1')
    expect(status).toBe(200)
    expect(data.suggestion.type).toBe('lavender')
    expect(promptSent()).toContain('It is spring.')
  })

  it('falls back to the calendar where it runs when no season is sent, and refuses a made-up one', async () => {
    await ask({ elements }, '10.0.0.2')
    expect(promptSent()).toMatch(/It is (spring|summer|autumn|winter)\./)
    expect((await ask({ elements, season: 'monsoon' }, '10.0.0.3')).status).toBe(400)
  })

  it('swaps a reply that promises bees for a suggestion of its own', async () => {
    generateContent.mockResolvedValue({ text: '{"type": "lavender", "x": 0.5, "y": 0.9, "line": "The bees would love lavender here."}' })
    const { status, data } = await ask({ elements, season: 'summer' }, '10.0.0.4')
    expect(status).toBe(200)
    expect(data.suggestion.line).not.toMatch(/\bbees?\b/i)
  })

  it('swaps a reply that offers the very plant just placed for one of its own', async () => {
    const justLavender = [...elements, { type: 'lavender', x: 0.5, y: 0.88 }]
    const { status, data } = await ask({ elements: justLavender, season: 'summer' }, '10.0.0.5')
    expect(status).toBe(200)
    expect(data.suggestion.type).not.toBe('lavender')
    expect(data.suggestion.line).not.toMatch(/lavender/i)
  })
})
