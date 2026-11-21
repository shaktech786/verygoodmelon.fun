import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sendMessage = vi.fn()
const createChat = vi.fn((options: unknown) => {
  void options
  return { sendMessage }
})
const generateContent = vi.fn()

vi.mock('@google/genai', () => ({
  ThinkingLevel: { MINIMAL: 'MINIMAL' },
  GoogleGenAI: class MockGemini {
    chats = { create: createChat }
    models = { generateContent }
  },
}))

import { VISITOR_RULE } from '@/lib/ai/visitor-rule'
import { POST as lastWords } from '@/app/api/last-words/reflect/route'
import { POST as firstWords } from '@/app/api/first-words/reflect/route'
import { POST as sageChat } from '@/app/api/timeless-minds/chat/route'
import { POST as sageFarewell } from '@/app/api/timeless-minds/farewell/route'
import { POST as arenaClosing } from '@/app/api/mind-debate/judge/route'
import { POST as gardener } from '@/app/api/calm-garden/suggest/route'

let ip = 0
const post = (handler: (request: never) => Promise<Response>, body: unknown) =>
  handler(new Request('http://localhost/api', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `10.9.0.${++ip}` },
  }) as never)

/** Everything a route sent to the model, system instruction included. */
const sent = () => JSON.stringify([...generateContent.mock.calls, ...createChat.mock.calls])

describe('the one rule every prompt that speaks to a visitor carries', () => {
  beforeEach(() => {
    generateContent.mockReset()
    createChat.mockClear()
    sendMessage.mockReset()
    generateContent.mockResolvedValue({ text: '{"risk": false, "reply": "That sounds heavy."}' })
    sendMessage.mockResolvedValue({ text: '{"risk": false, "reply": "That sounds heavy."}' })
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key'
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY
    vi.restoreAllMocks()
  })

  it('forbids talk of time left, health or circumstances, and asks for the feeling to be met first', () => {
    expect(VISITOR_RULE).toMatch(/how much time they have left/)
    expect(VISITOR_RULE).toMatch(/health/)
    expect(VISITOR_RULE).toMatch(/circumstances/)
    expect(VISITOR_RULE).toMatch(/acknowledge/)
  })

  it.each([
    ['The Final Word', lastWords, { message: 'Tell my sister I love her.' }],
    ['The Awakening', firstWords, { message: 'Is anyone there?' }],
    ['The Sage, talking', sageChat, { thinkerId: 'socrates', message: 'I feel lost.', conversationHistory: [] }],
    ['The Sage, saying goodbye', sageFarewell, {
      thinkerId: 'socrates',
      conversationHistory: [{ role: 'user', content: 'I worry a lot.' }, { role: 'assistant', content: 'What about?' }],
    }],
    ['The Arena closing', arenaClosing, {
      person1: 'Socrates',
      person2: 'Nietzsche',
      topic: 'Is free will an illusion?',
      history: [{ speaker: 'Socrates', argument: 'Choice needs a chooser.' }],
    }],
    ['The Gardener', gardener, { elements: [{ type: 'daisy', x: 0.3, y: 0.7 }], season: 'spring' }],
  ])('%s', async (_name, handler, body) => {
    await post(handler, body)
    expect(sent()).toContain(JSON.stringify(VISITOR_RULE).slice(1, -1))
  })

  it('no longer invites The Final Word to speak of the time a visitor has left', async () => {
    await post(lastWords, { message: 'Tell my sister I love her.' })
    expect(sent()).not.toMatch(/while there is time/i)
  })

  it('tells The Sage to meet the feeling in a few words before its point or question', async () => {
    await post(sageChat, { thinkerId: 'socrates', message: 'I feel lost.', conversationHistory: [] })
    expect(sent()).toMatch(/acknowledg\w* (what|how) they feel in a few words/i)
  })
})
