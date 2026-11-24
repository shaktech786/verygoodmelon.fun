import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const generateContent = vi.fn()

vi.mock('@google/genai', () => ({
  ThinkingLevel: { MINIMAL: 'MINIMAL' },
  GoogleGenAI: class MockGemini {
    models = { generateContent }
  },
}))

import { POST as turn } from '@/app/api/mind-debate/route'
import { POST as judge } from '@/app/api/mind-debate/judge/route'
import { GEMINI_MODEL } from '@/lib/ai/gemini'

const call = async (handler: typeof turn, url: string, body: unknown) => {
  const response = await handler(new Request(`http://localhost${url}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as never)
  return { status: response.status, data: await response.json() }
}

const askTurn = (body: Record<string, unknown> = {}) =>
  call(turn, '/api/mind-debate', {
    person1: 'Socrates',
    person2: 'Nietzsche',
    topic: 'Is free will an illusion?',
    history: [],
    round: 1,
    totalRounds: 6,
    ...body,
  })

const history = [
  { speaker: 'Socrates', argument: 'Choice needs a chooser.' },
  { speaker: 'Nietzsche', argument: 'The chooser is a crowd of drives.' },
]

const askJudge = (body: Record<string, unknown> = {}) =>
  call(judge, '/api/mind-debate/judge', {
    person1: 'Socrates',
    person2: 'Nietzsche',
    topic: 'Is free will an illusion?',
    history,
    ...body,
  })

const promptOf = (callIndex = 0) => JSON.stringify(generateContent.mock.calls[callIndex][0])

describe('POST /api/mind-debate (one turn)', () => {
  beforeEach(() => {
    generateContent.mockReset()
    generateContent.mockResolvedValue({ text: 'Tell me, friend, who is it that doubts?' })
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key'
  })

  afterEach(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY
  })

  it('speaks as the right debater through the shared model constant', async () => {
    const { status, data } = await askTurn()

    expect(status).toBe(200)
    expect(data).toMatchObject({ speaker: 'Socrates', argument: 'Tell me, friend, who is it that doubts?' })
    expect(generateContent.mock.calls[0][0].model).toBe(GEMINI_MODEL)
  })

  it('tells the speaker to disagree with ideas, never insult, and not invent quotes for real people', async () => {
    await askTurn()
    const prompt = promptOf()

    expect(prompt).toMatch(/never the person/i)
    expect(prompt).toMatch(/invent/i)
    expect(prompt).toContain('[[STEP_ASIDE_')
  })

  it('turns the step-aside signal into a quiet decline that says whether the voice or the topic is the problem', async () => {
    generateContent.mockResolvedValue({ text: '[[STEP_ASIDE_VOICE]]' })
    const voice = await askTurn({ person1: 'A dictator', topic: 'Is kindness weakness?' })
    expect(voice.status).toBe(200)
    expect(voice.data).toEqual({ declined: true, reason: 'voice' })

    generateContent.mockResolvedValue({ text: '[[STEP_ASIDE_TOPIC]]' })
    const topic = await askTurn({ topic: 'Which group deserves less' })
    expect(topic.data).toEqual({ declined: true, reason: 'topic' })
  })

  it('asks the model to name which part it will not voice', async () => {
    await askTurn()
    expect(promptOf()).toContain('[[STEP_ASIDE_VOICE]]')
    expect(promptOf()).toContain('[[STEP_ASIDE_TOPIC]]')
    expect(promptOf()).toContain('[[STEP_ASIDE_CARE]]')
  })

  it('meets a question that sounds like someone in danger with care, before the model is asked', async () => {
    const asked = await askTurn({ topic: 'Should I just end my life tonight?' })
    expect(asked.status).toBe(200)
    expect(asked.data).toEqual({ declined: true, reason: 'care' })

    const named = await askTurn({ person2: 'I want to kill myself' })
    expect(named.data).toEqual({ declined: true, reason: 'care' })
    expect(generateContent).not.toHaveBeenCalled()
  })

  it('turns the model’s own self-harm signal into care, not a refusal', async () => {
    generateContent.mockResolvedValue({ text: '[[STEP_ASIDE_CARE]]' })
    const { data } = await askTurn({ topic: 'Is it ever right to give up?' })
    expect(data).toEqual({ declined: true, reason: 'care' })
  })

  it('never lets a refusal be read out as if the debater said it', async () => {
    const refusals = [
      'I cannot fulfill this request. I am unable to generate content that promotes hate speech.',
      "I'm sorry, but I can't help with that.",
      'As an AI language model, I must decline.',
      'My safety guidelines strictly prohibit this, even within roleplay contexts.',
    ]
    for (const text of refusals) {
      generateContent.mockResolvedValue({ text })
      const { data } = await askTurn()
      expect(data).toEqual({ declined: true })
    }
  })

  it('keeps an in-character "I cannot" that is part of the argument', async () => {
    generateContent.mockResolvedValue({ text: 'I cannot accept that a man is only his drives, Nietzsche.' })

    const { data } = await askTurn()

    expect(data.argument).toBe('I cannot accept that a man is only his drives, Nietzsche.')
  })

  it('removes markdown emphasis and a leading speaker label so the bubble reads as plain speech', async () => {
    generateContent.mockResolvedValue({ text: 'Socrates: You cling to the myth of the *causa sui* and **call** it _freedom_.' })

    const { data } = await askTurn()

    expect(data.argument).toBe('You cling to the myth of the causa sui and call it freedom.')
  })

  it('keeps a rambling reply to a short turn that ends on a full sentence', async () => {
    generateContent.mockResolvedValue({ text: 'This is one long sentence about freedom and fate. '.repeat(30) })

    const { data } = await askTurn()

    expect(data.argument.length).toBeLessThanOrEqual(600)
    expect(data.argument.endsWith('.')).toBe(true)
  })

  it('trims a reply that runs long to at most three whole sentences', async () => {
    generateContent.mockResolvedValue({
      text: 'Freedom is a habit. It is practised daily, in small choices nobody sees. You call it an illusion because you look for it in grand gestures. Look instead at how you choose your words, Nietzsche, and you will find it there.',
    })

    const { data } = await askTurn()

    expect(data.argument).toBe('Freedom is a habit. It is practised daily, in small choices nobody sees. You call it an illusion because you look for it in grand gestures.')
  })

  it('keeps fewer sentences when three would run past sixty words', async () => {
    const phrase = 'this sentence carries a great many words because the speaker loves the sound of their own voice today'
    const long = `Yes, ${phrase} and then ${phrase}`
    generateContent.mockResolvedValue({ text: `Short opener. ${long}. ${long}. Final thought.` })

    const { data } = await askTurn()

    expect(data.argument).toBe(`Short opener. ${long}.`)
    expect(data.argument.split(/\s+/).length).toBeLessThanOrEqual(60)
  })

  it('drops a last sentence that was cut off part way', async () => {
    generateContent.mockResolvedValue({ text: 'Doubt needs a doubter. And the doubter, my friend, is the one who' })

    const { data } = await askTurn()

    expect(data.argument).toBe('Doubt needs a doubter.')
  })

  it('does not mistake a title like Mr. or Dr. for the end of a sentence', async () => {
    generateContent.mockResolvedValue({ text: 'Ask Mr. Darcy whether pride is reason. Dr. Watson would say no. So would I. And more.' })

    const { data } = await askTurn()

    expect(data.argument).toBe('Ask Mr. Darcy whether pride is reason. Dr. Watson would say no. So would I.')
  })

  it('asks for two or three short sentences', async () => {
    await askTurn()
    expect(promptOf()).toMatch(/2 or 3 short sentences/)
    expect(promptOf()).toMatch(/45 words/)
  })

  it('caps player text before it reaches the model', async () => {
    await askTurn({ person1: 'S'.repeat(500), topic: 'T'.repeat(5000) })
    const prompt = promptOf()

    expect(prompt).not.toContain('S'.repeat(61))
    expect(prompt).not.toContain('T'.repeat(121))
  })

  it('turns away a request with no names, no topic, or an impossible round before any model call', async () => {
    for (const body of [{ person1: '' }, { topic: '   ' }, { round: 0 }, { round: 7 }, { totalRounds: 40 }]) {
      const { status } = await askTurn(body)
      expect(status).toBe(400)
    }
    expect(generateContent).not.toHaveBeenCalled()
  })

  it('answers with a plain failure when the model is unavailable, so the page can pause calmly', async () => {
    generateContent.mockRejectedValue(new Error('quota'))

    const { status, data } = await askTurn()

    expect(status).toBe(500)
    expect(JSON.stringify(data)).not.toMatch(/quota|gemini|AI/i)
  })
})

describe('POST /api/mind-debate/judge (the closing)', () => {
  beforeEach(() => {
    generateContent.mockReset()
    generateContent.mockResolvedValue({
      text: JSON.stringify({
        firstInsight: 'Socrates showed that doubting still needs a **doubter**.',
        secondInsight: 'Nietzsche showed that reasons can be instincts in disguise.',
        revealed: 'Both treated freedom as something practised rather than owned.',
        question: 'Which of your habits did you actually choose?',
      }),
    })
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key'
  })

  afterEach(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY
  })

  it('names what each side got right, what the debate revealed, and a question for the player', async () => {
    const { status, data } = await askJudge()

    expect(status).toBe(200)
    expect(data).toEqual({
      firstInsight: 'Socrates showed that doubting still needs a doubter.',
      secondInsight: 'Nietzsche showed that reasons can be instincts in disguise.',
      revealed: 'Both treated freedom as something practised rather than owned.',
      question: 'Which of your habits did you actually choose?',
    })
    expect(data).not.toHaveProperty('winner')
  })

  it('asks the model not to crown a winner', async () => {
    await askJudge()

    expect(promptOf()).toMatch(/do not (name|pick|declare) a winner/i)
  })

  it('fails plainly when any part of the closing is missing or is a refusal', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify({ firstInsight: 'x', secondInsight: 'y', revealed: 'z' }) })
    expect((await askJudge()).status).toBe(500)

    generateContent.mockResolvedValue({ text: "I'm sorry, but I can't help with that." })
    expect((await askJudge()).status).toBe(500)

    generateContent.mockResolvedValue({
      text: JSON.stringify({ firstInsight: 'I cannot fulfill this request.', secondInsight: 'y', revealed: 'z', question: 'q?' }),
    })
    expect((await askJudge()).status).toBe(500)
  })

  it('keeps every line of the closing short', async () => {
    const long = 'A thought that goes on and on. '.repeat(40)
    generateContent.mockResolvedValue({
      text: JSON.stringify({ firstInsight: long, secondInsight: long, revealed: long, question: long }),
    })

    const { data } = await askJudge()

    for (const line of Object.values(data) as string[]) expect(line.length).toBeLessThanOrEqual(260)
  })

  it('turns away an empty debate before any model call', async () => {
    const { status } = await askJudge({ history: [] })

    expect(status).toBe(400)
    expect(generateContent).not.toHaveBeenCalled()
  })
})
