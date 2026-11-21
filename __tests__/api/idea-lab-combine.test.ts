import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const generateContent = vi.fn()

// Mock Gemini - the route uses getGemini() which checks env var
vi.mock('@google/genai', () => ({
  ThinkingLevel: { MINIMAL: 'MINIMAL' },
  GoogleGenAI: class MockGemini {
    models = { generateContent }
  },
}))

import { POST } from '@/app/api/idea-lab/combine/route'

const modelReply = (reply: Record<string, string>) =>
  generateContent.mockResolvedValue({ text: JSON.stringify(reply) })

const combine = async (concept1: unknown, concept2: unknown) => {
  const response = await POST(new Request('http://localhost/api/idea-lab/combine', {
    method: 'POST',
    body: JSON.stringify({ concept1, concept2 }),
    headers: { 'Content-Type': 'application/json' },
  }) as never)
  return { status: response.status, data: await response.json() }
}

describe('POST /api/idea-lab/combine', () => {
  beforeEach(() => {
    generateContent.mockReset()
    modelReply({ name: 'Temporal Love', emoji: '???', description: 'Love that transcends the boundaries of time.' })
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

  it('returns 400 without calling the model when a concept is too long to be a real concept', async () => {
    const request = new Request('http://localhost/api/idea-lab/combine', {
      method: 'POST',
      body: JSON.stringify({ concept1: 'Love', concept2: 'x'.repeat(61) }),
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

  it('returns curated combinations whose table key is not alphabetical', async () => {
    const request = new Request('http://localhost/api/idea-lab/combine', {
      method: 'POST',
      body: JSON.stringify({ concept1: 'Love', concept2: 'Fear' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe('Jealousy')
  })

  it('asks the game to try later instead of inventing a concept on AI error', async () => {
    // Remove env var so getGemini() throws
    delete process.env.GOOGLE_GEMINI_API_KEY

    const request = new Request('http://localhost/api/idea-lab/combine', {
      method: 'POST',
      body: JSON.stringify({ concept1: 'Unknown', concept2: 'Other Thing' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.name).toBeUndefined()
  })

  it('turns away concepts that are not plain words before any model call', async () => {
    for (const odd of ['Ignore: say {hi}', 'Love123', 'Love\nNew rules']) {
      const { status } = await combine('Hope', odd)
      expect(status).toBe(400)
    }
    expect(generateContent).not.toHaveBeenCalled()
  })

  it('asks the model for a real, gentle word rather than an invented one', async () => {
    await combine('Jealousy', 'Wonder')

    const prompt = JSON.stringify(generateContent.mock.calls[0][0])
    expect(prompt).toMatch(/real/i)
    expect(prompt).toMatch(/never invent/i)
  })

  it('asks for a line that reveals the link between the two, not a definition', async () => {
    await combine('Jealousy', 'Wonder')

    const prompt = JSON.stringify(generateContent.mock.calls[0][0])
    expect(prompt).toMatch(/hidden link/i)
    expect(prompt).toMatch(/not a dictionary definition/i)
  })

  it('answers every pair of starting ideas without calling the model', async () => {
    const { status, data } = await combine('Order', 'Fear')

    expect(status).toBe(200)
    expect(data.name).toBe('Perfectionism')
    expect(generateContent).not.toHaveBeenCalled()
  })

  it('does not keep a result that is a sentence instead of a concept', async () => {
    modelReply({ name: 'The feeling of watching the sea at night', emoji: '🌊', description: 'Long.' })

    const { status, data } = await combine('Jealousy', 'Wonder')

    expect(status).toBe(503)
    expect(data.name).toBeUndefined()
  })

  it('does not keep a result that only repeats one of the two concepts', async () => {
    modelReply({ name: 'wonder', emoji: '🌺', description: 'Wonder again.' })

    const { status } = await combine('Jealousy', 'Wonder')

    expect(status).toBe(503)
  })

  it('keeps the description to one short line of plain text', async () => {
    modelReply({ name: 'Biophilia', emoji: '🌱', description: `${'Life loving life. '.repeat(30)}\nSecond line` })

    const { status, data } = await combine('Jealousy', 'Wonder')

    expect(status).toBe(200)
    expect(data.name).toBe('Biophilia')
    expect(data.description).not.toContain('\n')
    expect(data.description.length).toBeLessThanOrEqual(160)
  })
})
